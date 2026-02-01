import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { FirebaseModule } from './firebase/firebase.module';
import { SchoolsModule } from './schools/schools.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { GradesModule } from './grades/grades.module';
import { FilesModule } from './files/files.module';
import { MailModule } from './mail/mail.module';
import { SubjectsModule } from './subjects/subjects.module';
import { GoogleSheetsModule } from './googlesheets/googlesheets.module';
import { AdminModule } from './admin/admin.module';
import { SchedulesModule } from './schedules/schedules.module';
import { WebhookModule } from './webhook/webhook.module';
import { RealtimeModule } from './realtime/realtime.module';
import { GatewayModule } from './gateway/gateway.module';
import { ReportsModule } from './reports/reports.module';
import { ClassesModule } from './classes/classes.module';
import { AttendanceModule } from './attendance/attendance.module';
import { CoursesModule } from './courses/courses.module';
import { AccountingModule } from './accounting/accounting.module';
import { LineModule } from './line/line.module';
import { EvaluationsModule } from './evaluations/evaluations.module';

@Module({
  imports: [
    CommonModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');
        console.log(`[Mongo] Connecting to: ${uri?.split('@')[1] || 'Unknown Host'}...`); // Log host only for safety
        return {
          uri,
          serverSelectionTimeoutMS: 5000, // Timeout after 5s if can't connect
          socketTimeoutMS: 45000,
        };
      },
      inject: [ConfigService],
    }),
    FirebaseModule,
    SchoolsModule,
    UsersModule,
    AuthModule,
    GradesModule,
    AttendanceModule,
    FilesModule,
    SchedulesModule,
    MailModule,
    SubjectsModule,
    GoogleSheetsModule,
    AdminModule,
    WebhookModule,
    RealtimeModule,
    GatewayModule,
    ReportsModule,
    ClassesModule,
    CoursesModule,
    AccountingModule,
    LineModule,
    EvaluationsModule, // [NEW] Registered
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
