import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  console.log('Starting NestJS Bootstrap...');

  try {
    const app = await NestFactory.create(AppModule);
    console.log('NestFactory created application.');

    /* 
     * NOTE: CORS Configuration
     * We use a whitelist to allow specific domains with credentials.
     * Wildcards (*) are NOT allowed when credentials: true.
     */
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://eqsciencecom.vercel.app',
      'https://eq-app-72f5b.web.app',
      'https://eq-app-72f5b.firebaseapp.com'
    ];

    app.enableCors({
      origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) { // Also allow preview deployments
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

    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ extended: true, limit: '50mb' }));
    app.setGlobalPrefix('api', { exclude: ['/'] });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());

    // Use PORT from environment or default to 4000
    // Railway provides the PORT environment variable.
    const port = parseInt(process.env.PORT || '4000', 10);
    const host = '0.0.0.0';

    console.log(`Attempting to listen on ${host}:${port}...`);

    await app.listen(port, host);

    console.log(`Application is running on: http://${host}:${port}`);
    console.log('Server successfully started.');
    console.log(`--- FORCE DEPLOY: DEBUGGING 502 (Port: ${port}) ---`);
  } catch (error) {
    console.error('FATAL ERROR during bootstrap:', error);
    process.exit(1);
  }
}
bootstrap();
