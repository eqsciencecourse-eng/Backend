import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GradesService } from './grades.service';
import { GradesController } from './grades.controller';
import { GradeSummaryController } from './grades-summary.controller';
import { Grade, GradeSchema } from './schemas/grade.schema';
import { FilesModule } from '../files/files.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { GradeSummaryService } from './grades-summary.service';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Grade.name, schema: GradeSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
    forwardRef(() => UsersModule),
    FilesModule,
    RealtimeModule,
  ],
  controllers: [GradesController, GradeSummaryController],
  providers: [GradesService, GradeSummaryService],
  exports: [GradesService],
})
export class GradesModule { }
