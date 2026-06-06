import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthUser, JwtPayload, LoginResponse, TenantEnvironment, UserRole } from '@tms/types';
import { DevoteeService } from '../devotee/devotee.service';
import { DEMO_TENANT_ID, DEMO_USERS } from './demo-users';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly devoteeService: DevoteeService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponse> {
    const record = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === dto.email.toLowerCase() && u.password === dto.password,
    );

    if (!record) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tenantId = dto.tenantId ?? record.tenantId ?? DEMO_TENANT_ID;
    const environment = dto.environment ?? record.environment ?? TenantEnvironment.PROD;

    let devoteeId: string | undefined;
    if (record.role === UserRole.DEVOTEE && record.devoteeEmail) {
      const devotees = await this.devoteeService.findAll(tenantId, 1, 50, { name: 'Rajan' });
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
