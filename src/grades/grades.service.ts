import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Grade, GradeDocument } from './schemas/grade.schema';

@Injectable()
export class GradesService {
  constructor(
    @InjectModel(Grade.name) private gradeModel: Model<GradeDocument>,
  ) { }

  async createOrGetGrade(studentId: string, subjectId: string, subjectName: string, teacherId: string) {
    let grade = await this.gradeModel.findOne({ studentId, subjectId });
    if (!grade) {
      grade = new this.gradeModel({
        studentId,
        subjectId,
        subjectName,
        teacherId,
        sheets: []
      });
      await grade.save();
    }
    return grade;
  }

  async getStudentGrades(studentId: string) {
    return this.gradeModel.find({ studentId });
  }

  async addSheet(studentId: string, subjectId: string, name: string, level: string) {
    const grade = await this.gradeModel.findOne({ studentId, subjectId });
    if (!grade) throw new NotFoundException('Grade record not found');

    // Standard Criteria Template
    // Based on user request/image: 12 Items
    const CRITERIA_TEMPLATE = [
      "1. ด้านองค์ความรู้ (Knowledge)",
      "2.1 ความคิดสร้างสรรค์ (Creative)",
      "2.2 วางแผนการทำงาน (Planning)",
      "2.3 การแก้ปัญหา (Solving)",
      "2.4 ปรับปรุงการออกแบบ (Response)",
      "2.5 ทักษะการเขียนโปรแกรม (Code)",
      "2.6 นำเสนอฟลงาน (Present)",
      "2.7 ทักษะทางอารมณ์/สังคม (EQ)",
      "3. ความรับผิดชอบ (Response)",
      "4. การทำงานร่วมกัน (Team)",
      "5. การมีส่วนร่วม (Participate)",
      "6. การตรงต่อเวลา (Punctuality)"
    ];

    // Create the config string that Frontend EvaluationTableTab expects
    // Currently EvaluationTableTab splits by comma to count columns OR we can just pass the list.
    // However, the current frontend implementation of EvaluationTableTab parses "1,10" to number.
    // I need to update Frontend EvaluationTableTab to handle specific column NAMES if I want to display them.
    // BUT for now, let's assume the user wants the standard table. 
    // If I pass a special config string like "TEMPLATE_V1" to frontend, frontend can render these names.
    // OR I can store these names in the 'data' or 'config'.

    // Let's store the actual names in the config field as a serialized JSON or special separated string
    // Updated frontend logic will be needed to parse this.
    // But to match the prompt "Create flexible table", I will send the criteria names joined by pipe or something.

    // If maxScore provided, we can use it.
    // If not, use default template?
    // Let's use the 'config' param more flexibly. If it matches integer, treat as maxScore?
    // Or just store what is passed.

    // Existing logic ignored 'level' param (which was mapped to 'config' in controller).
    // I will change signature to respect input.

    let configString = level;
    if (!configString && CRITERIA_TEMPLATE) {
      configString = CRITERIA_TEMPLATE.join('|');
    }

    grade.sheets.push({
      name,
      config: configString,
      data: {}
    });

    return grade.save();
  }

  // [NEW] Save a score to a specific sheet
  async saveScore(studentId: string, subjectId: string, sheetName: string, key: string, value: any) {
    const grade = await this.gradeModel.findOne({ studentId, subjectId });
    if (!grade) throw new NotFoundException('Grade record not found');

    const sheetIndex = grade.sheets.findIndex(s => s.name === sheetName);
    if (sheetIndex === -1) throw new NotFoundException('Sheet not found');

    // Mongoose Mixed type update requires markModified usually, or careful object manipulation
    // We update the data object
    if (!grade.sheets[sheetIndex].data) {
      grade.sheets[sheetIndex].data = {};
    }

    grade.sheets[sheetIndex].data[key] = value;

    // Key aspect: markModified because sheets is an array of Mixed or subdocs
    grade.markModified('sheets');

    return grade.save();
  }

  async deleteSheet(studentId: string, subjectId: string, sheetName: string) {
    const grade = await this.gradeModel.findOne({ studentId, subjectId });
    if (!grade) throw new NotFoundException('Grade record not found');

    grade.sheets = grade.sheets.filter(s => s.name !== sheetName);
    grade.markModified('sheets');
    return grade.save();
  }

  async findAll() {
    return this.gradeModel.find().exec();
  }

  async batchAddSheet(studentIds: string[], subjectId: string, subjectName: string, name: string, maxScore: number, teacherId: string) {
    const promises = studentIds.map(async (studentId) => {
      let grade = await this.gradeModel.findOne({ studentId, subjectId });
      if (!grade) {
        grade = new this.gradeModel({
          studentId,
          subjectId,
          subjectName,
          teacherId,
          sheets: []
        });
      }

      // Check if sheet exists
      if (!grade.sheets.find(s => s.name === name)) {
        grade.sheets.push({
          name,
          config: maxScore.toString(), // Simplify: Store max score as config for now
          data: {} // { "score": { score: 0 } }
        });
        await grade.save();
      }
    });

    await Promise.all(promises);
    return { success: true, count: studentIds.length };
  }

  async updateSheetData(studentId: string, subjectId: string, sheetName: string, data: any) {
    const grade = await this.gradeModel.findOne({ studentId, subjectId });
    if (!grade) throw new NotFoundException('Grade record not found');

    const sheetIndex = grade.sheets.findIndex(s => s.name === sheetName);
    if (sheetIndex === -1) throw new NotFoundException('Sheet not found');

    grade.sheets[sheetIndex].data = data;
    grade.markModified('sheets');
    return grade.save();
  }
}
