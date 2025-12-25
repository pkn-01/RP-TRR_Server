import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { TicketsModule } from './tickets/tickets.module';
import { NotificationModule } from './notification/notification.module';
import { UsersModule } from './users/users.module';
import { LoansModule } from './loans/loans.module';
import { LineOAModule } from './line-oa/line-oa.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [AuthModule, TicketsModule, NotificationModule, UsersModule, LoansModule, LineOAModule, StorageModule],
})
export class AppModule {}
