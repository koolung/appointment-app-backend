import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ServicesService } from './services.service';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get('test')
  testEndpoint() {
    return { message: 'Services endpoint is working', status: 'ok' };
  }

  @Get()
  async listServices(@Query('isActive') isActive?: string) {
    const isActiveFilter = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.servicesService.getAllServices(isActiveFilter);
  }

  @Get('categories')
  async getCategories() {
    return this.servicesService.getAllCategories();
  }

  @Get('categories/:id')
  async getCategoryById(@Param('id') id: string) {
    return this.servicesService.getCategoryById(id);
  }

  @Post('categories')
  async createCategory(@Body() data: any) {
    return this.servicesService.createCategory(data);
  }

  @Put('categories/:id')
  async updateCategory(@Param('id') id: string, @Body() data: any) {
    return this.servicesService.updateCategory(id, data);
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return this.servicesService.deleteCategory(id);
  }

  @Get(':id')
  async getService(@Param('id') id: string) {
    return this.servicesService.getServiceById(id);
  }

  @Post()
  async createService(@Body() data: any) {
    return this.servicesService.createService(data);
  }

  @Put(':id')
  async updateService(@Param('id') id: string, @Body() data: any) {
    return this.servicesService.updateService(id, data);
  }

  @Delete(':id')
  async deleteService(@Param('id') id: string) {
    return this.servicesService.deleteService(id);
  }

  @Get(':category/:categoryId')
  async getServicesByCategory(@Param('categoryId') categoryId: string) {
    return this.servicesService.getServicesByCategory(categoryId);
  }
}
