import { Module } from '@nestjs/common';
import { GoogleSheetsService } from './googlesheets.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [GoogleSheetsService],
  exports: [GoogleSheetsService],
})
export class GoogleSheetsModule {}
