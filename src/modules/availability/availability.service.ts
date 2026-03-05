import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailabilityRules(employeeId: string) {
    return this.prisma.availabilityRule.findMany({
      where: { employeeId },
    });
  }

  async createAvailabilityRule(data: any) {
    return this.prisma.availabilityRule.create({
      data,
    });
  }

  async updateAvailabilityRule(ruleId: string, data: any) {
    return this.prisma.availabilityRule.update({
      where: { id: ruleId },
      data,
    });
  }

  async deleteAvailabilityRule(ruleId: string) {
    return this.prisma.availabilityRule.delete({
      where: { id: ruleId },
    });
  }

  /**
   * Check availability for an employee on a specific date/time
   * Takes into account weekly rules and exceptions
   */
  async checkAvailability(
    employeeId: string,
    startTime: Date | string,
    endTime: Date | string,
  ): Promise<boolean> {
    try {
      // Convert to Date objects if they're strings
      let startTimeDate = typeof startTime === 'string' ? new Date(startTime) : startTime;
      let endTimeDate = typeof endTime === 'string' ? new Date(endTime) : endTime;

      // Validate dates
      if (isNaN(startTimeDate.getTime())) {
        console.error('Invalid startTime:', startTime);
        return false;
      }
      if (isNaN(endTimeDate.getTime())) {
        console.error('Invalid endTime:', endTime);
        return false;
      }

      // Use LOCAL time for consistency with how availability rules are stored
      const dayOfWeek = startTimeDate.getDay();
      const startTimeStr = `${String(startTimeDate.getHours()).padStart(2, '0')}:${String(startTimeDate.getMinutes()).padStart(2, '0')}`;
      const endTimeStr = `${String(endTimeDate.getHours()).padStart(2, '0')}:${String(endTimeDate.getMinutes()).padStart(2, '0')}`;

      // Create valid date objects for exception rule query
      const exceptionDateStart = new Date(
        startTimeDate.getFullYear(),
        startTimeDate.getMonth(),
        startTimeDate.getDate(),
      );
      const exceptionDateEnd = new Date(
        startTimeDate.getFullYear(),
        startTimeDate.getMonth(),
        startTimeDate.getDate() + 1,
      );

      // Check for exception rules first
      const exceptionRule = await this.prisma.availabilityRule.findFirst({
        where: {
          employeeId,
          isException: true,
          exceptionDate: {
            gte: exceptionDateStart,
            lt: exceptionDateEnd,
          },
        },
      });

      if (exceptionRule) {
        return startTimeStr >= exceptionRule.startTime && endTimeStr <= exceptionRule.endTime;
      }

      // Check weekly availability rules
      const weeklyRule = await this.prisma.availabilityRule.findFirst({
        where: {
          employeeId,
          dayOfWeek,
          isException: false,
        },
      });

      if (!weeklyRule) {
        return false;
      }

      return startTimeStr >= weeklyRule.startTime && endTimeStr <= weeklyRule.endTime;
    } catch (error) {
      console.error('Error checking availability:', error);
      return false;
    }
  }

  /**
   * Get available time slots for an employee on a specific date
   * Excludes slots that have existing appointments
   */
  async getAvailableSlots(
    employeeId: string,
    date: Date,
    slotDurationMinutes: number = 15,
  ) {
    const dayOfWeek = date.getDay();
    const slots: { start: string; end: string; isNextAvailable?: boolean }[] = [];

    // Get availability rules for this day
    const rules = await this.prisma.availabilityRule.findMany({
      where: {
        employeeId,
        OR: [
          { dayOfWeek, isException: false },
          {
            isException: true,
            exceptionDate: {
              gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
              lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
            },
          },
        ],
      },
    });

    if (rules.length === 0) {
      return slots;
    }

    const rule = rules[0];
    const [startHour, startMin] = rule.startTime.split(':').map(Number);
    const [endHour, endMin] = rule.endTime.split(':').map(Number);

    // Fetch all appointments for this employee on this date
    const appointments = await this.prisma.appointment.findMany({
      where: {
        employeeId,
        startTime: {
          gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
        },
      },
    });

    let currentTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, startMin, 0, 0);
    const endTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), endHour, endMin, 0, 0);

    let isFirstAvailable = true;
    const now = new Date();

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + slotDurationMinutes * 60000);
      if (slotEnd <= endTime) {
        // Check if this slot conflicts with any appointment
        const isBooked = appointments.some(
          (apt) =>
            (currentTime >= apt.startTime && currentTime < apt.endTime) ||
            (slotEnd > apt.startTime && slotEnd <= apt.endTime) ||
            (currentTime <= apt.startTime && slotEnd >= apt.endTime),
        );

        if (!isBooked) {
          const slotObj: any = {
            start: currentTime.toISOString(),
            end: slotEnd.toISOString(),
          };

          // Mark the first available slot (in the future)
          if (isFirstAvailable && slotEnd > now) {
            slotObj.isNextAvailable = true;
            isFirstAvailable = false;
          }

          slots.push(slotObj);
        }
      }
      currentTime = slotEnd;
    }

    return slots;
  }

  /**
   * Get working hours for an employee on a specific date
   * Returns the startTime and endTime based on availability rules
   * Returns null if employee has a full day off (00:00 - 00:00)
   */
  async getWorkingHours(employeeId: string, date: Date | string) {
    let dateObj: Date;
    
    if (typeof date === 'string') {
      // Parse date string as local date (YYYY-MM-DD format)
      const [year, month, day] = date.split('-').map(Number);
      dateObj = new Date(year, month - 1, day);
    } else {
      dateObj = date;
    }
    
    const dayOfWeek = dateObj.getDay();

    // Check for exception rules first
    const exceptionRule = await this.prisma.availabilityRule.findFirst({
      where: {
        employeeId,
        isException: true,
        exceptionDate: {
          gte: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()),
          lt: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1),
        },
      },
    });

    if (exceptionRule) {
      // Check if it's a full-day-off (00:00 - 00:00)
      if (exceptionRule.startTime === '00:00' && exceptionRule.endTime === '00:00') {
        return null; // Full day off - no availability
      }
      
      return {
        startTime: exceptionRule.startTime,
        endTime: exceptionRule.endTime,
        isException: true,
      };
    }

    // Check weekly availability rules
    const weeklyRule = await this.prisma.availabilityRule.findFirst({
      where: {
        employeeId,
        dayOfWeek,
        isException: false,
      },
    });

    if (!weeklyRule) {
      return null; // No availability for this day
    }

    return {
      startTime: weeklyRule.startTime,
      endTime: weeklyRule.endTime,
      isException: false,
    };
  }
}
