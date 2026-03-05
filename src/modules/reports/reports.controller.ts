import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('test')
  testEndpoint() {
    return { message: 'Reports endpoint is working', status: 'ok' };
  }

  @Get('revenue')
  async getRevenueReport(@Query() query: any) {
    const startDate = new Date(query.startDate || new Date(new Date().getFullYear(), 0, 1));
    const endDate = new Date(query.endDate || new Date());
    return this.reportsService.getRevenueReport(startDate, endDate, query.groupBy || 'day');
  }

  @Get('revenue/by-service')
  async getRevenueByService(@Query() query: any) {
    const startDate = new Date(query.startDate || new Date(new Date().getFullYear(), 0, 1));
    const endDate = new Date(query.endDate || new Date());
    return this.reportsService.getRevenueByService(startDate, endDate);
  }

  @Get('revenue/by-employee')
  async getRevenueByEmployee(@Query() query: any) {
    const startDate = new Date(query.startDate || new Date(new Date().getFullYear(), 0, 1));
    const endDate = new Date(query.endDate || new Date());
    return this.reportsService.getRevenueByEmployee(startDate, endDate);
  }
}
