import { Controller, Post, Body, Get, Param, Query, UseGuards } from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';

@Controller('evaluations')
export class EvaluationsController {
    constructor(private readonly evaluationsService: EvaluationsService) { }

    @Post()
    async createEvaluation(@Body() body: any) {
        // body expected: { studentId, teacherId, subjectId, date, scores: { ... } }
        return this.evaluationsService.createLog(body);
    }

    @Get('student/:id/summary')
    async getStudentSummary(@Param('id') studentId: string) {
        return this.evaluationsService.getStudentSummary(studentId);
    }

    @Get('student/:id/history')
    async getStudentHistory(@Param('id') studentId: string, @Query('subjectId') subjectId: string) {
        return this.evaluationsService.getStudentHistory(studentId, subjectId);
    }
}
