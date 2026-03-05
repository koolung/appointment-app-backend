import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    try {
      const settings = await this.prisma.settings.findUnique({
        where: { id: 'singleton' },
      });
      if (settings) return settings;
    } catch (error) {
      // If not found or error, try to create default settings
      console.error('Error fetching settings:', error);
    }

    // Create or return default settings if not exists
    try {
      return await this.prisma.settings.upsert({
        where: { id: 'singleton' },
        create: {
          id: 'singleton',
          salonName: 'My Salon',
          email: '',
          phone: '',
          address: '',
          openingTime: '09:00',
          closingTime: '18:00',
          bookingNotifications: true,
          appointmentReminders: true,
          minCancellationHours: 24,
          bookingWarningMessage: 'Please note: Appointments cancelled less than 24 hours before the scheduled time may incur a cancellation fee.',
        },
        update: {},
      });
    } catch (error) {
      console.error('Error upserting settings:', error);
      throw error;
    }
  }

  async updateSettings(data: any) {
    return this.prisma.settings.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        ...data,
      },
      update: data,
    });
  }
}
