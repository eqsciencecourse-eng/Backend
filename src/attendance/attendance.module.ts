
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { Attendance, AttendanceSchema } from './schemas/attendance.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Attendance.name, schema: AttendanceSchema },
            { name: User.name, schema: UserSchema }
        ]),
        AuthModule,
        UsersModule
    ],
    controllers: [AttendanceController],
    providers: [AttendanceService],
    exports: [AttendanceService]
})
export class AttendanceModule { }
