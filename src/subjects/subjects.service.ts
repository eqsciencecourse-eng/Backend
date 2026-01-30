import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subject, SubjectDocument } from './schemas/subject.schema';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectModel(Subject.name) private subjectModel: Model<SubjectDocument>,
  ) { }

  async create(name: string): Promise<Subject> {
    const createdSubject = new this.subjectModel({ name });
    return createdSubject.save();
  }

  async findAll(): Promise<Subject[]> {
    return this.subjectModel.find().exec();
  }

  async delete(id: string): Promise<any> {
    return this.subjectModel.findByIdAndDelete(id).exec();
  }

  async update(id: string, name: string): Promise<Subject | null> {
    return this.subjectModel.findByIdAndUpdate(id, { name }, { new: true }).exec();
  }

  // Initialize default subjects if empty
  async onModuleInit() {
    const count = await this.subjectModel.countDocuments();
    if (count === 0) {
      const defaultSubjects = [
        'IOT', 'Arduino R4', 'Roblox for creator', 'Python', 'Python Online',
        'Mini Web', 'Scratch', 'Microbit', 'Javascripts', 'Scratch AI',
        'Microbit Game', 'Data Science',
      ];
      for (const name of defaultSubjects) {
        await this.create(name);
      }
      console.log('Default subjects initialized');
    }

    // Seed Scratch Levels
    const scratch = await this.subjectModel.findOne({ name: 'Scratch' });
    if (scratch && (!scratch.levels || scratch.levels.length === 0)) {
      scratch.levels = [
        { name: 'Basic', subLevels: ['1', '1.1', '1.2', '1.3', '1.4', '1.5'] },
        { name: 'Intermediate', subLevels: ['1', '2', '3'] },
        { name: 'Advance', subLevels: ['1', '2', '3'] }
      ];
      await scratch.save();
      console.log('Scratch levels initialized');
    }
  }
}
