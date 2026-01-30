
import { Controller, Get, Post, Body, UseGuards, Request, Query, Patch, Delete, Param } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { RequireAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('attendance')
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) { }

    @UseGuards(RequireAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @Post()
    create(@Body() createAttendanceDto: CreateAttendanceDto, @Request() req: any) {
        return this.attendanceService.create(createAttendanceDto, req.user);
    }

    @UseGuards(RequireAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @Get('teacher')
    findAllByTeacher(@Request() req: any) {
        return this.attendanceService.findAllByTeacher(req.user);
    }

    @UseGuards(RequireAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @Get('check')
    checkAttendance(
        @Query('subjectId') subjectId: string,
        @Query('date') date: string
    ) {
        return this.attendanceService.findBySubjectAndDate(subjectId, date);
    }

    @UseGuards(RequireAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @Get('all')
    findAll(@Query('subjectId') subjectId: string, @Request() req: any) {
        const teacherId = req.user.role === UserRole.ADMIN ? undefined : req.user._id;
        return this.attendanceService.findAll(subjectId, teacherId);
    }

    @UseGuards(RequireAuthGuard)
    @Get('my-history')
    getMyHistory(@Request() req: any) {
        return this.attendanceService.findByStudentId(req.user._id);
    }

    @UseGuards(RequireAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @Post('qr/generate')
    generateQr(@Body() body: { subjectId: string; subjectName: string; date: string; time: string }, @Request() req: any) {
        return this.attendanceService.generateQrToken({
            teacherId: req.user._id,
            ...body
        });
    }

    @UseGuards(RequireAuthGuard, RolesGuard)
    @Roles(UserRole.STUDENT)
    qrCheckIn(@Body() body: { token: string }, @Request() req: any) {
        return this.attendanceService.processQrCheckIn(body.token, req.user);
    }

    @UseGuards(RequireAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @Patch(':id') // Changed to PATCH to match generic Rest convention, though PUT usually full replace
    update(@Param('id') id: string, @Body() createAttendanceDto: CreateAttendanceDto, @Request() req: any) {
        return this.attendanceService.update(id, createAttendanceDto, req.user);
    }

    @UseGuards(RequireAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @Delete(':id') // Changed to Delete
    remove(@Param('id') id: string, @Request() req: any, @Query('studentId') studentId?: string) {
        return this.attendanceService.delete(id, req.user, studentId);
    }
    @UseGuards(RequireAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @Post('sync-quotas')
    recalculateQuotas() {
        return this.attendanceService.recalculateAllQuotas();
    }

    @UseGuards(RequireAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Post('sanitize')
    sanitizeSystem() {
        return this.attendanceService.sanitizeSystem();
    }

    // [RECOVERY] Reconstruct Attendance Docs from Student Profiles
    @Get('recover-history-now')
    // @UseGuards(RequireAuthGuard, RolesGuard)
    // @Roles(UserRole.ADMIN)
    recoverHistory() {
        console.log('Starting Recovery...');
        return this.attendanceService.recoverHistoryFromAllStudents();
    }
}
