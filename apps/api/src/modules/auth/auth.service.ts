import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AuthUser,
  JwtPayload,
  LoginResponse,
  TenantEnvironment,
  UserRole,
} from '@tms/types';
import { TenantUsersService } from '../staff/tenant-users.service';
import { DevoteeService } from '../devotee/devotee.service';
import { DEMO_TENANT_ID, DEMO_USERS } from './demo-users';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly devoteeService: DevoteeService,
    private readonly tenantUsersService: TenantUsersService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponse> {
    const demoRecord = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === dto.email.toLowerCase() && u.password === dto.password,
    );

    if (demoRecord) {
      return this.buildLoginResponse(demoRecord, dto);
    }

    const tenantUser = await this.tenantUsersService.findByEmailAnyTenant(dto.email);
    if (
      tenantUser &&
      this.tenantUsersService.verifyPassword(tenantUser, dto.password)
    ) {
      if (
        dto.tenantId &&
        dto.tenantId !== tenantUser.tenantId
      ) {
        throw new UnauthorizedException('Invalid email or password for this temple');
      }

      const tenantId = dto.tenantId ?? tenantUser.tenantId;
      const environment = dto.environment ?? TenantEnvironment.PROD;

      const user: AuthUser = {
        id: tenantUser.id,
        email: tenantUser.email,
        name: tenantUser.name,
        role: tenantUser.role as UserRole,
        tenantId,
        environment,
      };

      return this.signResponse(user);
    }

    throw new UnauthorizedException('Invalid email or password');
  }

  private async buildLoginResponse(
    record: (typeof DEMO_USERS)[number],
    dto: LoginDto,
  ): Promise<LoginResponse> {
    if (
      dto.tenantId &&
      dto.tenantId !== record.tenantId &&
      record.role !== UserRole.SUPER_ADMIN
    ) {
      throw new UnauthorizedException('Invalid email or password for this temple');
    }

    const tenantId = dto.tenantId ?? record.tenantId ?? DEMO_TENANT_ID;
    const environment = dto.environment ?? record.environment ?? TenantEnvironment.PROD;

    let devoteeId: string | undefined;
    if (record.role === UserRole.DEVOTEE && record.devoteeEmail) {
      const devotees = await this.devoteeService.findAll(tenantId, 1, 50);
      const match = devotees.data.find(
        (d) => d.email?.toLowerCase() === record.devoteeEmail?.toLowerCase(),
      );
      devoteeId = match?.id ?? devotees.data[0]?.id;
    }

    const user: AuthUser = {
      id: record.id,
      email: record.email,
      name: record.name,
      role: record.role,
      tenantId,
      environment,
      devoteeId,
    };

    return this.signResponse(user);
  }

  private async signResponse(user: AuthUser): Promise<LoginResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      environment: user.environment,
      devoteeId: user.devoteeId,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user,
    };
  }

  getProfile(user: AuthUser): AuthUser {
    return user;
  }
}
