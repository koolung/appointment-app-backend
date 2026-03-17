import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { parseDateInTimezone, getDayOfWeekInTimezone, formatTimeInTimezone } from '@/common/utils/timezone';

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
    isAdminBooking: boolean = false,
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
      // Convert JavaScript's getDay() (0=Sun) to schema convention (0=Mon)
      const jsDay = startTimeDate.getDay();
      const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1;
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

      // If no rule exists, assume employee is available (default behavior)
      if (!weeklyRule) {
        console.log(`No availability rule found for employee ${employeeId} on day ${dayOfWeek}`);
        return true;
      }

      // For admin bookings, only check that the appointment STARTS within available time
      // Allows appointments to end outside the availability window
      if (isAdminBooking) {
        const isAvailable = startTimeStr >= weeklyRule.startTime && startTimeStr < weeklyRule.endTime;
        console.log(
          `Availability check for ADMIN BOOKING employee ${employeeId}:`,
          `Day: ${dayOfWeek}, Start Time: ${startTimeStr}, Rule: ${weeklyRule.startTime}-${weeklyRule.endTime}, Available: ${isAvailable}`
        );
        return isAvailable;
      }

      // For client bookings, check that the entire appointment fits within available time
      const isAvailable = startTimeStr >= weeklyRule.startTime && endTimeStr <= weeklyRule.endTime;
      console.log(
        `Availability check for employee ${employeeId}:`,
        `Day: ${dayOfWeek}, Time: ${startTimeStr}-${endTimeStr}, Rule: ${weeklyRule.startTime}-${weeklyRule.endTime}, Available: ${isAvailable}`
      );
      return isAvailable;
    } catch (error) {
      console.error('Error checking availability:', error);
      return false;
    }
  }

  /**
   * Get available time slots for an employee on a specific date
   * Excludes slots that have existing appointments
   * @param employeeId - The employee ID
   * @param dateString - Date string in YYYY-MM-DD format
   * @param slotDurationMinutes - Duration of each slot in minutes
   * @param timezone - IANA timezone string (e.g., 'America/Halifax')
   */
  async getAvailableSlots(
    employeeId: string,
    dateString: string,
    slotDurationMinutes: number = 15,
    timezone: string = 'UTC',
  ) {
    // Parse the date in the user's timezone
    const dateInUserTz = parseDateInTimezone(dateString, timezone);
    
    // Get the day of week in the user's timezone
    const dayOfWeek = getDayOfWeekInTimezone(dateString, timezone);
    
    const slots: { start: string; end: string; isNextAvailable?: boolean }[] = [];

    // Query for availability rules for this day
    const rules = await this.prisma.availabilityRule.findMany({
      where: {
        employeeId,
        OR: [
          { dayOfWeek, isException: false },
          {
            isException: true,
            exceptionDate: {
              gte: dateInUserTz,
              lt: new Date(dateInUserTz.getTime() + 24 * 60 * 60 * 1000),
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

    // Create start and end times for the day in UTC
    // These represent the local times in the user's timezone
    const dayStartUTC = dateInUserTz;
    const startTimeUTC = new Date(dayStartUTC.getTime() + startHour * 60 * 60 * 1000 + startMin * 60 * 1000);
    const endTimeUTC = new Date(dayStartUTC.getTime() + endHour * 60 * 60 * 1000 + endMin * 60 * 1000);

    // Fetch all appointments for this employee on this date (using UTC day boundaries)
    const appointments = await this.prisma.appointment.findMany({
      where: {
        employeeId,
        startTime: {
          gte: dateInUserTz,
          lt: new Date(dateInUserTz.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    let currentTime = new Date(startTimeUTC);
    const endTime = new Date(endTimeUTC);
    let isFirstAvailable = true;
    const now = new Date();

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + slotDurationMinutes * 60 * 1000);
      if (slotEnd <= endTime) {
        // Check if this slot conflicts with any appointment
        const isBooked = appointments.some(
          (apt: any) =>
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
   * @param employeeId - The employee ID
   * @param dateString - Date string in YYYY-MM-DD format
   * @param timezone - IANA timezone string
   */
  async getWorkingHours(employeeId: string, dateString: string, timezone: string = 'UTC') {
    // Parse the date in the user's timezone
    const dateInUserTz = parseDateInTimezone(dateString, timezone);
    
    // Get the day of week in the user's timezone
    const dayOfWeek = getDayOfWeekInTimezone(dateString, timezone);

    // Check for exception rules first
    const exceptionRule = await this.prisma.availabilityRule.findFirst({
      where: {
        employeeId,
        isException: true,
        exceptionDate: {
          gte: dateInUserTz,
          lt: new Date(dateInUserTz.getTime() + 24 * 60 * 60 * 1000),
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
