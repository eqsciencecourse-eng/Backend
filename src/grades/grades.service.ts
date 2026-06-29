import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Grade, GradeDocument } from './schemas/grade.schema';
import { GradeStructure, GradeStructureDocument } from './schemas/grade-structure.schema';
import { StudentGrade, StudentGradeDocument } from './schemas/student-grade.schema';

@Injectable()
export class GradesService {
  constructor(
    @InjectModel(Grade.name) private gradeModel: Model<GradeDocument>,
    @InjectModel(GradeStructure.name) private gradeStructureModel: Model<GradeStructureDocument>,
    @InjectModel(StudentGrade.name) private studentGradeModel: Model<StudentGradeDocument>,
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

  async finalizeGrade(studentId: string, subjectId: string, subjectName: string, finalGrade: string, remark: string, teacherId: string, certificateImage?: string, level?: string, subLevel?: string) {
    const query: any = { studentId, subjectId };
    if (level) query.level = level;
    if (subLevel) query.subLevel = subLevel;
    let grade = await this.gradeModel.findOne(query);

    if (!grade) {
      grade = new this.gradeModel({
        studentId,
        subjectId,
        subjectName,
        teacherId,
        sheets: []
      });
    }

    grade.isComplete = true;
    grade.finalGrade = finalGrade;
    grade.teacherRemark = remark;
    grade.certificateIssuedAt = new Date();

    if (level) grade.level = level;
    if (subLevel) grade.subLevel = subLevel;

    if (certificateImage) {
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(process.cwd(), 'uploads', 'certificates');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filename = `${studentId}_${subjectId}_${Date.now()}.jpg`;
      const base64Data = certificateImage.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);
      grade.certificateURL = filename;
    }

    return grade.save();
  }

  // ──────────────────────────────────────────────────
  // DYNAMIC GRADING ENGINE
  // ──────────────────────────────────────────────────

  /** Save or update the grade structure (columns + grade mapping) for a subject */
  async saveGradeStructure(
    teacherId: string,
    subjectId: string,
    classId: string,
    columns: { id: string; title: string; maxScore: number; weight: number }[],
    gradeMapping?: Record<string, number>,
  ) {
    const existing = await this.gradeStructureModel.findOne({ teacherId, subjectId, classId: classId || null });
    const defaultMapping = { A: 80, 'B+': 75, B: 70, 'C+': 65, C: 60, 'D+': 55, D: 50, F: 0 };

    if (existing) {
      existing.columns = columns as any;
      if (gradeMapping) existing.gradeMapping = gradeMapping;
      return existing.save();
    }

    return this.gradeStructureModel.create({
      teacherId,
      subjectId,
      classId: classId || null,
      columns,
      gradeMapping: gradeMapping || defaultMapping,
    });
  }

  /** Get full gradebook: structure + all student scores with calculated results */
  async getGradebook(subjectId: string, teacherId: string, classId?: string) {
    const query: any = { subjectId, teacherId };
    if (classId && classId !== 'all') query.classId = classId;

    const structure = await this.gradeStructureModel.findOne(query).lean();
    const studentGrades = await this.studentGradeModel.find(query).lean();

    const columns = structure?.columns || [];
    const gradeMapping = structure?.gradeMapping || { A: 80, B: 70, C: 60, D: 50, F: 0 };

    // Calculate results for each student grade entry
    const enrichedGrades = studentGrades.map(sg => {
      const { totalPercent, grade } = this.calculateGrade(sg.scores || {}, columns as any, gradeMapping);
      return { ...sg, totalPercent, calculatedGrade: grade };
    });

    return { structure, studentGrades: enrichedGrades };
  }

  /** Bulk save scores for multiple students at once, auto-calculate grade */
  async bulkSaveScores(
    teacherId: string,
    subjectId: string,
    classId: string,
    entries: { studentId: string; scores: Record<string, number> }[],
  ) {
    // Get the grade structure to calculate grades
    const query: any = { subjectId, teacherId };
    if (classId && classId !== 'all') query.classId = classId;
    const structure = await this.gradeStructureModel.findOne(query).lean();
    const columns = (structure?.columns || []) as any[];
    const gradeMapping = (structure?.gradeMapping || { A: 80, B: 70, C: 60, D: 50, F: 0 }) as Record<string, number>;

    const promises = entries.map(async ({ studentId, scores }) => {
      const { totalPercent, grade } = this.calculateGrade(scores, columns, gradeMapping);
      return this.studentGradeModel.findOneAndUpdate(
        { studentId, teacherId, subjectId, classId: classId || null },
        {
          $set: {
            scores,
            totalPercentage: totalPercent,
            calculatedGrade: grade,
          },
        },
        { upsert: true, new: true },
      );
    });

    return Promise.all(promises);
  }

  async getAllCertificates() {
    return this.gradeModel.find({ certificateURL: { $exists: true, $ne: null } })
      .populate('studentId', 'displayName firstName lastName studentId')
      .sort({ certificateIssuedAt: -1 })
      .exec();
  }

  async removeCertificate(gradeId: string) {
    const grade = await this.gradeModel.findById(gradeId);
    if (!grade) throw new NotFoundException('Grade not found');
    if (!grade.certificateURL) throw new NotFoundException('No certificate on this grade');

    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(process.cwd(), 'uploads', 'certificates', grade.certificateURL);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    grade.set('certificateURL', undefined);
    grade.set('certificateIssuedAt', undefined);
    grade.set('level', undefined);
    grade.set('subLevel', undefined);
    return grade.save();
  }

  /** Pure calculation helper: given raw scores + structure + mapping → percentage + grade */
  private calculateGrade(
    scores: Record<string, number>,
    columns: { id: string; maxScore: number; weight: number }[],
    gradeMapping: Record<string, number>,
  ): { totalPercent: number; grade: string } {
    if (!columns.length) return { totalPercent: 0, grade: '-' };

    const totalWeight = columns.reduce((acc, c) => acc + (c.weight || 0), 0);

    let weightedSum = 0;
    columns.forEach(col => {
      const raw = scores[col.id] ?? 0;
      const pct = col.maxScore > 0 ? (raw / col.maxScore) * 100 : 0;
      weightedSum += pct * ((col.weight || 0) / (totalWeight || 1));
    });

    const totalPercent = Math.round(weightedSum * 100) / 100;

    // Sort grade thresholds descending, pick the first that matches
    const sortedGrades = Object.entries(gradeMapping).sort((a, b) => b[1] - a[1]);
    const grade = sortedGrades.find(([, min]) => totalPercent >= min)?.[0] ?? 'F';

    return { totalPercent, grade };
  }
}

