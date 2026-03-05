import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllServices(isActive?: boolean) {
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    
    return this.prisma.service.findMany({
      where,
      include: {
        category: true,
      },
    });
  }

  async getServiceById(serviceId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        category: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  async getServicesByCategory(categoryId: string) {
    return this.prisma.service.findMany({
      where: {
        categoryId,
        isActive: true,
      },
    });
  }

  async getAllCategories() {
    return this.prisma.serviceCategory.findMany({
      include: {
        services: true,
      },
    });
  }

  async getCategoryById(categoryId: string) {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: categoryId },
      include: {
        services: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async createCategory(data: any) {
    return this.prisma.serviceCategory.create({
      data: {
        name: data.name,
        description: data.description || null,
      },
      include: {
        services: true,
      },
    });
  }

  async updateCategory(categoryId: string, data: any) {
    return this.prisma.serviceCategory.update({
      where: { id: categoryId },
      data: {
        name: data.name,
        description: data.description || null,
      },
      include: {
        services: true,
      },
    });
  }

  async deleteCategory(categoryId: string) {
    // Check if category has services
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: categoryId },
      include: {
        services: true,
      },
    });

    if (category?.services.length) {
      throw new Error('Cannot delete category with existing services');
    }

    return this.prisma.serviceCategory.delete({
      where: { id: categoryId },
    });
  }

  async createService(data: any) {
    // Ensure categoryId is not included or is null if not provided
    const serviceData: any = {
      name: data.name,
      description: data.description || null,
      price: data.price,
      baseDuration: data.baseDuration || 30,
      // categoryId is intentionally left out/null
    };

    return this.prisma.service.create({
      data: serviceData,
      include: {
        category: true,
      },
    });
  }

  async updateService(serviceId: string, data: any) {
    return this.prisma.service.update({
      where: { id: serviceId },
      data,
      include: {
        category: true,
      },
    });
  }

  async deleteService(serviceId: string) {
    return this.prisma.service.delete({
      where: { id: serviceId },
    });
  }
}
