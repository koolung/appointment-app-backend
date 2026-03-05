import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRevenueReport(startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month' = 'day'): Promise<Record<string, number>> {
    const payments = await this.prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
      },
      include: {
        appointment: {
          include: {
            services: true,
          },
        },
      },
    });

    // Group by requested granularity
    const grouped: Record<string, number> = {};
    payments.forEach((payment) => {
      const date = new Date(payment.createdAt);
      let key = '';

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        key = date.toISOString().substring(0, 7);
      }

      grouped[key] = (grouped[key] || 0) + payment.amount;
    });

    return grouped;
  }

  async getRevenueByService(startDate: Date, endDate: Date) {
    const payments = await this.prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
      },
      include: {
        appointment: {
          include: {
            services: {
              include: {
                service: true,
              },
            },
          },
        },
      },
    });

    const byService: Record<string, number> = {};
    payments.forEach((payment) => {
      payment.appointment.services.forEach((appService) => {
        const serviceName = appService.service.name;
        byService[serviceName] = (byService[serviceName] || 0) + appService.price;
      });
    });

    return byService;
  }

  async getRevenueByEmployee(startDate: Date, endDate: Date) {
    const payments = await this.prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
      },
      include: {
        appointment: {
          include: {
            employee: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    const byEmployee: Record<string, number> = {};
    payments.forEach((payment) => {
      const employeeName = `${payment.appointment.employee.user.firstName} ${payment.appointment.employee.user.lastName}`;
      byEmployee[employeeName] = (byEmployee[employeeName] || 0) + payment.amount;
    });

    return byEmployee;
  }

  async getEmployeePerformanceReport(startDate: Date, endDate: Date) {
    const employees = await this.prisma.employee.findMany({
      include: {
        user: true,
        appointments: {
          where: {
            startTime: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        performance: true,
      },
    });

    return employees.map((emp) => ({
      id: emp.id,
      name: `${emp.user.firstName} ${emp.user.lastName}`,
      totalAppointments: emp.appointments.length,
      completedAppointments: emp.appointments.filter((a) => a.status === 'COMPLETED').length,
      cancelledAppointments: emp.appointments.filter((a) => a.status === 'CANCELLED').length,
      noShowAppointments: emp.appointments.filter((a) => a.status === 'NO_SHOW').length,
      performance: emp.performance,
    }));
  }

  async getClientRetentionReport(startDate: Date, endDate: Date) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        client: {
          include: {
            user: true,
            appointments: true,
          },
        },
      },
    });

    const clients: Record<string, { count: number; isRepeat: boolean }> = {};
    appointments.forEach((apt) => {
      const clientId = apt.clientId;
      if (!clients[clientId]) {
        clients[clientId] = {
          count: 0,
          isRepeat: apt.client.appointments.length > 1,
        };
      }
      clients[clientId].count++;
    });

    const repeatClients = Object.values(clients).filter((c) => c.isRepeat).length;
    const totalClients = Object.keys(clients).length;
    const retentionRate = totalClients > 0 ? (repeatClients / totalClients) * 100 : 0;

    return {
      totalClients,
      repeatClients,
      retentionRate: retentionRate.toFixed(2),
    };
  }

  async getAverageTicketSize(startDate: Date, endDate: Date) {
    const payments = await this.prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
      },
    });

    if (payments.length === 0) {
      return 0;
    }

    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    return (total / payments.length).toFixed(2);
  }
}
