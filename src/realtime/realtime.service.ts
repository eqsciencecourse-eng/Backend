import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import * as admin from 'firebase-admin';

@Injectable()
export class RealtimeService {
  private db: admin.database.Database;

  constructor(private firebaseService: FirebaseService) {
    this.db = this.firebaseService.getDatabase();
  }

  async notifyAdmin(type: string, data: any) {
    try {
      const ref = this.db.ref('notifications/admin');
      await ref.push({
        type,
        data,
        timestamp: admin.database.ServerValue.TIMESTAMP,
      });
    } catch (error) {
      console.error('Failed to notify admin:', error);
    }
  }

  async notifyUser(userId: string, type: string, data: any) {
    try {
      const ref = this.db.ref(`notifications/users/${userId}`);
      await ref.push({
        type,
        data,
        timestamp: admin.database.ServerValue.TIMESTAMP,
      });
    } catch (error) {
      console.error(`Failed to notify user ${userId}:`, error);
    }
  }

  async updateSchedule(teacherId: string, scheduleData: any) {
    try {
      const ref = this.db.ref(`schedules/${teacherId}`);
      await ref.set(scheduleData);
    } catch (error) {
      console.error(`Failed to update schedule for ${teacherId}:`, error);
    }
  }

  async broadcast(path: string, data: any) {
    try {
      const ref = this.db.ref(path);
      await ref.set(data);
    } catch (error) {
      console.error(`Failed to broadcast to ${path}:`, error);
    }
  }
}
