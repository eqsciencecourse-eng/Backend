import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EvaluationLog, EvaluationLogDocument } from './schemas/evaluation-log.schema';
import { Attendance, AttendanceDocument } from '../attendance/schemas/attendance.schema';

@Injectable()
export class EvaluationsService {
    constructor(
        @InjectModel(EvaluationLog.name) private evaluationLogModel: Model<EvaluationLogDocument>,
        @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
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

    async updateLog(id: string, data: any) {
        return this.evaluationLogModel.findByIdAndUpdate(id, data, { new: true }).exec();
    }

    async deleteLog(id: string) {
        return this.evaluationLogModel.findByIdAndDelete(id).exec();
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

    async getSubjectEvaluationStatus(subjectId: string) {
        const attendanceRecords = await this.attendanceModel.find({ subjectId }).sort({ date: -1 }).exec();
        const evaluationLogs = await this.evaluationLogModel.find({ subjectId }).exec();

        const evalMap = new Map<string, Set<string>>();
        evaluationLogs.forEach(log => {
            const key = `${log.studentId}|${log.date.toISOString().split('T')[0]}`;
            if (!evalMap.has(log.studentId)) evalMap.set(log.studentId, new Set());
            evalMap.get(log.studentId)!.add(log.date.toISOString().split('T')[0]);
        });

        const studentEvalLogs = new Map<string, EvaluationLogDocument[]>();
        evaluationLogs.forEach(log => {
            if (!studentEvalLogs.has(log.studentId)) studentEvalLogs.set(log.studentId, []);
            studentEvalLogs.get(log.studentId)!.push(log);
        });

        const studentSessions = new Map<string, {
            studentId: string;
            sessions: { date: string; attendanceStatus: string; hasEvaluation: boolean; evaluationId?: string; scores?: any }[];
            totalEvaluations: number;
            latestScores?: any;
        }>();

        attendanceRecords.forEach(record => {
            const dateStr = record.date.toISOString().split('T')[0];
            record.students.forEach(attStudent => {
                if (!studentSessions.has(attStudent.studentId)) {
                    studentSessions.set(attStudent.studentId, {
                        studentId: attStudent.studentId,
                        sessions: [],
                        totalEvaluations: 0,
                    });
                }
                const entry = studentSessions.get(attStudent.studentId)!;
                const evaluatedDates = evalMap.get(attStudent.studentId);
                const hasEval = evaluatedDates?.has(dateStr) || false;
                let scores: any = undefined;
                let evaluationId: string | undefined = undefined;

                if (hasEval) {
                    const evalLog = evaluationLogs.find(l =>
                        l.studentId === attStudent.studentId &&
                        l.date.toISOString().split('T')[0] === dateStr
                    );
                    if (evalLog) {
                        scores = evalLog.scores;
                        evaluationId = evalLog._id?.toString();
                    }
                }

                entry.sessions.push({
                    date: dateStr,
                    attendanceStatus: attStudent.status,
                    hasEvaluation: hasEval,
                    evaluationId,
                    scores,
                });
                if (hasEval) entry.totalEvaluations++;
            });
        });

        studentEvalLogs.forEach((logs, studentId) => {
            const entry = studentSessions.get(studentId);
            if (entry) {
                const latestLog = logs[logs.length - 1];
                entry.latestScores = latestLog?.scores;
                entry.totalEvaluations = logs.length;
            }
        });

        return {
            subjectId,
            students: Array.from(studentSessions.values()),
        };
    }

    async batchCreateLogs(data: { studentId: string; teacherId: string; subjectId: string; date: string; scores: any; level?: string; subLevel?: string }[]) {
        const logs = data.map(d => ({
            studentId: d.studentId,
            teacherId: d.teacherId,
            subjectId: d.subjectId,
            date: new Date(d.date),
            scores: d.scores,
            level: d.level,
            subLevel: d.subLevel,
        }));
        return this.evaluationLogModel.insertMany(logs);
    }
}
