import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantUserEntity } from '../../database/entities/control/tenant-user.entity';
import { StaffController } from './staff.controller';
import { StaffLeaveService } from './staff-leave.service';
import { StaffService } from './staff.service';
import { TenantUsersService } from './tenant-users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TenantUserEntity])],
  controllers: [StaffController, UsersController],
  providers: [StaffService, StaffLeaveService, TenantUsersService],
  exports: [StaffService, StaffLeaveService, TenantUsersService],
})
export class StaffModule implements OnModuleInit {
  constructor(
    private readonly staffService: StaffService,
    private readonly leaveService: StaffLeaveService,
  ) {}

  onModuleInit(): void {
    this.staffService.setLeaveService(this.leaveService);
  }
}
