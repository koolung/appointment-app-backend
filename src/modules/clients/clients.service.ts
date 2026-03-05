import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllClients() {
    return this.prisma.client.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getClientById(id: string) {
    return this.prisma.client.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async createClient(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  }) {
    // First create a user
    const user = await this.prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || '',
        role: 'CLIENT',
        password: '', // Empty password for clients created by admin
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    // Then create the client record
    return this.prisma.client.create({
      data: {
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async updateClient(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    }
  ) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!client || !client.user) {
      throw new Error('Client or user not found');
    }

    // Update the associated user
    await this.prisma.user.update({
      where: { id: client.user.id },
      data: {
        firstName: data.firstName !== undefined ? data.firstName : client.user.firstName,
        lastName: data.lastName !== undefined ? data.lastName : client.user.lastName,
        email: data.email !== undefined ? data.email : client.user.email,
        phone: data.phone !== undefined ? data.phone : client.user.phone,
      },
    });

    // Return updated client
    return this.prisma.client.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async deleteClient(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new Error('Client not found');
    }

    // Delete client (this will cascade delete appointments due to the relation)
    await this.prisma.client.delete({
      where: { id },
    });

    // Delete the associated user if it exists
    if (client.userId) {
      try {
        await this.prisma.user.delete({
          where: { id: client.userId },
        });
      } catch (error) {
        // User might be shared, so we ignore deletion errors
      }
    }

    return { success: true };
  }
}
