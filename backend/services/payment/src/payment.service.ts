import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

export enum PaymentGateway {
  RAZORPAY = 'RAZORPAY',
  PAYTM = 'PAYTM',
  CASHFREE = 'CASHFREE',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

interface CreatePaymentDto {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  amount: number;
  currency?: string;
  preferredGateway?: PaymentGateway;
}

interface PaymentEntity {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  amount: number;
  currency: string;
  gateway: PaymentGateway;
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  status: PaymentStatus;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PaymentService {
  private razorpay: any;
  private paytm: any;
  private cashfree: any;

  constructor() {
    // Initialize Razorpay
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Initialize Paytm (configuration)
    this.paytm = {
      merchantId: process.env.PAYTM_MERCHANT_ID,
      merchantKey: process.env.PAYTM_MERCHANT_KEY,
      website: process.env.PAYTM_WEBSITE || 'WEBSTAGING',
      industryType: process.env.PAYTM_INDUSTRY_TYPE || 'Retail',
      callbackUrl: process.env.PAYTM_CALLBACK_URL,
    };

    // Initialize Cashfree
    this.cashfree = {
      appId: process.env.CASHFREE_APP_ID,
      secretKey: process.env.CASHFREE_SECRET_KEY,
      baseUrl: process.env.CASHFREE_BASE_URL || 'https://test.cashfree.com',
    };
  }

  async createPayment(dto: CreatePaymentDto): Promise<any> {
    const gateway = dto.preferredGateway || this.selectGateway();

    let result;

    try {
      switch (gateway) {
        case PaymentGateway.RAZORPAY:
          result = await this.createRazorpayOrder(dto);
          break;
        case PaymentGateway.PAYTM:
          result = await this.createPaytmOrder(dto);
          break;
        case PaymentGateway.CASHFREE:
          result = await this.createCashfreeOrder(dto);
          break;
        default:
          throw new BadRequestException('Invalid payment gateway');
      }

      return {
        gateway,
        ...result,
      };
    } catch (error) {
      // Retry with fallback gateway
      if (!dto.preferredGateway) {
        const fallbackGateway = this.getFallbackGateway(gateway);
        console.log(`Retrying with fallback gateway: ${fallbackGateway}`);
        return this.createPayment({ ...dto, preferredGateway: fallbackGateway });
      }
      throw error;
    }
  }

  private async createRazorpayOrder(dto: CreatePaymentDto): Promise<any> {
    const options = {
      amount: dto.amount * 100, // Convert to paise
      currency: dto.currency || 'INR',
      receipt: `apt_${dto.appointmentId}`,
      notes: {
        appointmentId: dto.appointmentId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
      },
    };

    const order = await this.razorpay.orders.create(options);

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    };
  }

  private async createPaytmOrder(dto: CreatePaymentDto): Promise<any> {
    const orderId = `ORDER_${Date.now()}`;
    const txnAmount = dto.amount.toString();

    const paytmParams: any = {
      body: {
        requestType: 'Payment',
        mid: this.paytm.merchantId,
        websiteName: this.paytm.website,
        orderId: orderId,
        callbackUrl: this.paytm.callbackUrl,
        txnAmount: {
          value: txnAmount,
          currency: dto.currency || 'INR',
        },
        userInfo: {
          custId: dto.patientId,
        },
      },
    };

    // Generate checksum
    const checksum = await this.generatePaytmChecksum(
      JSON.stringify(paytmParams.body),
      this.paytm.merchantKey,
    );

    paytmParams.head = {
      signature: checksum,
    };

    // Call Paytm API to initiate transaction
    const response = await this.callPaytmAPI('/theia/api/v1/initiateTransaction', paytmParams);

    return {
      orderId,
      txnToken: response.body.txnToken,
      amount: txnAmount,
      mid: this.paytm.merchantId,
    };
  }

  private async createCashfreeOrder(dto: CreatePaymentDto): Promise<any> {
    const orderId = `order_${Date.now()}`;

    const requestData = {
      orderId: orderId,
      orderAmount: dto.amount,
      orderCurrency: dto.currency || 'INR',
      orderNote: `Payment for appointment ${dto.appointmentId}`,
      customerEmail: '', // Get from patient data
      customerPhone: '', // Get from patient data
      customerName: '', // Get from patient data
      returnUrl: process.env.CASHFREE_RETURN_URL,
      notifyUrl: process.env.CASHFREE_NOTIFY_URL,
    };

    const response = await this.callCashfreeAPI('/api/v2/cftoken/order', requestData);

    return {
      orderId,
      cfToken: response.cftoken,
      amount: dto.amount,
    };
  }

  async verifyRazorpayPayment(
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<boolean> {
    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    return generatedSignature === signature;
  }

  async verifyPaytmPayment(orderId: string, checksumHash: string): Promise<boolean> {
    // Verify checksum
    const paytmParams: any = {
      body: {
        mid: this.paytm.merchantId,
        orderId: orderId,
      },
    };

    const isValid = await this.verifyPaytmChecksum(
      JSON.stringify(paytmParams.body),
      this.paytm.merchantKey,
      checksumHash,
    );

    return isValid;
  }

  async processRefund(paymentId: string, amount?: number): Promise<any> {
    // Implementation for refunds
    // Support for partial and full refunds
    // Handle refund across all gateways

    return {
      refundId: `ref_${Date.now()}`,
      status: 'processing',
      amount,
    };
  }

  async handleWebhook(gateway: PaymentGateway, payload: any, signature: string): Promise<any> {
    // Verify webhook signature
    // Process payment status update
    // Update database
    // Send notifications

    return {
      status: 'processed',
    };
  }

  async getDoctorEarnings(doctorId: string, startDate?: Date, endDate?: Date): Promise<any> {
    // Calculate doctor earnings
    // Apply platform commission
    // Calculate payouts

    return {
      totalEarnings: 0,
      platformCommission: 0,
      netEarnings: 0,
      pendingPayout: 0,
    };
  }

  private selectGateway(): PaymentGateway {
    // Smart gateway selection based on:
    // - Gateway uptime
    // - Success rates
    // - Load balancing

    const gateways = [
      PaymentGateway.RAZORPAY,
      PaymentGateway.PAYTM,
      PaymentGateway.CASHFREE,
    ];

    // Random selection for now (implement smart logic)
    return gateways[0];
  }

  private getFallbackGateway(currentGateway: PaymentGateway): PaymentGateway {
    const fallbackMap = {
      [PaymentGateway.RAZORPAY]: PaymentGateway.PAYTM,
      [PaymentGateway.PAYTM]: PaymentGateway.CASHFREE,
      [PaymentGateway.CASHFREE]: PaymentGateway.RAZORPAY,
    };

    return fallbackMap[currentGateway];
  }

  private async generatePaytmChecksum(params: string, key: string): Promise<string> {
    // Implement Paytm checksum generation
    // Use Paytm's checksum library
    return '';
  }

  private async verifyPaytmChecksum(params: string, key: string, checksum: string): Promise<boolean> {
    // Implement Paytm checksum verification
    return true;
  }

  private async callPaytmAPI(endpoint: string, data: any): Promise<any> {
    // Call Paytm API
    return {};
  }

  private async callCashfreeAPI(endpoint: string, data: any): Promise<any> {
    // Call Cashfree API
    return {};
  }
}
