import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
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
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) { // Also allow preview deployments
        // console.log(`Allowed CORS for: ${origin}`);
        callback(null, true);
      } else {
        console.warn(`Blocked by CORS: ${origin}`);
        // Avoid throwing error to prevent 502 crashes, just disable CORS for this request
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With', 'Origin', 'Access-Control-Allow-Origin'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    exposedHeaders: ['Set-Cookie'],
  });

  // Middleware to set Cross-Origin-Opener-Policy for Google Login Popup
  app.use((req: any, res: any, next: any) => {
    res.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
  });

  // Increase payload limit
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

  // Use PORT from environment or default to 4000
  // Railway provides the PORT environment variable.
  const port = parseInt(process.env.PORT || '4000', 10);

  await app.listen(port, '0.0.0.0');

  console.log(`Application is running on: http://0.0.0.0:${port}`);
  console.log(`CORS enabled for origins: ${allowedOrigins.join(', ')}`);
  console.log('🚀 Server Starting... (Excel Auto-Import DISABLED - MANUAL API MODE) 🚀');
  console.log(`--- FORCE DEPLOY: FIXED CORS CRASH (Port: ${port}) ---`);
}
bootstrap();
