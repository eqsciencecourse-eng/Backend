import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report, ReportDocument } from './schemas/report.schema';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    private firebaseService: FirebaseService,
  ) {}

  async create(
    userId: string,
    userName: string,
    message: string,
  ): Promise<Report> {
    const newReport = new this.reportModel({ userId, userName, message });
    return newReport.save();
  }

  async findAll(): Promise<Report[]> {
    return this.reportModel.find().sort({ createdAt: -1 }).exec();
  }

  async findByUser(userId: string): Promise<Report[]> {
    return this.reportModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async reply(id: string, reply: string): Promise<Report | null> {
    const report = await this.reportModel.findByIdAndUpdate(
      id,
      {
        status: 'replied',
        adminReply: reply,
        repliedAt: new Date(),
      },
      { new: true },
    );

    if (report) {
      // Notify user via Firebase
      const db = this.firebaseService.getDatabase();
      await db.ref(`notifications/users/${report.userId}`).push({
        type: 'report-reply',
        reportId: report._id.toString(),
        message: 'Admin replied to your report',
        timestamp: new Date().toISOString(),
        read: false,
      });
    }

    return report;
  }
}
