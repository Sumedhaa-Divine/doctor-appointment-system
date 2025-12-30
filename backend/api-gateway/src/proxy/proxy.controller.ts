import { Controller, All, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller()
@UseGuards(AuthGuard)
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All('auth/*')
  async proxyAuth(@Req() req: Request, @Res() res: Response) {
    return this.proxy('auth', req, res);
  }

  @All('appointments/*')
  async proxyAppointment(@Req() req: Request, @Res() res: Response) {
    return this.proxy('appointment', req, res);
  }

  @All('consultations/*')
  async proxyConsultation(@Req() req: Request, @Res() res: Response) {
    return this.proxy('consultation', req, res);
  }

  @All('payments/*')
  async proxyPayment(@Req() req: Request, @Res() res: Response) {
    return this.proxy('payment', req, res);
  }

  @All('notifications/*')
  async proxyNotification(@Req() req: Request, @Res() res: Response) {
    return this.proxy('notification', req, res);
  }

  @All('medical-records/*')
  async proxyMedicalRecords(@Req() req: Request, @Res() res: Response) {
    return this.proxy('medical-records', req, res);
  }

  private async proxy(serviceName: string, req: Request, res: Response) {
    try {
      const path = req.url.replace(`/${serviceName}`, '');
      const data = await this.proxyService.proxyRequest(
        serviceName,
        path,
        req.method,
        req.body,
        req.headers,
      );

      return res.json(data);
    } catch (error) {
      return res.status(error.status || 500).json(error.response || { message: 'Internal server error' });
    }
  }
}
