import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly prisma: PrismaService) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true, // SSL/TLS
      auth: {
        user: process.env.SMTP_USER || 'test',
        pass: process.env.SMTP_PASSWORD || 'test',
      },
    });
  }

  async sendBookingConfirmation(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: {
          include: {
            user: true,
          },
        },
        employee: {
          include: {
            user: true,
          },
        },
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!appointment || !appointment.client.user) {
      return;
    }

    const appointmentDate = new Date(appointment.startTime);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const totalPrice = appointment.services.reduce((sum, s) => sum + (s.service.price || 0), 0);

    const subject = 'Your Booking Confirmation - Beautelia Hair';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px 20px;
              text-align: center;
              color: white;
            }
            .logo {
              max-width: 150px;
              height: auto;
              margin-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 16px;
              margin-bottom: 30px;
            }
            .confirmation-box {
              background-color: #f8f9fa;
              border-left: 4px solid #667eea;
              padding: 20px;
              margin: 30px 0;
              border-radius: 4px;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 12px 0;
              border-bottom: 1px solid #e0e0e0;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-weight: 600;
              color: #667eea;
              min-width: 150px;
            }
            .detail-value {
              text-align: right;
              color: #333;
            }
            .services-list {
              background-color: #f8f9fa;
              border-radius: 4px;
              padding: 15px;
              margin: 20px 0;
            }
            .service-item {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e0e0e0;
            }
            .service-item:last-child {
              border-bottom: none;
            }
            .service-name {
              color: #333;
            }
            .service-price {
              color: #667eea;
              font-weight: 600;
            }
            .total-section {
              display: flex;
              justify-content: space-between;
              padding: 15px 0;
              border-top: 2px solid #667eea;
              margin-top: 15px;
              font-size: 18px;
              font-weight: 600;
              color: #667eea;
            }
            .cta-button {
              display: inline-block;
              background-color: #667eea;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 4px;
              margin: 30px 0;
              font-weight: 600;
              text-align: center;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 30px;
              text-align: center;
              font-size: 14px;
              color: #666;
              border-top: 1px solid #e0e0e0;
            }
            .footer-links {
              margin-top: 15px;
            }
            .footer-links a {
              color: #667eea;
              text-decoration: none;
              margin: 0 10px;
            }
            .important-note {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://www.beauteliahair.com/images/logo/black.svg" alt="Beautelia Hair" class="logo">
              <h1>Booking Confirmed! ✓</h1>
            </div>

            <div class="content">
              <div class="greeting">
                <p>Hi <strong>${appointment.client.user.firstName}</strong>,</p>
                <p>Thank you for booking with us! Your appointment has been confirmed. We're excited to see you!</p>
              </div>

              <div class="confirmation-box">
                <h2 style="margin-top: 0; color: #667eea;">Appointment Details</h2>
                
                <div class="detail-row">
                  <span class="detail-label">📅 Date</span>
                  <span class="detail-value"><strong>${formattedDate}</strong></span>
                </div>

                <div class="detail-row">
                  <span class="detail-label">⏰ Time</span>
                  <span class="detail-value"><strong>${formattedTime}</strong></span>
                </div>

                <div class="detail-row">
                  <span class="detail-label">💇 Stylist</span>
                  <span class="detail-value"><strong>${appointment.employee.user.firstName} ${appointment.employee.user.lastName}</strong></span>
                </div>

                <div class="detail-row">
                  <span class="detail-label">⏱️ Duration</span>
                  <span class="detail-value"><strong>${appointment.services.reduce((sum, s) => sum + (s.service.baseDuration || 0), 0)} minutes</strong></span>
                </div>
              </div>

              <h3 style="color: #667eea; margin-top: 30px;">Services</h3>
              <div class="services-list">
                ${appointment.services
                  .map(
                    (s) => `
                  <div class="service-item">
                    <span class="service-name">${s.service.name}</span>
                    <span class="service-price">$${(s.service.price || 0).toFixed(2)}</span>
                  </div>
                `,
                  )
                  .join('')}
                <div class="total-section">
                  <span>Total</span>
                  <span>$${totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <div class="important-note">
                <strong>📝 Please arrive 5-10 minutes early</strong> to allow time for check-in. If you need to reschedule or cancel, please contact us as soon as possible.
              </div>

              <center>
                <a href="https://www.beauteliahair.com" class="cta-button">View More Services</a>
              </center>

              <p style="text-align: center; color: #666; margin-top: 30px;">
                If you have any questions, feel free to contact us!
              </p>
            </div>

            <div class="footer">
              <p><strong>Beautelia Hair Studio</strong></p>
              <p>📞 Contact us for support</p>
              <div class="footer-links">
                <a href="https://www.beauteliahair.com">Website</a>
              </div>
              <p style="margin-top: 20px; font-size: 12px; color: #999;">
                This is an automated message. Please do not reply directly to this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: appointment.client.user.email,
      subject,
      html,
    });
  }

  async sendBookingModification(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: {
          include: {
            user: true,
          },
        },
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!appointment || !appointment.client.user) {
      return;
    }

    const subject = 'Booking Rescheduled';
    const html = `
      <h2>Your booking has been rescheduled</h2>
      <p>Hi ${appointment.client.user.firstName},</p>
      <p>Your appointment has been rescheduled to:</p>
      <h3>New Appointment Details:</h3>
      <ul>
        <li><strong>Date:</strong> ${appointment.startTime.toLocaleDateString()}</li>
        <li><strong>Time:</strong> ${appointment.startTime.toLocaleTimeString()} - ${appointment.endTime.toLocaleTimeString()}</li>
        <li><strong>Services:</strong> ${appointment.services.map((s) => s.service.name).join(', ')}</li>
      </ul>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: appointment.client.user.email,
      subject,
      html,
    });
  }

  async sendBookingCancellation(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!appointment || !appointment.client.user) {
      return;
    }

    const subject = 'Booking Cancelled';
    const html = `
      <h2>Your booking has been cancelled</h2>
      <p>Hi ${appointment.client.user.firstName},</p>
      <p>Your appointment scheduled for ${appointment.startTime.toLocaleDateString()} at ${appointment.startTime.toLocaleTimeString()} has been cancelled.</p>
      <p>If you have any questions, please contact us.</p>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: appointment.client.user.email,
      subject,
      html,
    });
  }

  async sendReminderNotification(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: {
          include: {
            user: true,
          },
        },
        employee: {
          include: {
            user: true,
          },
        },
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!appointment || !appointment.client.user) {
      return;
    }

    const subject = 'Appointment Reminder';
    const html = `
      <h2>Your appointment is coming up!</h2>
      <p>Hi ${appointment.client.user.firstName},</p>
      <p>This is a reminder about your appointment.</p>
      <h3>Appointment Details:</h3>
      <ul>
        <li><strong>Date:</strong> ${appointment.startTime.toLocaleDateString()}</li>
        <li><strong>Time:</strong> ${appointment.startTime.toLocaleTimeString()}</li>
        <li><strong>Stylist:</strong> ${appointment.employee.user.firstName} ${appointment.employee.user.lastName}</li>
        <li><strong>Services:</strong> ${appointment.services.map((s) => s.service.name).join(', ')}</li>
      </ul>
      <p>See you soon!</p>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: appointment.client.user.email,
      subject,
      html,
    });
  }
}
