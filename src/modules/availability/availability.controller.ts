import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('working-hours/:employeeId')
  async getWorkingHours(
    @Param('employeeId') employeeId: string,
    @Query('date') date?: string,
    @Query('timezone') timezone?: string,
  ) {
    const dateString = date || new Date().toISOString().split('T')[0];
    const userTimezone = timezone || 'UTC';
    return this.availabilityService.getWorkingHours(employeeId, dateString, userTimezone);
  }

  @Get('slots/:employeeId')
  async getAvailableSlots(
    @Param('employeeId') employeeId: string,
    @Query('date') date?: string,
    @Query('duration') duration?: string,
    @Query('timezone') timezone?: string,
  ) {
    const dateString = date || new Date().toISOString().split('T')[0];
    const slotDuration = parseInt(duration || '15', 10);
    const userTimezone = timezone || 'UTC';
    
    return this.availabilityService.getAvailableSlots(
      employeeId,
      dateString,
      slotDuration,
      userTimezone,
    );
  }

  @Get(':employeeId')
  async getAvailabilityRules(@Param('employeeId') employeeId: string) {
    return this.availabilityService.getAvailabilityRules(employeeId);
  }

  @Post()
  async createAvailabilityRule(@Body() data: any) {
    return this.availabilityService.createAvailabilityRule(data);
  }

  @Put(':id')
  async updateAvailabilityRule(@Param('id') id: string, @Body() data: any) {
    return this.availabilityService.updateAvailabilityRule(id, data);
  }

  @Delete(':id')
  async deleteAvailabilityRule(@Param('id') id: string) {
    return this.availabilityService.deleteAvailabilityRule(id);
  }

  @Post('check')
  async checkAvailability(@Body() data: { employeeId: string; startTime: string; endTime: string; timezone?: string }) {
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    return this.availabilityService.checkAvailability(data.employeeId, startTime, endTime, false, data.timezone || 'UTC');
  }
}

