import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EvaluationLog, EvaluationLogDocument } from './schemas/evaluation-log.schema';

@Injectable()
export class EvaluationsService {
    constructor(
        @InjectModel(EvaluationLog.name) private evaluationLogModel: Model<EvaluationLogDocument>,
    ) { }

    async createLog(data: any) {
        const log = new this.evaluationLogModel(data);
        return log.save();
    }

    async getStudentHistory(studentId: string, subjectId?: string) {
        const query: any = { studentId };
        if (subjectId) query.subjectId = subjectId;
        return this.evaluationLogModel.find(query).sort({ date: -1 }).exec();
    }

    async getStudentSummary(studentId: string) {
        // Aggregate all logs to calculate averages and totals
        const logs = await this.evaluationLogModel.find({ studentId }).exec();

        if (!logs || logs.length === 0) {
            return null;
        }

        const totalLogs = logs.length;
        let totalScore = 0;

        const skillSums = {
            creativity: 0,
            planning: 0,
            problemSolving: 0,
            design: 0,
            programming: 0,
            focus: 0
        };

        logs.forEach(log => {
            // Assuming scores are 0-10
            // Fixed: Cast keys to proper type to avoid implicit any error
            (Object.keys(skillSums) as Array<keyof typeof skillSums>).forEach(key => {
                skillSums[key] += (log.scores[key] || 0);
                totalScore += (log.scores[key] || 0);
            });
        });

        // Calculate Averages for Radar Chart
        const averages = {
            creativity: Number((skillSums.creativity / totalLogs).toFixed(1)),
            planning: Number((skillSums.planning / totalLogs).toFixed(1)),
            problemSolving: Number((skillSums.problemSolving / totalLogs).toFixed(1)),
            design: Number((skillSums.design / totalLogs).toFixed(1)),
            programming: Number((skillSums.programming / totalLogs).toFixed(1)),
            focus: Number((skillSums.focus / totalLogs).toFixed(1)),
        };

        // Calculate Level (Simple Formula: Total XP / 100)
        // You can adjust this formula later
        const level = Math.floor(totalScore / 50) + 1;

        // Find latest teacher comment or recordedAt from the last log
        const lastLog = logs[logs.length - 1]; // logs are unsorted by default unless sorted above, but roughly... actually lets keep it simple

        return {
            studentId,
            totalEvaluations: totalLogs,
            level,
            totalXP: totalScore,
            averages,
            latestLog: logs[logs.length - 1] // simple last entry
        };
    }
}
