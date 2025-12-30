import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface ServiceConfig {
  name: string;
  url: string;
  timeout?: number;
}

@Injectable()
export class ProxyService {
  private readonly services: Map<string, ServiceConfig> = new Map();

  constructor(private readonly httpService: HttpService) {
    this.registerServices();
  }

  private registerServices() {
    const services: ServiceConfig[] = [
      { name: 'auth', url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001' },
      { name: 'appointment', url: process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3002' },
      { name: 'consultation', url: process.env.CONSULTATION_SERVICE_URL || 'http://localhost:3003' },
      { name: 'payment', url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004' },
      { name: 'notification', url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005' },
      { name: 'medical-records', url: process.env.MEDICAL_RECORDS_SERVICE_URL || 'http://localhost:3006' },
    ];

    services.forEach((service) => {
      this.services.set(service.name, service);
    });
  }

  async proxyRequest(
    serviceName: string,
    path: string,
    method: string,
    data?: any,
    headers?: any,
  ): Promise<any> {
    const service = this.services.get(serviceName);

    if (!service) {
      throw new HttpException(`Service ${serviceName} not found`, HttpStatus.NOT_FOUND);
    }

    const url = `${service.url}${path}`;

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url,
          data,
          headers,
          timeout: service.timeout || 30000,
        }),
      );

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new HttpException(
          error.response.data || 'Service error',
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        `Service ${serviceName} unavailable`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
