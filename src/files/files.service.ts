import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { File, FileDocument } from './schemas/file.schema';
import { Folder, FolderDocument } from './schemas/folder.schema';
import { FirebaseService } from '../firebase/firebase.service';
import { WebhookService } from '../webhook/webhook.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectModel(File.name) private fileModel: Model<FileDocument>,
    @InjectModel(Folder.name) private folderModel: Model<FolderDocument>,
    private firebaseService: FirebaseService,
    private webhookService: WebhookService,
  ) {
    this.ensureUploadsDir();
  }

  private ensureUploadsDir() {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    uploaderId: string,
    recipientId: string,
    folderId?: string,
    category: string = 'general',
    session: ClientSession | null = null,
  ): Promise<File> {
    this.validateFile(file);

    let driveParentId: string | undefined = undefined;
    if (folderId) {
      const folder = await this.folderModel.findById(folderId);
      if (folder && folder.driveId) {
        driveParentId = folder.driveId;
      }
    }

    const uniqueFilename = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    const uploadPath = path.join(process.cwd(), 'uploads', uniqueFilename);

    try {
      fs.writeFileSync(uploadPath, file.buffer);
    } catch (error) {
      this.logger.error('Failed to save file locally:', error);
      throw new BadRequestException('Failed to save file');
    }

    const newFile = new this.fileModel({
      filename: file.filename || file.originalname,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: `<server-url>/uploads/${uniqueFilename}`, // Store relative or full path? Using pseudo path for now.
      localPath: uniqueFilename, // Storing filename for retrieval
      driveId: null,
      webViewLink: `/api/files/download/${uniqueFilename}`,
      webContentLink: `/api/files/download/${uniqueFilename}`,
      thumbnailLink: null,
      uploaderId,
      recipientId,
      folderId: folderId || null,
      category,
    });

    const savedFile = await newFile.save({ session });

    // Webhook and Notifications should typically happen AFTER transaction commit
    // But for now, we keep them here. If transaction fails, these might still fire?
    // Notification is fire-and-forget, so it's less critical strictly speaking.
    // However, ideally they should be triggered by the caller after commit.
    // We will leave them here for now to avoid breaking existing flow too much, 
    // but noting that "Compensating Action" or "After Commit" hook is better.

    // Only notify if we are NOT in a transaction, OR we accept that notification might be premature.
    // Given the requirement is "System Hardening", let's move notification OUT of here?
    // No, that changes the contract too much for 'uploadFile'.
    // We will keep it but document the behavior.

    this.notifyRecipient(
      recipientId,
      file.originalname,
      `/api/files/download/${uniqueFilename}`,
    );
    this.webhookService.triggerFileSent(savedFile, recipientId);

    return savedFile;
  }

  async getFilesForUser(userId: string): Promise<File[]> {
    return this.fileModel
      .find({ recipientId: userId, category: 'general' })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getAllFiles(): Promise<File[]> {
    return this.fileModel.find().sort({ createdAt: -1 }).exec();
  }

  async getFilesByUploader(uploaderId: string): Promise<File[]> {
    return this.fileModel.find({ uploaderId }).sort({ createdAt: -1 }).exec();
  }

  async deleteFile(fileId: string): Promise<void> {
    const file = await this.fileModel.findById(fileId);
    if (!file) throw new NotFoundException('File not found');

    // Optional: Delete physical file if no other records point to it?
    // For now, simpler to just remove the DB record so it disappears from UI.
    // If we want to save space, we'd need to check if 'path' is used by other docs.

    await this.fileModel.findByIdAndDelete(fileId);
  }

  async shareFile(
    fileId: string,
    recipientId: string,
    uploaderId: string,
  ): Promise<File> {
    const sourceFile = await this.fileModel.findById(fileId);
    if (!sourceFile) {
      throw new NotFoundException('File not found');
    }

    // Logic here is replicating the file entry for another user.
    // Ideally we should share proper permissions on Drive API.
    // For now, we clone the record.

    const newFile = new this.fileModel({
      filename: sourceFile.filename,
      originalName: sourceFile.originalName,
      mimetype: sourceFile.mimetype,
      size: sourceFile.size,
      path: sourceFile.path,
      driveId: null,
      webViewLink: sourceFile.webViewLink,
      webContentLink: sourceFile.webContentLink,
      thumbnailLink: null,
      uploaderId,
      recipientId,
      folderId: null,
    });

    const savedFile = await newFile.save();

    this.notifyRecipient(
      recipientId,
      sourceFile.originalName,
      sourceFile.webViewLink || '',
    );
    this.webhookService.triggerFileSent(savedFile, recipientId);

    return savedFile;
  }

  async bulkSendFiles(
    files: Express.Multer.File[],
    recipientIds: string[],
    uploaderId: string,
  ): Promise<{ message: string; count: number }> {
    if (!files || files.length === 0)
      throw new BadRequestException('No files provided');
    if (!recipientIds || recipientIds.length === 0)
      throw new BadRequestException('No recipients provided');

    // Validate all files first
    files.forEach((file) => this.validateFile(file));

    const results: FileDocument[] = [];

    for (const file of files) {
      // Upload to Drive ONCE
      const uniqueFilename = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
      const uploadPath = path.join(process.cwd(), 'uploads', uniqueFilename);

      try {
        fs.writeFileSync(uploadPath, file.buffer);
      } catch (error) {
        this.logger.error(`Failed to save file ${file.originalname}:`, error);
        // Skip this file or throw? Let's skip for bulk robustness
        continue;
      }

      // Create DB records for *each* recipient linked to the SAME local file
      const fileDocs = recipientIds.map((recipientId) => ({
        filename: uniqueFilename, // Store the system filename
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        uploaderId: uploaderId,
        recipientId: recipientId,
        path: uniqueFilename,
        driveId: null,
        webViewLink: `/api/files/download/${uniqueFilename}`,
        webContentLink: `/api/files/download/${uniqueFilename}`,
        thumbnailLink: null,
        folderId: null,
      }));

      // Bulk Insert
      try {
        const savedDocs = await this.fileModel.insertMany(fileDocs, {
          ordered: false,
        });
        results.push(...(savedDocs as unknown as FileDocument[]));

        // Notify all recipients
        this.notifyRecipientsBatch(
          recipientIds,
          file.originalname,
          `/api/files/download/${uniqueFilename}`,
        );
      } catch (error) {
        this.logger.error('DB Insert failed partly:', error);
      }
    }

    return { message: 'Files processing completed', count: results.length };
  }

  private validateFile(file: Express.Multer.File) {
    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      throw new BadRequestException(
        `File ${file.originalname} is too large (Max 50MB)`,
      );
    }
    // Check types (optional)
    // const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/zip', 'text/plain'];
    // if (!allowedTypes.includes(file.mimetype)) { ... }
  }

  private async notifyRecipient(
    recipientId: string,
    fileName: string,
    link: string,
  ) {
    try {
      const db = this.firebaseService.getDatabase();
      await db.ref(`notifications/users/${recipientId}`).push({
        type: 'file-received',
        fileName: fileName,
        uploaderName: 'Admin',
        timestamp: new Date().toISOString(),
        read: false,
        link: link,
      });
    } catch (e) {
      this.logger.error(`Failed to notify recipient ${recipientId}`, e);
    }
  }

  private async notifyRecipientsBatch(
    recipientIds: string[],
    fileName: string,
    link: string,
  ) {
    // Fire and forget loop to avoid blocking response too long
    recipientIds.forEach((id) => this.notifyRecipient(id, fileName, link));
  }
}
