import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Grade, GradeDocument } from './schemas/grade.schema';
import { SkillCalculationService } from '../common/services/skill-calculation.service';

@Injectable()
export class GradeSummaryService {
    constructor(
        @InjectModel(Grade.name) private gradeModel: Model<GradeDocument>,
        // private readonly skillCalculationService: SkillCalculationService, // Disabled for now
    ) { }

    async getStudentSummary(studentId: string) {
        // Find all grades for student to aggregate (if we want global summary)
        // OR find grades for all subjects.

        // [TODO]: Re-implement summary logic based on new "sheets" structure if needed.
        // For now, return 0 to fix build.

        const grades = await this.gradeModel.find({ studentId }).exec();

        // Aggregate over all subjects
        let totalXP = 0;
        const skillBreakdown: Record<string, number> = {};

        // grades.forEach(grade => {
        //     // Calculate XP for this subject
        //     const subjectXP = this.skillCalculationService.calculateAccumulatedXP(grade.skillHistory);
        //     totalXP += subjectXP;

        //     // Breakdown
        //     const subjectBreakdown = this.skillCalculationService.calculateSkillBreakdown(grade.skillHistory);
        //     Object.entries(subjectBreakdown).forEach(([key, val]) => {
        //         skillBreakdown[key] = (skillBreakdown[key] || 0) + val;
        //     });
        // });

        return {
            studentId,
            totalXP: 0,
            skills: {},
            level: 1,
            subjectCount: grades.length,
            lastUpdated: new Date()
        };
    }

    private calculateLevel(xp: number): number {
        // Simple formula: Level 1 + (XP / 100)
        return Math.floor(1 + (xp / 100));
    }
}
