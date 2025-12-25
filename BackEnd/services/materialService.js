const fs = require('fs').promises;
const path = require('path');
const { AppError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');
const config = require('../config');

class MaterialService {
    /**
     * 根据文件扩展名获取MIME类型
     */
    getMimeType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            // 视频
            '.mp4': 'video/mp4',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.mkv': 'video/x-matroska',
            '.webm': 'video/webm',
            '.flv': 'video/x-flv',
            // 音频
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
            '.m4a': 'audio/mp4',
            '.aac': 'audio/aac',
            '.flac': 'audio/flac',
            // 图片
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp',
            '.svg': 'image/svg+xml',
            // 文档
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.json': 'application/json',
            '.xml': 'application/xml',
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * 根据MIME类型判断文件类型
     */
    getFileType(mimeType) {
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('text/') || mimeType.includes('document') || mimeType === 'application/pdf') return 'document';
        return 'other';
    }

    /**
     * 读取本地文件信息
     * @param {string} filePath - 本地文件路径（绝对路径）
     * @returns {Promise<Object>} - 文件信息
     */
    async readFileInfo(filePath) {
        try {
            // 规范化路径
            let absolutePath = filePath;
            if (!path.isAbsolute(filePath)) {
                // 如果是相对路径，基于项目根目录
                absolutePath = path.join(config.rootPath, filePath);
            }

            // 检查文件是否存在
            try {
                await fs.access(absolutePath);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    throw new NotFoundError(`File not found: ${filePath}`);
                }
                throw error;
            }

            // 获取文件统计信息
            const stats = await fs.stat(absolutePath);

            if (!stats.isFile()) {
                throw new AppError('Path is not a file', 400);
            }

            // 获取文件信息
            const fileName = path.basename(absolutePath);
            const fileExt = path.extname(fileName);
            const mimeType = this.getMimeType(absolutePath);
            const fileType = this.getFileType(mimeType);

            // 生成可访问的URL（相对于uploads或storage目录）
            let accessUrl = null;
            const normalizedPath = path.normalize(absolutePath);

            // 检查是否在uploads目录下（使用path.resolve确保路径一致性）
            const uploadsPath = path.resolve(config.rootPath, 'uploads');
            const normalizedUploadsPath = path.normalize(uploadsPath);
            if (normalizedPath.startsWith(normalizedUploadsPath + path.sep) || normalizedPath === normalizedUploadsPath) {
                const relativePath = path.relative(uploadsPath, absolutePath);
                accessUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;
            } else {
                // 检查是否在storage目录下
                const storagePath = path.resolve(config.rootPath, 'storage');
                const normalizedStoragePath = path.normalize(storagePath);
                if (normalizedPath.startsWith(normalizedStoragePath + path.sep) || normalizedPath === normalizedStoragePath) {
                    const relativePath = path.relative(storagePath, absolutePath);
                    accessUrl = `/storage/${relativePath.replace(/\\/g, '/')}`;
                } else {
                    // 如果不在标准目录下，记录警告
                    logger.warn(`File is outside standard directories: ${absolutePath}`);
                    // 仍然尝试生成URL，但可能无法访问
                    // 可以返回一个需要特殊处理的标识，或者返回null
                }
            }

            return {
                filePath: absolutePath,
                fileName: fileName,
                fileExtension: fileExt,
                fileType: fileType, // video, audio, image, document, other
                mimeType: mimeType,
                size: stats.size,
                sizeFormatted: this.formatFileSize(stats.size),
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
                accessUrl: accessUrl,
            };
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof AppError) {
                throw error;
            }
            logger.error('Read file info error:', error);
            throw new AppError(`Failed to read file info: ${error.message}`, 500);
        }
    }

    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

module.exports = new MaterialService();

