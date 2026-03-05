import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): object {
    return {
      message: 'Salon Booking Platform API',
      version: '1.0.0',
      endpoints: {
        auth: '/auth/sign-up, /auth/sign-in',
        health: '/health',
      },
    };
  }

  @Get('health')
  getHealth(): object {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
