import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as otplib from 'otplib';
import { User, UserStatus, UserRole } from '../entities/user.entity';
import { AuditLog } from '../entities/user.entity';

interface RegisterDto {
  email: string;
  phoneNumber: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

interface LoginDto {
  email: string;
  password: string;
  twoFactorCode?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto, ipAddress: string): Promise<any> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [
        { email: registerDto.email },
        { phoneNumber: registerDto.phoneNumber },
      ],
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    // Assign default permissions based on role
    const permissions = this.getDefaultPermissions(registerDto.role);

    // Create user
    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
      permissions,
      status: UserStatus.PENDING_VERIFICATION,
    });

    await this.userRepository.save(user);

    // Log audit
    await this.logAudit({
      userId: user.id,
      action: 'USER_REGISTERED',
      resource: 'user',
      resourceId: user.id,
      ipAddress,
    });

    // Remove password from response
    delete user.password;
    delete user.twoFactorSecret;

    // Generate verification token
    const verificationToken = this.generateVerificationToken(user.id);

    return {
      user,
      verificationToken,
      message: 'User registered successfully. Please verify your email and phone.',
    };
  }

  async login(loginDto: LoginDto, ipAddress: string, userAgent: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(`Account is ${user.status.toLowerCase()}`);
    }

    // Check 2FA if enabled
    if (user.isTwoFactorEnabled) {
      if (!loginDto.twoFactorCode) {
        return {
          requiresTwoFactor: true,
          message: 'Two-factor authentication required',
        };
      }

      const isValid = otplib.authenticator.verify({
        token: loginDto.twoFactorCode,
        secret: user.twoFactorSecret,
      });

      if (!isValid) {
        throw new UnauthorizedException('Invalid two-factor code');
      }
    }

    // Update last login
    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    await this.userRepository.save(user);

    // Log audit
    await this.logAudit({
      userId: user.id,
      action: 'USER_LOGIN',
      resource: 'auth',
      ipAddress,
      userAgent,
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    delete user.password;
    delete user.twoFactorSecret;

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async enableTwoFactor(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const secret = otplib.authenticator.generateSecret();
    const otpauth = otplib.authenticator.keyuri(
      user.email,
      'TeleHealth India',
      secret,
    );

    user.twoFactorSecret = secret;
    await this.userRepository.save(user);

    return {
      secret,
      otpauth,
      qrCode: await this.generateQRCode(otpauth),
    };
  }

  async verifyAndEnableTwoFactor(userId: string, code: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('Two-factor setup not initiated');
    }

    const isValid = otplib.authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid code');
    }

    user.isTwoFactorEnabled = true;
    await this.userRepository.save(user);

    return { message: 'Two-factor authentication enabled successfully' };
  }

  private generateAccessToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    }, {
      expiresIn: '24h',
    });
  }

  private generateRefreshToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      type: 'refresh',
    }, {
      expiresIn: '7d',
    });
  }

  private generateVerificationToken(userId: string): string {
    return this.jwtService.sign({
      sub: userId,
      type: 'verification',
    }, {
      expiresIn: '24h',
    });
  }

  private getDefaultPermissions(role: UserRole): string[] {
    const permissionsMap = {
      [UserRole.SUPER_ADMIN]: ['*'], // All permissions
      [UserRole.ADMIN]: [
        'users.read', 'users.update', 'users.delete',
        'appointments.read', 'appointments.update', 'appointments.delete',
        'consultations.read',
        'payments.read',
        'reports.read',
      ],
      [UserRole.DOCTOR]: [
        'appointments.read', 'appointments.update',
        'consultations.read', 'consultations.create',
        'prescriptions.create', 'prescriptions.update',
        'medical-records.read', 'medical-records.create',
      ],
      [UserRole.PATIENT]: [
        'appointments.create', 'appointments.read',
        'consultations.read',
        'medical-records.read',
        'payments.create',
      ],
      [UserRole.SUPPORT]: [
        'appointments.read', 'appointments.update',
        'users.read',
      ],
      [UserRole.FINANCE]: [
        'payments.read', 'payments.update',
        'reports.read',
      ],
    };

    return permissionsMap[role] || [];
  }

  private async logAudit(data: Partial<AuditLog>): Promise<void> {
    const log = this.auditLogRepository.create(data);
    await this.auditLogRepository.save(log);
  }

  private async generateQRCode(otpauth: string): Promise<string> {
    const QRCode = require('qrcode');
    return await QRCode.toDataURL(otpauth);
  }
}
