import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { School, SchoolDocument } from './schemas/school.schema';
import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';

@Injectable()
export class SchoolsService implements OnModuleInit {
  constructor(
    @InjectModel(School.name) private schoolModel: Model<SchoolDocument>,
  ) { }

  async onModuleInit() {
    // 1. Try to import from Excel first (Priority)
    await this.importFromExcel();

    // 2. Fetch Universities from GitHub
    await this.fetchUniversities();

    // 3. Seed initial data if empty and no Excel found
    const count = await this.schoolModel.countDocuments();
    if (count === 0) {
      console.log('Seeding schools data...');
      await this.seedSchools();
    }
  }

  async search(query: string) {
    if (!query) return [];
    // Limit results to 20 for performance
    return this.schoolModel
      .find({
        name: { $regex: query, $options: 'i' },
      })
      .limit(20)
      .exec();
  }

  private async importFromExcel() {
    const cwd = process.cwd();
    console.log('Current Working Directory:', cwd);

    // Potential paths to check
    const possiblePaths = [
      'a:\\EqsciProject\\backend\\src\\schools\\school65.xlsx', // User's new location (Image)
      path.join(cwd, 'src', 'schools', 'school65.xlsx'), // Source location
      'a:\\EqsciProject\\backend\\school65.xlsx', // Previous location (Backup)
      path.join(cwd, 'school65.xlsx'), // Root (Standard)
      path.join(cwd, 'backend', 'school65.xlsx'), // Monorepo root
      path.join(__dirname, '..', '..', '..', 'school65.xlsx'), // From dist/src/schools/
      path.join(__dirname, 'school65.xlsx'), // Same dir (if copied to dist)
      path.resolve('school65.xlsx'), // Resolve from current
    ];

    let filePath = '';
    console.log('--- Debugging School Import ---');
    for (const p of possiblePaths) {
      const exists = fs.existsSync(p);
      console.log(`Checking [${exists ? 'FOUND' : 'MISSING'}] path: ${p}`);
      if (exists) {
        filePath = p;
        break;
      }
    }
    console.log('-------------------------------');

    if (filePath) {
      console.log('Found school65.xlsx at:', filePath);
      try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet) as unknown[]; // Explicitly cast to unknown[] first if needed, but likely it returns unknown[] already

        console.log(`Processing ${data.length} rows from Excel...`);
        let importedCount = 0;

        // Interface for Row Data
        interface SchoolRow {
          'ชื่อสถานศึกษา'?: string;
          'ชื่อโรงเรียน'?: string;
          'โรงเรียน'?: string;
          'สถานศึกษา'?: string;
          'School Name'?: string;
          'จังหวัด'?: string;
          'Province'?: string;
          'อำเภอ'?: string;
          'District'?: string;
          'ตำบล'?: string;
          'Subdistrict'?: string;
          'สังกัด'?: string;
          [key: string]: unknown;
        }

        for (const rawRow of data) {
          const row = rawRow as SchoolRow;
          // Mapping columns based on common Thai OBEC headers
          const name =
            row['ชื่อสถานศึกษา'] ||
            row['ชื่อโรงเรียน'] ||
            row['โรงเรียน'] ||
            row['สถานศึกษา'] ||
            row['School Name'];
          if (!name) continue;

          const province = row['จังหวัด'] || row['Province'] || 'ไม่ระบุ';
          const district = row['อำเภอ'] || row['District'] || 'ไม่ระบุ';
          const subdistrict = row['ตำบล'] || row['Subdistrict'] || 'ไม่ระบุ';
          const school_type = row['สังกัด'] || 'สพฐ.';

          // Upsert to update existing or insert new
          await this.schoolModel.updateOne(
            { name: name },
            {
              name,
              province,
              district,
              subdistrict,
              school_type,
            },
            { upsert: true },
          );
          importedCount++;
        }
        console.log(
          `Successfully imported ${importedCount} schools from school65.xlsx`,
        );
      } catch (error) {
        console.error('Error importing Excel file:', error);
      }
    } else {
      console.log(
        'school65.xlsx not found in any common location. Please place it in the backend root folder.',
      );
    }
  }

  private async fetchUniversities() {
    try {
      console.log('Fetching universities from GitHub...');
      const response = await fetch(
        'https://raw.githubusercontent.com/t6tg/thai-university/master/universities.json',
      );
      if (response.ok) {
        const universities = await response.json();
        let uniCount = 0;
        for (const uni of universities) {
          // universities.json format: { name: "..." } or similar
          const name = uni.name?.th || uni.name;
          if (!name) continue;

          await this.schoolModel.updateOne(
            { name: name },
            {
              name,
              province: 'Many', // Universities might have multiple campuses
              school_type: 'University',
            },
            { upsert: true },
          );
          uniCount++;
        }
        console.log(`Imported ${uniCount} universities.`);
      }
    } catch (error) {
      console.error('Failed to fetch universities:', error);
    }
  }

  async seedSchools() {
    const schools = [
      {
        name: 'โรงเรียนเตรียมอุดมศึกษา',
        province: 'กรุงเทพมหานคร',
        district: 'ปทุมวัน',
        school_type: 'สพฐ.',
      },
      {
        name: 'โรงเรียนสวนกุหลาบวิทยาลัย',
        province: 'กรุงเทพมหานคร',
        district: 'พระนคร',
        school_type: 'สพฐ.',
      },
      {
        name: 'โรงเรียนบดินทรเดชา (สิงห์ สิงหเสนี)',
        province: 'กรุงเทพมหานคร',
        district: 'วังทองหลาง',
        school_type: 'สพฐ.',
      },
      {
        name: 'โรงเรียนมหิดลวิทยานุสรณ์',
        province: 'นครปฐม',
        district: 'พุทธมณฑล',
        school_type: 'องค์กรมหาชน',
      },
      {
        name: 'โรงเรียนสามเสนวิทยาลัย',
        province: 'กรุงเทพมหานคร',
        district: 'พญาไท',
        school_type: 'สพฐ.',
      },
      {
        name: 'โรงเรียนบุญวาทย์วิทยาลัย',
        province: 'ลำปาง',
        district: 'เมืองลำปาง',
        school_type: 'สพฐ.',
      },
      {
        name: 'โรงเรียนหาดใหญ่วิทยาลัย',
        province: 'สงขลา',
        district: 'หาดใหญ่',
        school_type: 'สพฐ.',
      },
      {
        name: 'โรงเรียนขอนแก่นวิทยายน',
        province: 'ขอนแก่น',
        district: 'เมืองขอนแก่น',
        school_type: 'สพฐ.',
      },
      {
        name: 'โรงเรียนยุพราชวิทยาลัย',
        province: 'เชียงใหม่',
        district: 'เมืองเชียงใหม่',
        school_type: 'สพฐ.',
      },
      {
        name: 'โรงเรียนระยองวิทยาคม',
        province: 'ระยอง',
        district: 'เมืองระยอง',
        school_type: 'สพฐ.',
      },
      {
        name: 'โรงเรียนวัดป่าประดู่',
        province: 'ระยอง',
        district: 'เมืองระยอง',
        school_type: 'สพฐ.',
      },
      {
        name: 'โรงเรียนอนุบาลระยอง',
        province: 'ระยอง',
        district: 'เมืองระยอง',
        school_type: 'สพฐ.',
      },
      {
        name: 'โรงเรียนมัธยมตากสินระยอง',
        province: 'ระยอง',
        district: 'เมืองระยอง',
        school_type: 'อปท.',
      },
      // Add more as needed or implement full import
    ];

    await this.schoolModel.insertMany(schools);
    console.log('Schools seeded successfully');
  }
}
