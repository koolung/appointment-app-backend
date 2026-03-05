import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AvailabilityService } from '@/modules/availability/availability.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createAppointment(data: {
    clientId?: string;
    userId?: string;
    employeeId: string | null;
    startTime: Date;
    endTime: Date;
    serviceIds: string[];
    notes?: string;
    clientTimezone?: string;
    bookingSource?: string;
    clientFirstName?: string;
    clientLastName?: string;
    clientEmail?: string;
    clientPhone?: string;
  }) {
    let finalEmployeeId: string;
    let clientRecordId: string;

    // Handle logged-in user booking with userId
    if (data.userId) {
      // Try to find existing client for this user
      let clientRecord = await this.prisma.client.findUnique({
        where: { userId: data.userId },
      });

      // If no client exists, create one
      if (!clientRecord) {
        clientRecord = await this.prisma.client.create({
          data: {
            userId: data.userId,
          },
        });
      }

      clientRecordId = clientRecord.id;
    }
    // Handle guest bookings
    else if (data.clientId === 'temp-guest-booking') {
      // Create user for guest
      let userId: string | null = null;
      
      if (data.clientEmail) {
        // Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
          where: { email: data.clientEmail },
        });
        
        if (existingUser) {
          userId = existingUser.id;
        } else {
          // Create new user for guest
          const user = await this.prisma.user.create({
            data: {
              email: data.clientEmail,
              password: '', // Guest accounts have no password
              firstName: data.clientFirstName || 'Guest',
              lastName: data.clientLastName || 'User',
              phone: data.clientPhone || null,
              role: 'CLIENT',
            },
          });
          userId = user.id;
        }
      }

      // Create client record for guest
      const clientRecord = await this.prisma.client.create({
        data: {
          userId: userId || undefined,
        },
      });
      clientRecordId = clientRecord.id;
    }
    // Get or create client record from clientId
    // For admin bookings, clientId is 'temp-admin-booking' so we create a temporary client
    else if (data.clientId === 'temp-admin-booking') {
      // Create user first if we have client info
      let userId: string | null = null;
      
      if (data.clientFirstName || data.clientEmail) {
        // If email is provided, check if user already exists
        if (data.clientEmail) {
          const existingUser = await this.prisma.user.findUnique({
            where: { email: data.clientEmail },
          });
          
          if (existingUser) {
            userId = existingUser.id;
          } else {
            // Create new user with provided email
            const user = await this.prisma.user.create({
              data: {
                email: data.clientEmail,
                password: '', // Admin-created accounts have no password initially
                firstName: data.clientFirstName || 'Guest',
                lastName: data.clientLastName || 'Client',
                phone: data.clientPhone,
                role: 'CLIENT',
              },
            });
            userId = user.id;
          }
        } else {
          // Generate a unique email using timestamp + random string if not provided
          const randomStr = Math.random().toString(36).substring(2, 15);
          const uniqueEmail = `admin-booked-${Date.now()}-${randomStr}@noemail.local`;
          
          const user = await this.prisma.user.create({
            data: {
              email: uniqueEmail,
              password: '', // Admin-created accounts have no password initially
              firstName: data.clientFirstName || 'Guest',
              lastName: data.clientLastName || 'Client',
              phone: data.clientPhone,
              role: 'CLIENT',
            },
          });
          userId = user.id;
        }
      }

      // Create a client record
      const clientRecord = await this.prisma.client.create({
        data: {
          userId, // Can be null if no client info provided
        },
      });
      clientRecordId = clientRecord.id;
    } else if (data.clientId) {
      // For regular clients, expect a valid clientId or userId
      let clientRecord = null;
      
      // First, try to find the client directly by ID (if an existing client was selected)
      try {
        clientRecord = await this.prisma.client.findUnique({
          where: { id: data.clientId },
        });
      } catch (e) {
        // If that fails, try to find by userId
        try {
          clientRecord = await this.prisma.client.findUnique({
            where: { userId: data.clientId },
          });
        } catch (e2) {
          // Client not found, will need to create one
        }
      }

      // If client exists, use it
      if (clientRecord) {
        clientRecordId = clientRecord.id;
      } else {
        // Create a new user and client for this appointment
        const newUser = await this.prisma.user.create({
          data: {
            firstName: data.clientFirstName || 'Guest',
            lastName: data.clientLastName || 'User',
            email: data.clientEmail || `guest-${Date.now()}@salon.local`,
            phone: data.clientPhone || null,
            role: 'CLIENT',
            password: 'temp-password', // Temporary password for admin-created clients
          },
        });

        // Now create the client record with the valid userId
        const newClient = await this.prisma.client.create({
          data: {
            userId: newUser.id,
          },
        });
        clientRecordId = newClient.id;
      }
    } else {
      throw new BadRequestException('Either userId or clientId must be provided');
    }

    // If no preference, find an available employee for this time slot
    if (!data.employeeId) {
      const employees = await this.prisma.employee.findMany({
        where: { isActive: true },
      });

      // Check each employee for availability
      let availableEmployee: any = null;
      for (const emp of employees) {
        const isAvailable = await this.availabilityService.checkAvailability(
          emp.id,
          data.startTime,
          data.endTime,
        );

        if (isAvailable) {
          // Check for conflicts
          const conflict = await this.prisma.appointment.findFirst({
            where: {
              employeeId: emp.id,
              status: {
                in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'],
              },
              OR: [
                {
                  startTime: { lt: data.endTime },
                  endTime: { gt: data.startTime },
                },
              ],
            },
          });

          if (!conflict) {
            availableEmployee = emp;
            break;
          }
        }
      }

      if (!availableEmployee) {
        throw new BadRequestException('No employees available for the selected time slot');
      }

      finalEmployeeId = availableEmployee.id;
    } else {
      finalEmployeeId = data.employeeId;

      // Validate that employee is available
      const isAvailable = await this.availabilityService.checkAvailability(
        finalEmployeeId,
        data.startTime,
        data.endTime,
      );

      if (!isAvailable) {
        throw new BadRequestException('Selected time slot is not available');
      }

      // Check for conflicts
      const conflict = await this.prisma.appointment.findFirst({
        where: {
          employeeId: finalEmployeeId,
          status: {
            in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'],
          },
          OR: [
            {
              startTime: { lt: data.endTime },
              endTime: { gt: data.startTime },
            },
          ],
        },
      });

      if (conflict) {
        throw new BadRequestException('Time slot conflicts with existing appointment');
      }
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        clientId: clientRecordId,
        employeeId: finalEmployeeId,
        startTime: data.startTime,
        endTime: data.endTime,
        notes: data.notes,
        clientTimezone: data.clientTimezone || 'UTC',
        bookingSource: data.bookingSource || 'WEB',
        status: 'PENDING',
        services: {
          create: await Promise.all(
            data.serviceIds.map(async (serviceId) => {
              const service = await this.prisma.service.findUnique({
                where: { id: serviceId },
              });
              if (!service) {
                throw new Error(`Service ${serviceId} not found`);
              }
              return {
                serviceId,
                duration: service.baseDuration,
                price: service.price,
              };
            }),
          ),
        },
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        client: {
          include: {
            user: true,
          },
        },
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    // Send booking confirmation email to client
    try {
      await this.notificationsService.sendBookingConfirmation(appointment.id);
    } catch (error) {
      console.error('Failed to send booking confirmation email:', error);
      // Don't throw error, email is not critical to appointment creation
    }

    return appointment;
  }

  async getAppointment(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        client: {
          include: {
            user: true,
          },
        },
        employee: {
          include: {
            user: true,
          },
        },
        payments: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async getAppointmentsByClient(clientId: string) {
    return this.prisma.appointment.findMany({
      where: { clientId },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        employee: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async getAppointmentsByEmployee(employeeId: string, startDate?: Date, endDate?: Date) {
    return this.prisma.appointment.findMany({
      where: {
        employeeId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        client: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async confirmAppointment(appointmentId: string) {
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CONFIRMED' },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        client: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async cancelAppointment(appointmentId: string) {
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED' },
    });
  }

  async rescheduleAppointment(
    appointmentId: string,
    newStartTime: Date,
    newEndTime: Date,
  ) {
    const appointment = await this.getAppointment(appointmentId);

    // Validate new time is available
    const isAvailable = await this.availabilityService.checkAvailability(
      appointment.employeeId,
      newStartTime,
      newEndTime,
    );

    if (!isAvailable) {
      throw new BadRequestException('New time slot is not available');
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        startTime: newStartTime,
        endTime: newEndTime,
        status: 'PENDING',
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    });
  }

  async updateAppointment(
    appointmentId: string,
    data: {
      startTime?: Date;
      endTime?: Date;
      clientFirstName?: string;
      clientLastName?: string;
      clientEmail?: string;
      clientPhone?: string;
      employeeId?: string;
      serviceIds?: string[];
      status?: string;
      notes?: string;
    },
  ) {
    const appointment = await this.getAppointment(appointmentId);

    // If time is being changed, validate availability
    if (data.startTime || data.endTime) {
      const newStartTime = data.startTime || appointment.startTime;
      const newEndTime = data.endTime || appointment.endTime;
      const employeeId = data.employeeId || appointment.employeeId;

      // Only check availability if time or employee changed
      if (
        newStartTime.getTime() !== appointment.startTime.getTime() ||
        newEndTime.getTime() !== appointment.endTime.getTime() ||
        employeeId !== appointment.employeeId
      ) {
        const isAvailable = await this.availabilityService.checkAvailability(
          employeeId,
          newStartTime,
          newEndTime,
        );

        if (!isAvailable) {
          throw new BadRequestException('Selected time slot is not available');
        }

        // Check for conflicts
        const conflict = await this.prisma.appointment.findFirst({
          where: {
            id: { not: appointmentId },
            employeeId,
            status: {
              in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'],
            },
            OR: [
              {
                startTime: { lt: newEndTime },
                endTime: { gt: newStartTime },
              },
            ],
          },
        });

        if (conflict) {
          throw new BadRequestException('Time slot conflicts with existing appointment');
        }
      }
    }

    // Update client user info if provided
    if (
      data.clientFirstName ||
      data.clientLastName ||
      data.clientEmail ||
      data.clientPhone
    ) {
      const clientRecord = await this.prisma.client.findUnique({
        where: { id: appointment.clientId },
        include: { user: true },
      });

      if (clientRecord && clientRecord.user) {
        await this.prisma.user.update({
          where: { id: clientRecord.user.id },
          data: {
            firstName: data.clientFirstName || clientRecord.user.firstName,
            lastName: data.clientLastName || clientRecord.user.lastName,
            email: data.clientEmail || clientRecord.user.email,
            phone: data.clientPhone || clientRecord.user.phone,
          },
        });
      }
    }

    // Update services if provided
    const updateData: any = {};

    if (data.startTime) {
      updateData.startTime = data.startTime;
    }
    if (data.endTime) {
      updateData.endTime = data.endTime;
    }
    if (data.status) {
      updateData.status = data.status;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.employeeId) {
      updateData.employeeId = data.employeeId;
    }

    if (data.serviceIds && data.serviceIds.length > 0) {
      // Delete existing services
      await this.prisma.appointmentService.deleteMany({
        where: { appointmentId },
      });
      // Create new services with duration and price
      updateData.services = {
        create: await Promise.all(
          data.serviceIds.map(async (serviceId) => {
            const service = await this.prisma.service.findUnique({
              where: { id: serviceId },
            });
            if (!service) {
              throw new Error(`Service ${serviceId} not found`);
            }
            return {
              serviceId,
              duration: service.baseDuration,
              price: service.price,
            };
          }),
        ),
      };
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData,
      include: {
        services: {
          include: {
            service: true,
          },
        },
        client: {
          include: {
            user: true,
          },
        },
        employee: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async completeAppointment(appointmentId: string) {
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'COMPLETED' },
    });
  }

  async markNoShow(appointmentId: string) {
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'NO_SHOW' },
    });
  }

  async getAllAppointments() {
    return this.prisma.appointment.findMany({
      include: {
        services: {
          include: {
            service: true,
          },
        },
        client: {
          include: {
            user: true,
          },
        },
        employee: {
          include: {
            user: true,
          },
        },
        payments: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }
}
