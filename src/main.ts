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

    // DEBUG: Log every request to see if it reaches the app
    app.use((req: any, res: any, next: any) => {
      console.log(`[INCOMING REQUEST] ${req.method} ${req.url} | Origin: ${req.headers.origin}`);
      next();
    });

    // Enable CORS - Permissive Debug Mode
    app.enableCors({
      origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
        console.log(`[CORS CHECK] Origin: ${origin}`);
        callback(null, true); // ALLOW ALL FOR DEBUGGING
      },
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With', 'Origin', 'Access-Control-Allow-Origin'],
      preflightContinue: false,
      optionsSuccessStatus: 204,
      exposedHeaders: ['Set-Cookie'],
    });
    console.log('CORS Enabled (Permissive Mode).');

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
