import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';
import { EvaluationLog, EvaluationLogSchema } from './schemas/evaluation-log.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: EvaluationLog.name, schema: EvaluationLogSchema }]),
    ],
    controllers: [EvaluationsController],
    providers: [EvaluationsService],
    exports: [EvaluationsService],
})
export class EvaluationsModule { }
