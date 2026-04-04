import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@Injectable()
export class AuthService {
  private sesClient: SESClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    this.sesClient = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async signUp(dto: SignUpDto) {
    console.log('AuthService.signUp called with:', dto);
    
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: 'CLIENT',
      },
    });

    console.log('User created:', user);

    // Create client profile
    await this.prisma.client.create({
      data: {
        userId: user.id,
      },
    });

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
    };
  }

  async signIn(dto: SignInDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
    };
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async createAdmin(dto: SignUpDto) {
    console.log('Creating admin user with:', dto);
    
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: 'ADMIN',
      },
    });

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('Email not found');
    }

    // Generate a short-lived reset token (15 minutes)
    const resetToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        type: 'reset',
      },
      { expiresIn: '15m' }
    );

    // Send reset email
    await this.sendPasswordResetEmail(user.email, user.firstName || 'User', resetToken);

    return {
      message: 'Password reset link has been sent to your email. Please check your inbox.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify(token);

      if (payload.type !== 'reset') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
        },
      });

      return {
        message: 'Password has been successfully reset',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }

  private async sendPasswordResetEmail(email: string, firstName: string, resetToken: string) {
    try {
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

      const htmlContent = `
        <h2>Password Reset Request</h2>
        <p>Hi ${firstName || 'User'},</p>
        <p>We received a request to reset your password. Click the link below to reset it:</p>
        <p>
          <a href="${resetLink}" style="background-color: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p>Or copy this link: <a href="${resetLink}">${resetLink}</a></p>
        <p>This link will expire in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>Salon Appointment Team</p>
      `;

      const command = new SendEmailCommand({
        Source: process.env.AWS_SES_FROM_EMAIL || 'noreply@salon-app.com',
        Destination: {
          ToAddresses: [email],
        },
        Message: {
          Subject: {
            Data: 'Password Reset Request',
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlContent,
              Charset: 'UTF-8',
            },
          },
        },
      });

      const info = await this.sesClient.send(command);
      console.log('Password reset email sent to:', email, 'Message ID:', info.MessageId);
      return info;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error sending password reset email to', email, ':', errorMessage);
      throw new BadRequestException(
        `Failed to send password reset email: ${errorMessage}. Please check your email configuration.`
      );
    }
  }

  async testSmtpEmail() {
    try {
      console.log('Testing AWS SES configuration...');
      console.log('AWS Config:', {
        region: process.env.AWS_REGION,
        fromEmail: process.env.AWS_SES_FROM_EMAIL,
      });

      const command = new SendEmailCommand({
        Source: process.env.AWS_SES_FROM_EMAIL || 'noreply@salon-app.com',
        Destination: {
          ToAddresses: ['info@bedfordwebservices.com'],
        },
        Message: {
          Subject: {
            Data: 'Salon App AWS SES Test',
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: `
                <h2>AWS SES Test Email</h2>
                <p>This is a test email from the Salon Appointment App using AWS SES</p>
                <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
                <p><strong>From Email:</strong> ${process.env.AWS_SES_FROM_EMAIL}</p>
                <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
                <p><strong>AWS Region:</strong> ${process.env.AWS_REGION}</p>
                <p>If you received this, your AWS SES configuration is working correctly!</p>
              `,
              Charset: 'UTF-8',
            },
          },
        },
      });

      console.log('Sending test email to info@bedfordwebservices.com...');
      const info = await this.sesClient.send(command);
      console.log('Test email sent successfully! Message ID:', info.MessageId);

      return {
        success: true,
        message: 'Test email sent successfully to info@bedfordwebservices.com',
        messageId: info.MessageId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error sending test email:', errorMessage);
      throw new BadRequestException({
        success: false,
        message: `Failed to send test email: ${errorMessage}`,
        awsConfig: {
          region: process.env.AWS_REGION,
          fromEmail: process.env.AWS_SES_FROM_EMAIL,
        },
        error: errorMessage,
      });
    }
  }

  async guestActivate(email: string, password: string) {
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('No account found with this email');
    }

    // Only allow activation for guest accounts (empty password)
    if (user.password && user.password.length > 0) {
      throw new BadRequestException('This account already has a password. Please sign in instead.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // Send account activation confirmation email
    await this.sendAccountActivatedEmail(email, user.firstName || 'Guest');

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
    };
  }

  private async sendAccountActivatedEmail(email: string, firstName: string) {
    try {
      const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;

      const htmlContent = `
        <h2>Your Account Has Been Created!</h2>
        <p>Hi ${firstName},</p>
        <p>Your account has been successfully activated. You can now sign in to manage your appointments, view booking history, and more.</p>
        <p>
          <a href="${loginLink}" style="background-color: #35514e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Sign In Now
          </a>
        </p>
        <p>Or visit: <a href="${loginLink}">${loginLink}</a></p>
        <p>Best regards,<br>Salon Appointment Team</p>
      `;

      const command = new SendEmailCommand({
        Source: process.env.AWS_SES_FROM_EMAIL || 'noreply@salon-app.com',
        Destination: {
          ToAddresses: [email],
        },
        Message: {
          Subject: {
            Data: 'Your Account Has Been Created',
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlContent,
              Charset: 'UTF-8',
            },
          },
        },
      });

      const info = await this.sesClient.send(command);
      console.log('Account activation email sent to:', email, 'Message ID:', info.MessageId);
    } catch (error) {
      console.error('Failed to send account activation email:', error);
      // Don't throw - account is already activated, email is just a notification
    }
  }
}
