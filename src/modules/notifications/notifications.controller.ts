import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('test')
  testEndpoint() {
    return { message: 'Notifications endpoint is working', status: 'ok' };
  }

  @Post('appointment/:id/confirmation')
  async sendBookingConfirmation(@Param('id') id: string) {
    return this.notificationsService.sendBookingConfirmation(id);
  }

  @Post('appointment/:id/modification')
  async sendBookingModification(@Param('id') id: string) {
    return this.notificationsService.sendBookingModification(id);
  }

  @Post('appointment/:id/cancellation')
  async sendBookingCancellation(@Param('id') id: string) {
    return this.notificationsService.sendBookingCancellation(id);
  }
}
