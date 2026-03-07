import { NestFactory } from '@nestjs/core';
import { ValidationPipe, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigins = [
    'http://localhost:3000',
    'https://appointment-app-frontend-3h9qc8iyl-koolungs-projects.vercel.app',
    'https://appointment-app-frontend.vercel.app',
  ];
  if (process.env.CORS_ORIGIN) {
    corsOrigins.push(process.env.CORS_ORIGIN);
  }

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Temporarily disabled to debug
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        console.error('Validation errors:', JSON.stringify(errors, null, 2));
        const messages = errors.map(error => 
          `${error.property}: ${Object.values(error.constraints || {}).join(', ')}`
        );
        return new BadRequestException(messages);
      },
    }),
  );

  const PORT = process.env.PORT || 3000;
  await app.listen(PORT);
  console.log(`Application is running on port ${PORT}`);
}

bootstrap();
