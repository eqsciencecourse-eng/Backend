import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure Gmail SMTP
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'your-app-password',
      },
    });
  }

  async sendTeacherApprovalRequest(teacherData: {
    displayName: string;
    email: string;
    approvalToken: string;
  }) {
    const approvalLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/approve/${teacherData.approvalToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: '67319010041@technicrayong.ac.th',
      subject: '[School System] ขออนุมัติครูใหม่',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">มีครูลงทะเบียนใหม่</h2>
          <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>ชื่อ:</strong> ${teacherData.displayName}</p>
            <p><strong>อีเมล:</strong> ${teacherData.email}</p>
          </div>
          <p>คลิกปุ่มด้านล่างเพื่ออนุมัติครูท่านนี้:</p>
          <a href="${approvalLink}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            อนุมัติครู
          </a>
          <p style="color: #6B7280; font-size: 14px;">หรือคัดลอกลิงก์นี้: ${approvalLink}</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Approval email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendApprovalConfirmation(teacherEmail: string, teacherName: string) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: teacherEmail,
      subject: '[School System] บัญชีของคุณได้รับการอนุมัติแล้ว',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10B981;">ยินดีด้วย!</h2>
          <p>สวัสดี ${teacherName},</p>
          <p>บัญชีครูของคุณได้รับการอนุมัติแล้ว คุณสามารถเข้าใช้งานระบบได้เลย</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            เข้าสู่ระบบ
          </a>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Confirmation email sent successfully');
    } catch (error) {
      console.error('Error sending confirmation email:', error);
    }
  }
}
