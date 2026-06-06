import { TenantEnvironment, UserRole } from './enums';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  environment: TenantEnvironment;
  devoteeId?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  environment: TenantEnvironment;
  devoteeId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  tenantId?: string;
  environment?: TenantEnvironment;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}
