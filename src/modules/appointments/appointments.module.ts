import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { AvailabilityModule } from '@/modules/availability/availability.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { JwtGuard } from '@/common/guards/jwt.guard';

@Module({
  imports: [
    PrismaModule,
    AvailabilityModule,
    NotificationsModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN') || '7d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AppointmentsService, JwtGuard],
  controllers: [AppointmentsController],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
