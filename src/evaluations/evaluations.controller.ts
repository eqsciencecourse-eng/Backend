import { Controller, Post, Body, Get, Param, Query, UseGuards, Put, Delete } from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';
import { RequireAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('evaluations')
export class EvaluationsController {
    constructor(private readonly evaluationsService: EvaluationsService) { }

    @Post()
    async createEvaluation(@Body() body: any) {
        return this.evaluationsService.createLog(body);
    }

    @Put(':id')
    async updateEvaluation(@Param('id') id: string, @Body() body: any) {
        return this.evaluationsService.updateLog(id, body);
    }

    @Delete(':id')
    async deleteEvaluation(@Param('id') id: string) {
        return this.evaluationsService.deleteLog(id);
    }

    @Get('student/:id/summary')
    async getStudentSummary(@Param('id') studentId: string) {
        return this.evaluationsService.getStudentSummary(studentId);
    }

    @Get('student/:id/history')
    async getStudentHistory(@Param('id') studentId: string, @Query('subjectId') subjectId: string) {
        return this.evaluationsService.getStudentHistory(studentId, subjectId);
    }

    @Get('subject/:subjectId/status')
    @UseGuards(RequireAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    async getSubjectEvaluationStatus(@Param('subjectId') subjectId: string) {
        return this.evaluationsService.getSubjectEvaluationStatus(subjectId);
    }

    @Post('batch')
    @UseGuards(RequireAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    async batchCreate(@Body() body: { logs: { studentId: string; teacherId: string; subjectId: string; date: string; scores: any; level?: string; subLevel?: string }[] }) {
        return this.evaluationsService.batchCreateLogs(body.logs);
    }
}
