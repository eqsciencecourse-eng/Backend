import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  constructor(private configService: ConfigService) {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      console.warn(
        'Firebase credentials not found. Firebase Admin not initialized.',
      );
      return;
    }

    if (!admin.apps.length) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          databaseURL: `https://eq-app-72f5b-default-rtdb.asia-southeast1.firebasedatabase.app/`,
        });
        console.log('Firebase Admin Initialized');
      } catch (error) {
        console.error('Firebase Admin Initialization Error:', error);
      }
    } else {
      console.log('Firebase Admin already initialized');
    }
  }

  onModuleInit() {
    // Initialization moved to constructor
  }

  getAuth() {
    return admin.auth();
  }

  getDatabase() {
    return admin.database();
  }
}
