import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class MediaService {
    private readonly uploadPath: string;

    constructor(private configService: ConfigService) {
        this.uploadPath = join(process.cwd(), 'public', 'uploads');
        this.ensureUploadPathExists();
    }

    private ensureUploadPathExists() {
        if (!existsSync(this.uploadPath)) {
            mkdirSync(this.uploadPath, { recursive: true });
        }
    }

    async saveFile(file: Express.Multer.File): Promise<string> {
        // In a production environment, you would upload to Cloudinary/S3 here.
        // For now, we use local storage.
        const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
        const filePath = join(this.uploadPath, fileName);
        
        // Multer handles the buffer. We just need to return the URL.
        const fs = require('fs');
        fs.writeFileSync(filePath, file.buffer);

        const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
        return `${appUrl}/public/uploads/${fileName}`;
    }
}
