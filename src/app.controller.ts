import { Controller, Get, Param, Res } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('grades/certificate-image/:filename')
  async getCertificateImage(@Param('filename') filename: string, @Res() res: any) {
    const path = require('path');
    const safeFilename = path.basename(filename);
    const uploadDir = path.join(process.cwd(), 'uploads', 'certificates');
    if (!require('fs').existsSync(path.join(uploadDir, safeFilename))) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    return res.sendFile(safeFilename, { root: uploadDir });
  }
}
