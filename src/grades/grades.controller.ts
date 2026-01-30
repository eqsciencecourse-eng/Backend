import { Controller, Get, Post, Body, Param, UseGuards, Delete, Patch } from '@nestjs/common';
import { GradesService } from './grades.service';
import { RequireAuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('grades')
@UseGuards(RequireAuthGuard)
export class GradesController {
  constructor(private readonly gradesService: GradesService) { }

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
}
