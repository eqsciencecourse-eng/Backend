import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { GradeSummaryService } from './grades-summary.service';
import { RequireAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('grades/summary')
@UseGuards(RequireAuthGuard, RolesGuard)
export class GradeSummaryController {
    constructor(private readonly summaryService: GradeSummaryService) { }

    @Get('student/:id')
    @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.STUDENT)
    getStudentSummary(@Param('id') id: string) {
        return this.summaryService.getStudentSummary(id);
    }

    @Get('me')
    @Roles(UserRole.STUDENT)
    getMySummary(@CurrentUser() user: any) {
        return this.summaryService.getStudentSummary(user._id || user.id);
    }
}
