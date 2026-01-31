import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS - ปรับให้รองรับ frontend URL
  // Enable CORS - ปรับให้รองรับ frontend URL
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://192.168.3.88:3000',
    'https://eqsciencecom.vercel.app',
    'https://eq-app-72f5b.web.app',
    'https://eq-app-72f5b.firebaseapp.com'
  ];

  /* 
   * NOTE: CORS Configuration
   * We use a whitelist to allow specific domains with credentials.
   * Wildcards (*) are NOT allowed when credentials: true.
   */
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Set-Cookie'], // Allow frontend to see cookies if needed
  });

  // Middleware to set Cross-Origin-Opener-Policy for Google Login Popup
  app.use((req: any, res: any, next: any) => {
    res.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.header('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
  });

  // Increase payload limit
  const { json, urlencoded } = require('express');
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Global Prefix for API Routes
  app.setGlobalPrefix('api', { exclude: ['/'] });

  // Global Validation Pipe - ตรวจสอบและแปลงข้อมูลอัตโนมัติ
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // ลบ properties ที่ไม่มีใน DTO
      forbidNonWhitelisted: true, // ปฏิเสธ properties ที่ไม่มีใน DTO
      transform: true, // แปลง type อัตโนมัติ
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter - จัดการ errors แบบสม่ำเสมอ
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`CORS enabled for origins: ${allowedOrigins.join(', ')}`);
  console.log('🚀 Server Starting... (Excel Auto-Import DISABLED - MANUAL API MODE) 🚀');
  console.log('--- FORCE DEPLOY: FIXED CORS CRASH ---');
}
bootstrap();
