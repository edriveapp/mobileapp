import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    UploadedFiles,
    BadRequestException,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
    constructor(private readonly mediaService: MediaService) { }

    @Post('upload')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/^(image\/(jpeg|png|webp)|application\/pdf)$/)) {
                return cb(new BadRequestException('Only images and PDFs allowed'), false);
            }
            cb(null, true);
        },
    }))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }
        const url = await this.mediaService.saveFile(file);
        return { url };
    }

    @Post('upload-multiple')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(FilesInterceptor('files', 10, {
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/^(image\/(jpeg|png|webp)|application\/pdf)$/)) {
                return cb(new BadRequestException('Only images and PDFs allowed'), false);
            }
            cb(null, true);
        },
    }))
    async uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
        if (!files || files.length === 0) {
            throw new BadRequestException('No files uploaded');
        }
        const urls = await Promise.all(
            files.map((file) => this.mediaService.saveFile(file)),
        );
        return { urls };
    }
}
