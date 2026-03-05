import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('test')
  testEndpoint() {
    return { message: 'Payments endpoint is working', status: 'ok' };
  }

  @Get(':id')
  async getPayment(@Param('id') id: string) {
    return this.paymentsService.getPayment(id);
  }

  @Post()
  async createPayment(@Body() data: any) {
    return this.paymentsService.createPayment(data);
  }

  @Put(':id')
  async updatePayment(@Param('id') id: string, @Body() data: any) {
    return this.paymentsService.updatePayment(id, data);
  }

  @Post(':id/complete')
  async completePayment(@Param('id') id: string) {
    return this.paymentsService.completePayment(id);
  }

  @Post(':id/fail')
  async failPayment(@Param('id') id: string) {
    return this.paymentsService.failPayment(id);
  }

  @Post(':id/refund')
  async refundPayment(@Param('id') id: string) {
    return this.paymentsService.refundPayment(id);
  }

  @Get('appointment/:appointmentId')
  async getAppointmentPayments(@Param('appointmentId') appointmentId: string) {
    return this.paymentsService.getPaymentsByAppointment(appointmentId);
  }
}
