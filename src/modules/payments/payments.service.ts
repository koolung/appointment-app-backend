import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPayment(data: {
    appointmentId: string;
    amount: number;
    subtotal?: number;
    discount?: number;
    discountType?: string;
    tax?: number;
    taxAmount?: number;
    tip?: number;
    paymentType?: string;
    soldBy?: string;
    status?: string;
    method?: 'CASH' | 'CARD' | 'ONLINE';
    stripeId?: string;
  }) {
    // Map paymentType to method, defaulting to CARD if not recognized
    let method: 'CASH' | 'CARD' | 'ONLINE' = 'CARD';
    if (data.paymentType) {
      const typeMap: Record<string, 'CASH' | 'CARD' | 'ONLINE'> = {
        'cash': 'CASH',
        'card': 'CARD',
        'giftcard': 'CARD',
        'membership': 'CARD',
      };
      method = typeMap[data.paymentType.toLowerCase()] || 'CARD';
    } else if (data.method) {
      method = data.method;
    }

    return this.prisma.payment.create({
      data: {
        appointmentId: data.appointmentId,
        amount: data.amount,
        method: method,
        stripeId: data.stripeId,
        status: data.status || 'COMPLETED',
      },
    });
  }

  async getPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async updatePayment(paymentId: string, data: { method?: string; status?: string }) {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        ...(data.method && { method: data.method }),
        ...(data.status && { status: data.status }),
      },
    });
  }

  async getPaymentsByAppointment(appointmentId: string) {
    return this.prisma.payment.findMany({
      where: { appointmentId },
    });
  }

  async completePayment(paymentId: string) {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'COMPLETED' },
    });
  }

  async failPayment(paymentId: string) {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'FAILED' },
    });
  }

  async refundPayment(paymentId: string) {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'REFUNDED' },
    });
  }
}
