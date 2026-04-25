import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class MediaService {
    private readonly logger = new Logger(MediaService.name);
    private readonly uploadPath: string;
    private readonly useCloudinary: boolean;

    constructor(private configService: ConfigService) {
        const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
        const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
        const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

        this.useCloudinary = !!(cloudName && apiKey && apiSecret);

        if (this.useCloudinary) {
            cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
            this.logger.log('Media storage: Cloudinary');
        } else {
            this.uploadPath = join(process.cwd(), 'public', 'uploads');
            this.ensureUploadPathExists();
            this.logger.warn('Media storage: local disk (set CLOUDINARY_* env vars for production)');
        }
    }

    private ensureUploadPathExists() {
        if (!existsSync(this.uploadPath)) {
            mkdirSync(this.uploadPath, { recursive: true });
        }
    }

    async saveFile(file: Express.Multer.File, folder = 'edrive'): Promise<string> {
        if (this.useCloudinary) {
            return this.uploadToCloudinary(file, folder);
        }
        return this.saveLocally(file);
    }

    private async uploadToCloudinary(file: Express.Multer.File, folder: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: 'auto',
                    // Auto-detect PDF/image, keep original format
                    use_filename: false,
                    unique_filename: true,
                },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result.secure_url);
                },
            );
            uploadStream.end(file.buffer);
        });
    }

    private saveLocally(file: Express.Multer.File): string {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `${Date.now()}-${safeName}`;
        const filePath = join(this.uploadPath, fileName);
        writeFileSync(filePath, file.buffer);
        const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
        return `${appUrl}/public/uploads/${fileName}`;
    }
}
