import { Controller, Get, Post, Body, Param, UseGuards, Delete, Patch } from '@nestjs/common';
import { GradesService } from './grades.service';
import { RequireAuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('grades')
@UseGuards(RequireAuthGuard)
export class GradesController {
  constructor(private readonly gradesService: GradesService) { }

  @Get('my-grades')
  async getMyGrades(@CurrentUser() user: any) {
    return this.gradesService.getStudentGrades(user._id || user.id || user.uid);
  }

  @Get('student/:studentId')
  async getStudentGrades(@Param('studentId') studentId: string) {
    return this.gradesService.getStudentGrades(studentId);
  }

  @Get()
  async getAllGrades() {
    return this.gradesService.findAll();
  }

  // Init grade record if not exists
  @Post('init')
  async initGrade(@Body() body: { studentId: string; subjectId: string; subjectName: string }, @CurrentUser() user: any) {
    return this.gradesService.createOrGetGrade(body.studentId, body.subjectId, body.subjectName, user._id || user.id);
  }

  @Post('sheet')
  async addSheet(@Body() body: { studentId: string; subjectId: string; name: string; config: string }) {
    console.log('Adding Sheet:', body);
    return this.gradesService.addSheet(body.studentId, body.subjectId, body.name, body.config);
  }

  @Post('score')
  async saveScore(@Body() body: { studentId: string; subjectId: string; sheetName: string; key: string; value: any }) {
    return this.gradesService.saveScore(body.studentId, body.subjectId, body.sheetName, body.key, body.value);
  }

  @Delete('sheet')
  async deleteSheet(@Body() body: { studentId: string; subjectId: string; sheetName: string }) {
    return this.gradesService.deleteSheet(body.studentId, body.subjectId, body.sheetName);
  }

  @Post('batch-sheet')
  async batchAddSheet(@Body() body: { studentIds: string[]; subjectId: string; subjectName: string; name: string; maxScore: number }, @CurrentUser() user: any) {
    return this.gradesService.batchAddSheet(body.studentIds, body.subjectId, body.subjectName, body.name, body.maxScore, user._id || user.id);
  }

  @Patch('sheet-data') // Using Patch/Put. Service method `updateSheetData`.
  @Post('sheet-data') // Controller in Frontend calls POST or PUT? Previous code used PUT. I'll bind PUT.
  async updateSheetDataPost(@Body() body: any) {
    // Fallback for Post if needed
    return this.gradesService.updateSheetData(body.studentId, body.subjectId, body.sheetName, body.data);
  }

  @Get('sheet-data') // Just in case
  async nothing() { return "OK"; }

  // Proper PUT mapping
  @UseGuards(RequireAuthGuard)
  @Patch('sheet-data') // I'll use PATCH logic
  async updateSheetData(@Body() body: { studentId: string; subjectId: string; sheetName: string; data: any }) {
    return this.gradesService.updateSheetData(body.studentId, body.subjectId, body.sheetName, body.data);
  }

  @Post('finalize')
  async finalizeGrade(@Body() body: {
    studentId: string;
    subjectId: string;
    subjectName: string;
    finalGrade: string;
    teacherRemark: string;
    certificateImage?: string;
    level?: string;
    subLevel?: string;
  }, @CurrentUser() user: any) {
    return this.gradesService.finalizeGrade(
      body.studentId,
      body.subjectId,
      body.subjectName,
      body.finalGrade,
      body.teacherRemark,
      user._id || user.id,
      body.certificateImage,
      body.level,
      body.subLevel
    );
  }

  // ── Dynamic Grading Engine ─────────────────────────

  /** POST /grades/structure - Create or update grade structure (columns & mapping) */
  @Post('structure')
  async saveStructure(@Body() body: {
    subjectId: string;
    classId: string;
    columns: { id: string; title: string; maxScore: number; weight: number }[];
    gradeMapping?: Record<string, number>;
  }, @CurrentUser() user: any) {
    const teacherId = user._id || user.id;
    return this.gradesService.saveGradeStructure(teacherId, body.subjectId, body.classId, body.columns, body.gradeMapping);
  }

  /** GET /grades/gradebook/:subjectId?classId= - Get full gradebook for a subject */
  @Get('gradebook/:subjectId')
  async getGradebook(
    @Param('subjectId') subjectId: string,
    @CurrentUser() user: any,
  ) {
    // classId can come via query; for now extract from query string manually or use @Query
    return this.gradesService.getGradebook(subjectId, user._id || user.id);
  }

  /** PATCH /grades/bulk-scores - Bulk save raw scores for multiple students */
  @Patch('bulk-scores')
  async bulkSaveScores(@Body() body: {
    subjectId: string;
    classId: string;
    entries: { studentId: string; scores: Record<string, number> }[];
  }, @CurrentUser() user: any) {
    const teacherId = user._id || user.id;
    return this.gradesService.bulkSaveScores(teacherId, body.subjectId, body.classId, body.entries);
  }

  /** GET /grades/certificates/manage - All certificates issued (for admin) */
  @Get('certificates/manage')
  async getAllCertificates() {
    return this.gradesService.getAllCertificates();
  }

  /** DELETE /grades/:gradeId/certificate - Remove certificate from a grade */
  @Delete(':gradeId/certificate')
  async removeCertificate(@Param('gradeId') gradeId: string) {
    return this.gradesService.removeCertificate(gradeId);
  }
}

