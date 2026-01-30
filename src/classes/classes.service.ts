import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Class, ClassDocument } from './schemas/class.schema';
import {
  ClassRequest,
  ClassRequestDocument,
} from './schemas/class-request.schema';
import { UsersService } from '../users/users.service';
import { FirebaseService } from '../firebase/firebase.service';
import { UserRole } from '../users/schemas/user.schema';

@Injectable()
export class ClassesService {
  constructor(
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(ClassRequest.name)
    private classRequestModel: Model<ClassRequestDocument>,
    private usersService: UsersService,
    private firebaseService: FirebaseService,
  ) { }

  async create(createClassDto: any): Promise<Class> {
    const createdClass = new this.classModel(createClassDto);
    return createdClass.save();
  }

  async findAll(): Promise<Class[]> {
    return this.classModel.find().populate('advisor', 'displayName email').exec();
  }

  async findOne(id: string): Promise<Class | null> {
    return this.classModel.findById(id).populate('advisor', 'displayName email').exec();
  }

  async update(id: string, updateClassDto: any): Promise<Class | null> {
    return this.classModel
      .findByIdAndUpdate(id, updateClassDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<any> {
    return this.classModel.findByIdAndDelete(id).exec();
  }

  // --- Class Request Logic ---

  async createRequest(dto: {
    studentId: string;
    studentName: string;
    subjectName: string;
    studyTime: string;
    parentPhone: string;
  }) {
    const newRequest = new this.classRequestModel({
      ...dto,
      status: 'pending',
    });
    const savedRequest = await newRequest.save();

    await this.notifyAdmins('new-class-request', {
      studentId: dto.studentId,
      studentName: dto.studentName,
      subjectName: dto.subjectName,
      studyTime: dto.studyTime,
      requestId: savedRequest._id,
      link: '/dashboard/admin?tab=users', // Direct admin to users tab where requests are
    });

    return savedRequest;
  }

  async getPendingRequests() {
    return this.classRequestModel
      .find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .exec();
  }

  async approveRequest(requestId: string, adminId: string) {
    const request = await this.classRequestModel.findById(requestId);
    if (!request) throw new NotFoundException('Request not found');

    if (request.status !== 'pending') return request;

    request.status = 'approved';
    request.actionBy = adminId;
    await request.save();

    // Add/Update class to user's registeredClasses
    const user = await this.usersService.findOne(request.studentId);
    if (user) {
      let currentClasses = user.registeredClasses || [];

      // Migration Logic: If registeredClasses is empty but we have legacy data, populate it first
      if (currentClasses.length === 0 && user.enrolledSubjects && user.enrolledSubjects.length > 0) {
        currentClasses = user.enrolledSubjects.map((subject, index) => ({
          className: subject,
          classTime: user.studyTimes?.[index] || '',
        }));
      }

      const newClass = {
        className: request.subjectName,
        classTime: request.studyTime,
      };

      // Check if class with same name exists (Upsert Logic)
      // Note: check for _id if available, or name strictly
      const existingClassIndex = currentClasses.findIndex(
        (c: any) => c.className === newClass.className
      );

      if (existingClassIndex !== -1) {
        // Update existing class time
        // Mongoose array might behave differently, so we clone logic if generic array
        // But doing direct assignment on object inside array usually works if we save 'registeredClasses' as a whole
        currentClasses[existingClassIndex].classTime = newClass.classTime;
      } else {
        // Add new class
        currentClasses.push(newClass);
      }

      // Sync Back to Legacy Fields (for Teacher Dashboard & other views)
      const updatedEnrolledSubjects = currentClasses.map(c => c.className);
      const updatedStudyTimes = currentClasses.map(c => c.classTime);

      await this.usersService.update(user._id.toString(), {
        registeredClasses: currentClasses,
        enrolledSubjects: updatedEnrolledSubjects,
        studyTimes: updatedStudyTimes
      } as any);
    }
    return request;
  }

  async rejectRequest(requestId: string, adminId: string) {
    const request = await this.classRequestModel.findById(requestId);
    if (!request) throw new NotFoundException('Request not found');

    request.status = 'rejected';
    request.actionBy = adminId;
    return request.save();
  }

  private async notifyAdmins(type: string, data: any) {
    try {
      const admins = await this.usersService.findByRole(UserRole.ADMIN);
      const db = this.firebaseService.getDatabase();

      const notifications = admins.map((admin) =>
        db.ref(`notifications/users/${(admin as any)._id}`).push({
          type,
          ...data,
          timestamp: new Date().toISOString(),
          read: false,
        }),
      );

      await Promise.all(notifications);
    } catch (error) {
      console.error('Failed to notify admins:', error);
    }
  }
}
