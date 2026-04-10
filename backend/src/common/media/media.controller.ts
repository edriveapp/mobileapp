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
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }
        const url = await this.mediaService.saveFile(file);
        return { url };
    }

    @Post('upload-multiple')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(FilesInterceptor('files'))
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
