import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllEmployees(isActive?: boolean) {
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.prisma.employee.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        performance: true,
        employeeServices: {
          include: {
            service: true,
          },
        },
      },
    });
  }

  async getEmployeeById(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        performance: true,
        availabilityRules: true,
        employeeServices: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async updateEmployee(employeeId: string, data: any) {
    const { serviceIds, ...updateData } = data;

    const employee = await this.prisma.employee.update({
      where: { id: employeeId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        performance: true,
        employeeServices: {
          include: {
            service: true,
          },
        },
      },
    });

    // If serviceIds are provided, update employee services
    if (serviceIds && Array.isArray(serviceIds)) {
      // Delete existing services
      await this.prisma.employeeService.deleteMany({
        where: { employeeId },
      });

      // Create new services
      if (serviceIds.length > 0) {
        await Promise.all(
          serviceIds.map((serviceId: string) =>
            this.prisma.employeeService.create({
              data: {
                employeeId: employeeId,
                serviceId: serviceId,
              },
            }),
          ),
        );
      }

      // Refetch to get updated services
      return this.prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          performance: true,
          employeeServices: {
            include: {
              service: true,
            },
          },
        },
      });
    }

    return employee;
  }

  async createEmployee(data: any) {
    // Create user first
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        password: 'temp_password_123', // Will need to be set by user
        role: 'EMPLOYEE',
      },
    });

    // Then create employee record
    const employee = await this.prisma.employee.create({
      data: {
        userId: user.id,
        position: data.position,
        hourlyRate: data.hourlyRate,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        employeeServices: {
          include: {
            service: true,
          },
        },
      },
    });

    // If serviceIds are provided, create employee services
    if (data.serviceIds && Array.isArray(data.serviceIds) && data.serviceIds.length > 0) {
      await Promise.all(
        data.serviceIds.map((serviceId: string) =>
          this.prisma.employeeService.create({
            data: {
              employeeId: employee.id,
              serviceId: serviceId,
            },
          }),
        ),
      );

      // Refetch to get updated services
      return this.prisma.employee.findUnique({
        where: { id: employee.id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          employeeServices: {
            include: {
              service: true,
            },
          },
        },
      });
    }

    return employee;
  }

  async deleteEmployee(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Delete employee record first
    await this.prisma.employee.delete({
      where: { id: employeeId },
    });

    // Then delete user
    await this.prisma.user.delete({
      where: { id: employee.userId },
    });

    return { message: 'Employee deleted successfully' };
  }

  async getEmployeePerformance(employeeId: string) {
    const performance = await this.prisma.employeePerformance.findUnique({
      where: { employeeId },
    });

    if (!performance) {
      throw new NotFoundException('Performance data not found');
    }

    return performance;
  }
}
