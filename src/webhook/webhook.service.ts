import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { User, UserDocument } from '../users/schemas/user.schema';
import { File, FileDocument } from '../files/schemas/file.schema';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  // Placeholder URLs - User should update these in .env or directly here
  private readonly N8N_WEBHOOK_BASE =
    process.env.N8N_WEBHOOK_BASE || 'https://your-n8n-instance.com/webhook';

  // Specific webhook paths (can be customized)
  private readonly NEW_USER_WEBHOOK = `${this.N8N_WEBHOOK_BASE}/new-user`;
  private readonly NEW_TEACHER_WEBHOOK = `${this.N8N_WEBHOOK_BASE}/new-teacher`;
  private readonly TEACHER_APPROVED_WEBHOOK = `${this.N8N_WEBHOOK_BASE}/teacher-approved`;
  private readonly FILE_SENT_WEBHOOK = `${this.N8N_WEBHOOK_BASE}/file-sent`;

  constructor(private readonly httpService: HttpService) { }

  private async triggerWebhook(url: string, data: any) {
    try {
      if (url.includes('your-n8n-instance.com') || !url.startsWith('http')) {
        this.logger.warn(`Skipping webhook for placeholder/invalid URL: ${url}`);
        return;
      }
      this.logger.log(`Triggering webhook: ${url}`);
      // In a real scenario, we would use post request.
      // Using lastValueFrom to convert Observable to Promise
      await lastValueFrom(this.httpService.post(url, data));
      this.logger.log(`Webhook triggered successfully: ${url}`);
    } catch (error) {
      // Log error but don't stop the application flow
      this.logger.error(`Failed to trigger webhook ${url}: ${error.message}`);
    }
  }

  async triggerNewUser(user: UserDocument | any) {
    await this.triggerWebhook(this.NEW_USER_WEBHOOK, {
      event: 'new_user',
      userId: user._id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      timestamp: new Date().toISOString(),
      studentName: user.studentName,
      parentName: user.parentName,
      school: user.school,
      educationLevel: user.educationLevel,
      class: user.studentClass,
      username: user.username
    });
  }

  async triggerNewTeacher(user: UserDocument | any) {
    await this.triggerWebhook(this.NEW_TEACHER_WEBHOOK, {
      event: 'new_teacher_request',
      userId: user._id,
      email: user.email,
      displayName: user.displayName,
      approvalToken: user.approvalToken,
      timestamp: new Date().toISOString(),
    });
  }

  async triggerTeacherApproved(user: UserDocument | any) {
    await this.triggerWebhook(this.TEACHER_APPROVED_WEBHOOK, {
      event: 'teacher_approved',
      userId: user._id,
      email: user.email,
      displayName: user.displayName,
      approvedBy: user.approvedBy,
      timestamp: new Date().toISOString(),
    });
  }

  async triggerFileSent(file: FileDocument | any, recipientId: string) {
    await this.triggerWebhook(this.FILE_SENT_WEBHOOK, {
      event: 'file_sent',
      fileId: file._id,
      filename: file.originalName,
      uploaderId: file.uploaderId,
      recipientId: recipientId,
      timestamp: new Date().toISOString(),
    });
  }
}
