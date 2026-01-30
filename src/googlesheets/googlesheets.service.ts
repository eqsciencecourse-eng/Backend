import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { UsersService } from '../users/users.service';

@Injectable()
export class GoogleSheetsService {
  constructor(private readonly usersService: UsersService) {}

  async syncUsersToSheet() {
    try {
      const users = await this.usersService.findAll();

      // Note: This requires GOOGLE_APPLICATION_CREDENTIALS in .env
      // pointing to a service account JSON file
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;

      if (!spreadsheetId) {
        console.warn('GOOGLE_SHEET_ID not set');
        return;
      }

      const rows = users.map((user) => [
        user.displayName,
        user.email,
        user.role,
        user.studentClass || '-',
        user.studentName || '-',
        user.parentName || '-',
        user.enrolledSubjects.join(', '),
        user.studyTimes.join(', '),
        user.createdAt,
      ]);

      // Add header
      rows.unshift([
        'Display Name',
        'Email',
        'Role',
        'Class',
        'Student Name',
        'Parent Name',
        'Subjects',
        'Study Times',
        'Created At',
      ]);

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Users!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: rows,
        },
      });

      return { success: true, count: users.length };
    } catch (error) {
      console.error('Error syncing to Google Sheets:', error);
      throw error;
    }
  }
}
