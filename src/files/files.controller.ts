import {
  Controller,
  Post,
  Patch,
  UseInterceptors,
  UploadedFile,
  Body,
  Get,
  Param,
  Res,
  BadRequestException,
  Query,
  UploadedFiles,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { FilesService } from './files.service';
import { v4 as uuidv4 } from 'uuid';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('uploaderId') uploaderId: string,
    @Body('recipientId') recipientId: string,
    @Body('folderId') folderId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.filesService.uploadFile(
      file,
      uploaderId,
      recipientId,
      folderId,
    );
  }

  @Post('bulk-send')
  @UseInterceptors(
    // Allow up to 10 files
    require('@nestjs/platform-express').FilesInterceptor('files', 10, {
      storage: memoryStorage(),
    }),
  )
  async bulkSendFiles(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body('recipientIds') recipientIdsRaw: string,
    @Body('uploaderId') uploaderId: string,
  ) {
    // Validation moved to service, but we need to parse recipientIds
    let recipientIds: string[] = [];
    try {
      recipientIds = JSON.parse(recipientIdsRaw);
    } catch (e) {
      throw new BadRequestException('Invalid recipientIds format');
    }

    return this.filesService.bulkSendFiles(files, recipientIds, uploaderId);
  }

  @Get('user/:userId')
  async getFilesForUser(@Param('userId') userId: string) {
    return this.filesService.getFilesForUser(userId);
  }

  @Get('sent/:uploaderId')
  async getFilesByUploader(@Param('uploaderId') uploaderId: string) {
    return this.filesService.getFilesByUploader(uploaderId);
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string) {
    return this.filesService.deleteFile(id);
  }

  @Get('download/:filename')
  async downloadFile(@Param('filename') filename: string, @Res() res: any) {
    // Sanitize filename to prevent directory traversal
    const safeFilename = require('path').basename(filename);
    const uploadDir = require('path').join(process.cwd(), 'uploads');
    const filePath = require('path').join(uploadDir, safeFilename);

    if (!require('fs').existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Use sendFile with root option for robust handling
    return res.sendFile(safeFilename, { root: uploadDir });
  }

  @Post('share')
  async shareFile(
    @Body('fileId') fileId: string,
    @Body('recipientId') recipientId: string,
    @Body('uploaderId') uploaderId: string,
  ) {
    if (!fileId || !recipientId) {
      throw new BadRequestException('File ID and Recipient ID are required');
    }
    return this.filesService.shareFile(
      fileId,
      recipientId,
      uploaderId || 'admin',
    );
  }
}
