import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtGuard } from '@/common/guards/jwt.guard';

@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('test')
  testEndpoint() {
    return { message: 'Appointments endpoint is working', status: 'ok' };
  }

  @Get()
  async getAllAppointments() {
    // Get all appointments (for admin/calendar view)
    return this.appointmentsService.getAllAppointments();
  }

  @Post()
  async createAppointment(@Body() data: any, @Request() req: any) {
    // Convert ISO string dates to Date objects if needed
    const appointmentData = {
      ...data,
      startTime: typeof data.startTime === 'string' ? new Date(data.startTime) : data.startTime,
      endTime: typeof data.endTime === 'string' ? new Date(data.endTime) : data.endTime,
    };
    return this.appointmentsService.createAppointment(appointmentData);
  }

  @Get('my')
  @UseGuards(JwtGuard)
  async getMyAppointments(@Request() req: any) {
    // Get appointments for logged-in user
    const userId = req.user?.sub || req.user?.id;
    
    if (!userId) {
      // If no authenticated user, try to get from query parameter (for testing)
      return [];
    }

    // Get client record by userId
    const client = await this.prisma.client.findUnique({
      where: { userId },
    });

    if (!client) {
      return [];
    }

    return this.appointmentsService.getAppointmentsByClient(client.id);
  }

  @Get(':id')
  async getAppointment(@Param('id') id: string) {
    return this.appointmentsService.getAppointment(id);
  }

  @Put(':id')
  async updateAppointment(@Param('id') id: string, @Body() data: any) {
    // Handle both rescheduling (newStartTime/newEndTime) and full updates (startTime/endTime)
    const startTime = data.startTime || data.newStartTime;
    const endTime = data.endTime || data.newEndTime;
    
    return this.appointmentsService.updateAppointment(id, {
      startTime: typeof startTime === 'string' ? new Date(startTime) : startTime,
      endTime: typeof endTime === 'string' ? new Date(endTime) : endTime,
      clientFirstName: data.clientFirstName,
      clientLastName: data.clientLastName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      employeeId: data.employeeId,
      serviceIds: data.serviceIds,
      status: data.status,
      notes: data.notes,
    });
  }

  @Delete(':id')
  async cancelAppointment(@Param('id') id: string) {
    return this.appointmentsService.cancelAppointment(id);
  }

  @Post(':id/confirm')
  async confirmAppointment(@Param('id') id: string) {
    return this.appointmentsService.confirmAppointment(id);
  }
}
