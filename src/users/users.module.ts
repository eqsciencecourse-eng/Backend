import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

import { User, UserSchema } from './schemas/user.schema';
import { Attendance, AttendanceSchema } from '../attendance/schemas/attendance.schema';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { GradesModule } from '../grades/grades.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { WebhookModule } from '../webhook/webhook.module';
import { TeacherController } from './teacher.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Attendance.name, schema: AttendanceSchema },
    ]),
    forwardRef(() => AuthModule),
    MailModule,
    RealtimeModule,
    forwardRef(() => GradesModule),
    WebhookModule,
  ],
  controllers: [UsersController, TeacherController], // AdminController ถูกใช้ใน AdminModule แทน
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule { }
