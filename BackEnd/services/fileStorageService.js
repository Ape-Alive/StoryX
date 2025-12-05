const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');
const config = require('../config');

class FileStorageService {
    constructor() {
        // Catbox 配置
        this.catboxApiUrl = config.fileStorage.catboxApiUrl;
        this.catboxUserHash = config.fileStorage.catboxUserHash;

        // 代理配置（可选）
        this.proxyUrl = config.fileStorage.proxyUrl;
        this.proxyAgent = this.proxyUrl ? new HttpsProxyAgent(this.proxyUrl) : null;

        // 本地存储配置
        const storageBasePath = config.fileStorage.basePath;
        this.storageBasePath = path.isAbsolute(storageBasePath)
            ? storageBasePath
            : path.join(config.rootPath, storageBasePath);

        // 确保存储目录存在
        this.ensureStorageDirectory();
    }

    /**
     * 确保存储目录存在
     */
    async ensureStorageDirectory() {
        try {
            await fs.mkdir(this.storageBasePath, { recursive: true });
        } catch (error) {
            logger.error('Failed to create storage directory:', error);
        }
    }

    /**
     * 获取代理配置（如果启用）
     */
    getProxyConfig() {
        if (!this.proxyAgent) {
            return {};
        }
        return {
            proxy: false,
            httpsAgent: this.proxyAgent,
            httpAgent: this.proxyAgent,
        };
    }

    /**
     * 从 URL 下载文件到本地
     * @param {string} url - 文件 URL
     * @param {string} localPath - 本地存储路径（相对路径或绝对路径）
     * @param {Object} options - 选项 { filename, timeout, headers }
     * @returns {Promise<Object>} - { localPath, absolutePath, size, mimeType }
     */
    async downloadFile(url, localPath, options = {}) {
        try {
            const { filename, timeout = 30000, headers = {} } = options;

            // 解析本地路径
            let absolutePath;
            if (path.isAbsolute(localPath)) {
                absolutePath = localPath;
            } else {
                absolutePath = path.join(this.storageBasePath, localPath);
            }

            // 确保目录存在
            const dir = path.dirname(absolutePath);
            await fs.mkdir(dir, { recursive: true });

            // 如果没有指定文件名，从 URL 或路径中提取
            if (!filename) {
                const urlFilename = path.basename(new URL(url).pathname);
                const pathFilename = path.basename(absolutePath);
                const finalFilename = pathFilename !== path.basename(localPath)
                    ? pathFilename
                    : urlFilename || `file_${Date.now()}`;
                absolutePath = path.join(dir, finalFilename);
            } else {
                absolutePath = path.join(dir, filename);
            }

            logger.info(`Downloading file from ${url} to ${absolutePath}`);

            // 下载文件
            const response = await axios({
                method: 'get',
                url: url,
                responseType: 'stream',
                timeout: timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    ...headers,
                },
                ...this.getProxyConfig(),
            });

            // 获取文件大小和 MIME 类型
            const contentLength = response.headers['content-length'];
            const contentType = response.headers['content-type'] || 'application/octet-stream';

            // 写入文件
            const writer = require('fs').createWriteStream(absolutePath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
                response.data.on('error', reject);
            });

            // 获取实际文件大小
            const stats = await fs.stat(absolutePath);
            const fileSize = stats.size;

            logger.info(`File downloaded successfully: ${absolutePath} (${fileSize} bytes)`);

            return {
                localPath: path.relative(this.storageBasePath, absolutePath),
                absolutePath: absolutePath,
                size: fileSize,
                mimeType: contentType,
            };
        } catch (error) {
            logger.error(`Failed to download file from ${url}:`, error);
            throw new AppError(`Failed to download file: ${error.message}`, 500);
        }
    }

    /**
     * 上传文件到 Catbox
     * @param {string} filePath - 本地文件路径（绝对路径）
     * @param {Object} options - 选项 { filename, mimeType }
     * @returns {Promise<string>} - 公链 URL
     */
    async uploadToCatbox(filePath, options = {}) {
        try {
            const { filename, mimeType } = options;

            if (!this.catboxUserHash) {
                throw new AppError('Catbox user hash is not configured', 500);
            }

            // 读取文件
            const fileBuffer = await fs.readFile(filePath);
            const finalFilename = filename || path.basename(filePath);

            logger.info(`Uploading file to Catbox: ${finalFilename}`);

            // 构建 FormData
            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('userhash', this.catboxUserHash);
            form.append('fileToUpload', fileBuffer, {
                filename: finalFilename,
                contentType: mimeType || 'application/octet-stream',
            });

            // 发送请求
            const response = await axios.post(this.catboxApiUrl, form, {
                headers: {
                    ...form.getHeaders(),
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Origin': 'https://catbox.moe',
                    'Referer': 'https://catbox.moe/',
                    'Accept': '*/*',
                    'Connection': 'keep-alive',
                },
                ...this.getProxyConfig(),
            });

            const resultUrl = response.data;

            if (typeof resultUrl === 'string' && resultUrl.startsWith('http')) {
                logger.info(`File uploaded to Catbox successfully: ${resultUrl}`);
                return resultUrl;
            } else {
                // Catbox 有时会返回 HTML 错误页
                logger.error('Catbox returned invalid response:', resultUrl.toString().substring(0, 200));
                throw new AppError('Catbox returned invalid response', 500);
            }
        } catch (error) {
            logger.error(`Failed to upload file to Catbox:`, error);
            if (error.response) {
                logger.error('Catbox error response:', error.response.data);
            }
            throw new AppError(`Failed to upload to Catbox: ${error.message}`, 500);
        }
    }

    /**
     * 下载文件并上传到托管中心（一站式服务）
     * @param {string} url - 源文件 URL
     * @param {string} localPath - 本地存储路径（相对路径）
     * @param {Object} options - 选项 {
     *   uploadToHosting: true/false,  // 是否上传到托管中心
     *   hostingProvider: 'catbox',    // 托管提供商
     *   filename,                     // 文件名
     *   timeout,                      // 下载超时时间
     *   headers                        // 下载请求头
     * }
     * @returns {Promise<Object>} - { localPath, absolutePath, publicUrl, size, mimeType }
     */
    async downloadAndUpload(url, localPath, options = {}) {
        try {
            const {
                uploadToHosting = true,
                hostingProvider = 'catbox',
                filename,
                timeout,
                headers,
            } = options;

            // 1. 下载文件到本地
            const downloadResult = await this.downloadFile(url, localPath, {
                filename,
                timeout,
                headers,
            });

            let publicUrl = null;

            // 2. 上传到托管中心（如果启用）
            if (uploadToHosting) {
                if (hostingProvider === 'catbox') {
                    publicUrl = await this.uploadToCatbox(downloadResult.absolutePath, {
                        filename: path.basename(downloadResult.absolutePath),
                        mimeType: downloadResult.mimeType,
                    });
                } else {
                    logger.warn(`Unsupported hosting provider: ${hostingProvider}, skipping upload`);
                }
            }

            return {
                localPath: downloadResult.localPath,
                absolutePath: downloadResult.absolutePath,
                publicUrl: publicUrl,
                size: downloadResult.size,
                mimeType: downloadResult.mimeType,
            };
        } catch (error) {
            logger.error(`Failed to download and upload file:`, error);
            throw error;
        }
    }

    /**
     * 方式2：直接下载 Buffer 然后上传到 Catbox（不保存到本地）
     * @param {string} url - 文件的远程URL
     * @param {Object} options - 选项
     * @param {string} [options.filename] - 上传到Catbox的文件名，如果未提供则从URL解析或生成UUID
     * @param {string} [options.mimeType] - 文件的MIME类型，如果未提供则从响应头获取
     * @param {number} [options.timeout=30000] - 下载超时时间（毫秒）
     * @param {Object} [options.headers={}] - 自定义请求头
     * @returns {Promise<{publicUrl: string, size: number, mimeType: string, buffer: Buffer}>} - 上传结果
     */
    async downloadBufferAndUpload(url, options = {}) {
        const { filename, mimeType, timeout = 30000, headers = {} } = options;

        if (!this.catboxUserHash) {
            throw new AppError('Catbox user hash is not configured.', 500);
        }

        try {
            // 下载文件为 Buffer
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout,
                headers,
                ...this.getProxyConfig(),
            });

            const fileBuffer = Buffer.from(response.data);
            const fileSize = fileBuffer.length;
            const contentType = mimeType || response.headers['content-type'] || 'application/octet-stream';

            // 确定文件名
            let finalFilename = filename;
            if (!finalFilename) {
                const urlParts = new URL(url);
                const basename = path.basename(urlParts.pathname);
                finalFilename = basename || `${require('uuid').v4()}`;
            }

            logger.info(`Downloaded file as buffer: ${url} (${fileSize} bytes)`);

            // 构建 FormData
            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('userhash', this.catboxUserHash);
            form.append('fileToUpload', fileBuffer, {
                filename: finalFilename,
                contentType: contentType,
            });

            // 上传到 Catbox
            const uploadResponse = await axios.post(this.catboxApiUrl, form, {
                headers: {
                    ...form.getHeaders(),
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Origin': 'https://catbox.moe',
                    'Referer': 'https://catbox.moe/',
                    'Accept': '*/*',
                    'Connection': 'keep-alive',
                },
                ...this.getProxyConfig(),
            });

            const publicUrl = uploadResponse.data;
            if (typeof publicUrl === 'string' && publicUrl.startsWith('http')) {
                logger.info(`File uploaded to Catbox via buffer: ${publicUrl}`);
                return {
                    publicUrl,
                    size: fileSize,
                    mimeType: contentType,
                    buffer: fileBuffer, // 返回 Buffer 供后续使用（可选）
                };
            } else {
                logger.error('Catbox returned an invalid URL:', publicUrl);
                throw new AppError(`Catbox returned an invalid URL: ${publicUrl.toString().substring(0, 200)}`, 500);
            }
        } catch (error) {
            logger.error(`Failed to download buffer and upload from ${url}:`, error);
            throw new AppError(`Failed to download buffer and upload: ${error.message}`, 500);
        }
    }

    /**
     * 批量下载并上传文件
     * @param {Array<Object>} files - 文件列表 [{ url, localPath, options }]
     * @param {Object} globalOptions - 全局选项
     * @returns {Promise<Array<Object>>} - 结果列表
     */
    async batchDownloadAndUpload(files, globalOptions = {}) {
        try {
            const results = await Promise.allSettled(
                files.map(file =>
                    this.downloadAndUpload(
                        file.url,
                        file.localPath,
                        { ...globalOptions, ...file.options }
                    )
                )
            );

            return results.map((result, index) => {
                if (result.status === 'fulfilled') {
                    return {
                        success: true,
                        index: index,
                        data: result.value,
                    };
                } else {
                    return {
                        success: false,
                        index: index,
                        error: result.reason.message,
                    };
                }
            });
        } catch (error) {
            logger.error('Batch download and upload failed:', error);
            throw error;
        }
    }

    /**
     * 删除本地文件
     * @param {string} filePath - 文件路径（绝对路径或相对路径）
     * @returns {Promise<boolean>} - 是否删除成功
     */
    async deleteLocalFile(filePath) {
        try {
            let absolutePath;
            if (path.isAbsolute(filePath)) {
                absolutePath = filePath;
            } else {
                absolutePath = path.join(this.storageBasePath, filePath);
            }

            await fs.unlink(absolutePath);
            logger.info(`Local file deleted: ${absolutePath}`);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.warn(`File not found: ${filePath}`);
                return false;
            }
            logger.error(`Failed to delete local file: ${filePath}`, error);
            throw new AppError(`Failed to delete file: ${error.message}`, 500);
        }
    }

    /**
     * 检查文件是否存在
     * @param {string} filePath - 文件路径（绝对路径或相对路径）
     * @returns {Promise<boolean>} - 文件是否存在
     */
    async fileExists(filePath) {
        try {
            let absolutePath;
            if (path.isAbsolute(filePath)) {
                absolutePath = filePath;
            } else {
                absolutePath = path.join(this.storageBasePath, filePath);
            }

            await fs.access(absolutePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取文件信息
     * @param {string} filePath - 文件路径（绝对路径或相对路径）
     * @returns {Promise<Object>} - { size, mtime, isFile, isDirectory }
     */
    async getFileInfo(filePath) {
        try {
            let absolutePath;
            if (path.isAbsolute(filePath)) {
                absolutePath = filePath;
            } else {
                absolutePath = path.join(this.storageBasePath, filePath);
            }

            const stats = await fs.stat(absolutePath);
            return {
                size: stats.size,
                mtime: stats.mtime,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory(),
            };
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new AppError('File not found', 404);
            }
            throw new AppError(`Failed to get file info: ${error.message}`, 500);
        }
    }
}

module.exports = new FileStorageService();

