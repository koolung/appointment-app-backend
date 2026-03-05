import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('test')
  testEndpoint() {
    return { message: 'Employees endpoint is working', status: 'ok' };
  }

  @Get()
  async listEmployees(@Query('isActive') isActive?: string) {
    const isActiveFilter = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.employeesService.getAllEmployees(isActiveFilter);
  }

  @Get(':id')
  async getEmployee(@Param('id') id: string) {
    return this.employeesService.getEmployeeById(id);
  }

  @Post()
  async createEmployee(@Body() data: any) {
    return this.employeesService.createEmployee(data);
  }

  @Put(':id')
  async updateEmployee(@Param('id') id: string, @Body() data: any) {
    return this.employeesService.updateEmployee(id, data);
  }

  @Delete(':id')
  async deleteEmployee(@Param('id') id: string) {
    return this.employeesService.deleteEmployee(id);
  }

  @Get(':id/performance')
  async getPerformance(@Param('id') id: string) {
    return this.employeesService.getEmployeePerformance(id);
  }
}
