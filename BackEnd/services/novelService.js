const { getPrisma } = require('../utils/prisma');
const logger = require('../utils/logger');
const { NotFoundError, AppError } = require('../utils/errors');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const novelParserService = require('./novelParserService');
const llmService = require('./llmService');
const projectService = require('./projectService');
const aiModelService = require('./aiModelService');

class NovelService {
    /**
     * 确保目录存在
     * @param {string} dirPath - 目录路径
     */
    ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * 获取小说库目录路径
     * @param {string} novelId - 小说ID
     * @returns {string} - 小说目录的绝对路径
     */
    getNovelLibraryPath(novelId) {
        const libraryPath = path.resolve(config.novel.libraryPath);
        return path.join(libraryPath, `book_${novelId}`);
    }

    /**
     * 保存章节内容到 JSON 文件
     * @param {string} novelId - 小说ID
     * @param {number} order - 章节顺序（从0开始）
     * @param {string} title - 章节标题
     * @param {string} content - 章节内容
     * @returns {string} - 文件路径（相对于library）
     */
    saveChapterToJson(novelId, order, title, content) {
        const novelDir = this.getNovelLibraryPath(novelId);
        this.ensureDirectoryExists(novelDir);

        // 保存为 chap_0.json, chap_1.json 格式
        const chapterData = {
            title,
            content,
            order,
            wordCount: novelParserService.countChineseWords(content),
            updatedAt: new Date().toISOString(),
        };

        const filePath = path.join(novelDir, `chap_${order}.json`);
        fs.writeFileSync(filePath, JSON.stringify(chapterData, null, 2), 'utf8');

        // 返回相对路径
        return path.join(`book_${novelId}`, `chap_${order}.json`);
    }

    /**
     * 保存封面图片
     * @param {string} novelId - 小说ID
     * @param {string} coverPath - 封面源文件路径
     * @returns {string|null} - 封面文件路径（相对于library），如果失败返回null
     */
    saveCoverImage(novelId, coverPath) {
        if (!coverPath || !fs.existsSync(coverPath)) {
            return null;
        }

        try {
            const novelDir = this.getNovelLibraryPath(novelId);
            this.ensureDirectoryExists(novelDir);

            const targetPath = path.join(novelDir, 'cover.jpg');
            fs.copyFileSync(coverPath, targetPath);

            return path.join(`book_${novelId}`, 'cover.jpg');
        } catch (error) {
            logger.error('Save cover image error', { error: error.message });
            return null;
        }
    }

    /**
     * 上传并解析小说
     * @param {Object} fileData - 文件数据
     * @param {string} projectId - 项目ID
     * @param {string} userId - 用户ID
     * @param {string} customTitle - 自定义书名
     * @returns {Object} - 解析结果
     */
    async uploadAndParseNovel(fileData, projectId, userId, customTitle = null) {
        const prisma = getPrisma();

        try {
            // 验证项目属于用户
            const project = await prisma.project.findFirst({
                where: {
                    id: projectId,
                    userId,
                },
            });

            if (!project) {
                throw new NotFoundError('Project not found');
            }

            const { file, fileName, encoding } = fileData;
            const tempFilePath = file.path;

            // 解析文件
            logger.info('Parsing novel file', { fileName, encoding });
            const parseResult = await novelParserService.parseFile(tempFilePath, encoding);

            // 使用自定义书名或解析出的书名
            const title = customTitle || parseResult.metadata.title || fileName.replace(/\.[^/.]+$/, '');
            const author = parseResult.metadata.author || '';
            const summary = parseResult.metadata.summary || '';
            const tags = parseResult.metadata.tags || [];

            // 计算总字数
            const totalWords = parseResult.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

            // 创建小说记录
            const novelId = require('uuid').v4();

            // 保存封面（如果有）
            let coverUrl = null;
            if (parseResult.metadata.coverUrl) {
                const savedCoverPath = this.saveCoverImage(novelId, parseResult.metadata.coverUrl);
                if (savedCoverPath) {
                    coverUrl = savedCoverPath;
                }
            }

            const novel = await prisma.novel.create({
                data: {
                    id: novelId,
                    projectId,
                    userId,
                    title,
                    author,
                    summary,
                    tags: JSON.stringify(tags),
                    fileName,
                    filePath: `book_${novelId}`, // 存储为 book_uuid 格式
                    fileSize: fs.statSync(tempFilePath).size,
                    encoding: parseResult.encoding,
                    totalChapters: parseResult.chapters.length,
                    totalWords,
                    status: 'parsed',
                    coverUrl,
                },
            });

            // 创建章节记录并保存为 JSON 文件
            const chapters = [];
            for (let i = 0; i < parseResult.chapters.length; i++) {
                const chapterData = parseResult.chapters[i];
                const chapterId = require('uuid').v4();

                // 保存章节内容为 chap_0.json, chap_1.json 格式（order 从 1 开始，但文件从 0 开始）
                const fileOrder = chapterData.order - 1; // 数据库 order 从 1 开始，文件从 0 开始
                const contentPath = this.saveChapterToJson(novelId, fileOrder, chapterData.title, chapterData.content);

                const chapter = await prisma.chapter.create({
                    data: {
                        id: chapterId,
                        novelId,
                        title: chapterData.title,
                        content: null, // 内容存储在文件中，数据库不存储
                        contentPath,
                        order: chapterData.order,
                        wordCount: chapterData.wordCount,
                    },
                });

                chapters.push({
                    chapterId: chapter.id,
                    chapterTitle: chapter.title,
                    order: chapter.order,
                    wordCount: chapter.wordCount,
                });
            }

            // 删除临时文件
            try {
                fs.unlinkSync(tempFilePath);
            } catch (e) {
                logger.warn('Failed to delete temp file', { tempFilePath, error: e.message });
            }

            logger.info('Novel uploaded and parsed', { novelId, totalChapters: chapters.length });

            return {
                novelId: novel.id,
                title: novel.title,
                author: novel.author,
                coverUrl: novel.coverUrl,
                summary: novel.summary,
                tags: tags,
                totalChapters: novel.totalChapters,
                chapterList: chapters,
            };
        } catch (error) {
            logger.error('Upload and parse novel error:', error);
            throw error;
        }
    }

    /**
     * 获取小说详情
     * @param {string} novelId - 小说ID
     * @param {string} userId - 用户ID
     * @param {string} chapterId - 章节ID（可选，如果提供则返回该章节的详情）
     * @returns {Object} - 小说详情（如果提供了 chapterId，则包含章节详情）
     */
    async getNovelById(novelId, userId, chapterId = null) {
        try {
            const prisma = getPrisma();
            const novel = await prisma.novel.findFirst({
                where: {
                    id: novelId,
                    userId,
                },
                include: {
                    project: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            });

            if (!novel) {
                throw new NotFoundError('Novel not found');
            }

            // 获取章节数量（不返回章节详情）
            const totalChapters = await prisma.chapter.count({
                where: { novelId: novel.id },
            });

            const result = {
                ...novel,
                tags: novel.tags ? JSON.parse(novel.tags) : [],
                totalChapters,
            };

            // 如果提供了 chapterId，获取该章节的详情
            if (chapterId) {
                const chapter = await prisma.chapter.findFirst({
                    where: {
                        id: chapterId,
                        novelId: novel.id,
                        novel: {
                            userId,
                        },
                    },
                });

                if (!chapter) {
                    throw new NotFoundError('Chapter not found or does not belong to novel');
                }

                // 读取章节内容（从 JSON 文件）
                let content = '';
                let chapterData = null;

                if (chapter.contentPath) {
                    // contentPath 格式: book_uuid/chap_0.json
                    const contentPath = path.resolve(config.novel.libraryPath, chapter.contentPath);
                    if (fs.existsSync(contentPath)) {
                        try {
                            const fileContent = fs.readFileSync(contentPath, 'utf8');
                            chapterData = JSON.parse(fileContent);
                            content = chapterData.content || '';
                        } catch (error) {
                            logger.error('Read chapter content error:', error);
                        }
                    }
                } else if (chapter.content) {
                    // 如果内容直接存储在数据库中
                    content = chapter.content;
                }

                // 添加章节详情到结果中
                result.chapter = {
                    id: chapter.id,
                    title: chapter.title,
                    order: chapter.order,
                    wordCount: chapter.wordCount || (chapterData ? chapterData.wordCount : 0),
                    content: content,
                    createdAt: chapter.createdAt,
                    updatedAt: chapter.updatedAt,
                };
            }

            return result;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Get novel error:', error);
            throw new AppError('Failed to get novel', 500);
        }
    }

    /**
     * 获取当前用户的所有小说
     * @param {string} userId - 用户ID
     * @returns {Array} - 小说列表
     */
    async getUserNovels(userId) {
        try {
            const prisma = getPrisma();

            const novels = await prisma.novel.findMany({
                where: {
                    userId,
                },
                include: {
                    project: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            // 获取每本小说的章节数量（不返回章节详情）
            const novelsWithChapterCount = await Promise.all(
                novels.map(async (novel) => {
                    const chapterCount = await prisma.chapter.count({
                        where: { novelId: novel.id },
                    });
                    return {
                        ...novel,
                        tags: novel.tags ? JSON.parse(novel.tags) : [],
                        totalChapters: chapterCount,
                    };
                })
            );

            return novelsWithChapterCount;
        } catch (error) {
            logger.error('Get user novels error:', error);
            throw new AppError('Failed to get novels', 500);
        }
    }

    /**
     * 获取项目的所有小说
     * @param {string} projectId - 项目ID
     * @param {string} userId - 用户ID
     * @returns {Array} - 小说列表
     */
    async getProjectNovels(projectId, userId) {
        try {
            const prisma = getPrisma();

            // 验证项目属于用户
            const project = await prisma.project.findFirst({
                where: {
                    id: projectId,
                    userId,
                },
            });

            if (!project) {
                throw new NotFoundError('Project not found');
            }

            const novels = await prisma.novel.findMany({
                where: {
                    projectId,
                    userId,
                },
                include: {
                    project: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            // 获取每本小说的章节数量（不返回章节详情）
            const novelsWithChapterCount = await Promise.all(
                novels.map(async (novel) => {
                    const chapterCount = await prisma.chapter.count({
                        where: { novelId: novel.id },
                    });
                    return {
                        ...novel,
                        tags: novel.tags ? JSON.parse(novel.tags) : [],
                        totalChapters: chapterCount,
                    };
                })
            );

            return novelsWithChapterCount;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Get project novels error:', error);
            throw new AppError('Failed to get novels', 500);
        }
    }

    /**
     * 获取章节内容
     * @param {string} chapterId - 章节ID
     * @param {string} userId - 用户ID
     * @returns {Object} - 章节内容
     */
    async getChapterContent(chapterId, userId) {
        try {
            const prisma = getPrisma();
            const chapter = await prisma.chapter.findFirst({
                where: {
                    id: chapterId,
                    novel: {
                        userId,
                    },
                },
                include: {
                    novel: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            });

            if (!chapter) {
                throw new NotFoundError('Chapter not found');
            }

            // 读取章节内容（从 JSON 文件）
            let content = '';
            let chapterData = null;

            if (chapter.contentPath) {
                // contentPath 格式: book_uuid/chap_0.json
                const contentPath = path.resolve(config.novel.libraryPath, chapter.contentPath);
                if (fs.existsSync(contentPath)) {
                    try {
                        const jsonContent = fs.readFileSync(contentPath, 'utf8');
                        chapterData = JSON.parse(jsonContent);
                        content = chapterData.content || '';
                    } catch (e) {
                        logger.error('Failed to read chapter JSON', { contentPath, error: e.message });
                    }
                }
            }

            return {
                ...chapter,
                content,
                chapterData, // 包含完整的章节数据（title, order, wordCount 等）
            };
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Get chapter content error:', error);
            throw new AppError('Failed to get chapter content', 500);
        }
    }

    /**
     * 上传并解析文本粘贴片段
     * @param {Object} textData - 文本数据
     * @param {string} projectId - 项目ID
     * @param {string} userId - 用户ID
     * @returns {Object} - 解析结果
     */
    async uploadAndParseTextPaste(textData, projectId, userId) {
        const prisma = getPrisma();

        try {
            // 验证项目属于用户
            const project = await prisma.project.findFirst({
                where: {
                    id: projectId,
                    userId,
                },
            });

            if (!project) {
                throw new NotFoundError('Project not found');
            }

            const {
                text,
                title,
                author,
                summary,
                tags = [],
                coverUrl,
                storageLocation,
                expandText = false, // 是否扩写，默认false（直接分割）
                modelId, // 可选：指定LLM模型ID
            } = textData;

            if (!text || !text.trim()) {
                throw new AppError('Text content is required', 400);
            }

            if (!storageLocation) {
                throw new AppError('storageLocation is required', 400);
            }

            if (!['local', 'remote'].includes(storageLocation)) {
                throw new AppError('storageLocation must be "local" or "remote"', 400);
            }

            let finalText = text.trim();

            // 如果需要扩写
            if (expandText) {
                // 获取项目的LLM配置
                const projectWithKeys = await projectService.getProjectWithKeys(projectId, userId);

                if (!projectWithKeys.configLLM || !projectWithKeys.configLLMKey) {
                    throw new AppError('LLM configuration is required for text expansion', 400);
                }

                // 获取模型信息
                let model;
                if (modelId) {
                    model = await aiModelService.getModelById(modelId);
                } else {
                    // 如果没有指定模型，使用项目配置的模型ID，或获取第一个可用模型
                    if (projectWithKeys.configLLM) {
                        try {
                            model = await aiModelService.getModelById(projectWithKeys.configLLM);
                        } catch (e) {
                            // 如果项目配置的模型ID无效，获取第一个LLM模型
                            const models = await aiModelService.getModelsByType('llm');
                            if (models.length === 0) {
                                throw new AppError('No LLM model available', 400);
                            }
                            model = models[0];
                        }
                    } else {
                        const models = await aiModelService.getModelsByType('llm');
                        if (models.length === 0) {
                            throw new AppError('No LLM model available', 400);
                        }
                        model = models[0];
                    }
                }

                logger.info('Expanding text with LLM', {
                    modelId: model.id,
                    provider: model.provider.name,
                    textLength: finalText.length,
                });

                // 调用LLM进行扩写
                finalText = await llmService.expandText(
                    finalText,
                    model.id,
                    projectWithKeys.configLLMKey,
                    model.baseUrl,
                    model.provider.name
                );

                logger.info('Text expanded successfully', { expandedLength: finalText.length });
            }

            // 解析章节
            const parseResult = novelParserService.parseChapters(finalText);

            // 如果没有解析出章节，将整个文本作为一章
            if (parseResult.length === 0) {
                parseResult.push({
                    title: '正文',
                    content: finalText,
                    order: 1,
                    wordCount: novelParserService.countChineseWords(finalText),
                });
            }

            // 计算总字数
            const totalWords = parseResult.reduce((sum, ch) => sum + ch.wordCount, 0);

            // 创建小说记录
            const novelId = require('uuid').v4();

            // 保存封面（如果有）
            let savedCoverUrl = null;
            if (coverUrl) {
                // 如果coverUrl是文件路径，需要保存
                if (fs.existsSync(coverUrl)) {
                    savedCoverUrl = this.saveCoverImage(novelId, coverUrl);
                } else {
                    // 如果是URL，直接保存
                    savedCoverUrl = coverUrl;
                }
            }

            const novel = await prisma.novel.create({
                data: {
                    id: novelId,
                    projectId,
                    userId,
                    title: title || '未命名小说',
                    author: author || '',
                    summary: summary || '',
                    tags: JSON.stringify(tags),
                    fileName: 'text_paste.txt',
                    filePath: `book_${novelId}`,
                    fileSize: Buffer.byteLength(finalText, 'utf8'),
                    encoding: 'UTF-8',
                    totalChapters: parseResult.length,
                    totalWords,
                    status: 'parsed',
                    coverUrl: savedCoverUrl,
                },
            });

            // 创建章节记录并保存为 JSON 文件
            const chapters = [];
            for (let i = 0; i < parseResult.length; i++) {
                const chapterData = parseResult[i];
                const chapterId = require('uuid').v4();

                // 保存章节内容为 chap_0.json, chap_1.json 格式
                const fileOrder = chapterData.order - 1;
                const contentPath = this.saveChapterToJson(novelId, fileOrder, chapterData.title, chapterData.content);

                const chapter = await prisma.chapter.create({
                    data: {
                        id: chapterId,
                        novelId,
                        title: chapterData.title,
                        content: null, // 内容存储在文件中，数据库不存储
                        contentPath,
                        order: chapterData.order,
                        wordCount: chapterData.wordCount,
                    },
                });

                chapters.push({
                    chapterId: chapter.id,
                    chapterTitle: chapter.title,
                    order: chapter.order,
                    wordCount: chapter.wordCount,
                });
            }

            logger.info('Text paste uploaded and parsed', {
                novelId,
                totalChapters: chapters.length,
                expanded: expandText,
            });

            return {
                novelId: novel.id,
                title: novel.title,
                author: novel.author,
                coverUrl: novel.coverUrl,
                summary: novel.summary,
                tags: tags,
                totalChapters: novel.totalChapters,
                chapterList: chapters,
            };
        } catch (error) {
            logger.error('Upload and parse text paste error:', error);
            throw error;
        }
    }

    /**
     * 删除整本小说及其所有关联数据
     * @param {string} novelId - 小说ID
     * @param {string} userId - 用户ID
     */
    async deleteNovel(novelId, userId) {
        const prisma = getPrisma();

        try {
            // 验证小说属于该用户
            const novel = await prisma.novel.findFirst({
                where: {
                    id: novelId,
                    userId,
                },
            });

            if (!novel) {
                throw new NotFoundError('Novel not found');
            }

            // 删除文件系统中的小说目录
            const novelDir = this.getNovelLibraryPath(novelId);
            if (fs.existsSync(novelDir)) {
                try {
                    // 递归删除整个目录
                    fs.rmSync(novelDir, { recursive: true, force: true });
                    logger.info('Novel directory deleted', { novelId, path: novelDir });
                } catch (error) {
                    logger.error('Failed to delete novel directory', {
                        novelId,
                        path: novelDir,
                        error: error.message
                    });
                    // 即使删除文件失败，也继续删除数据库记录
                }
            }

            // 删除数据库中的小说记录（章节会通过 CASCADE 自动删除）
            await prisma.novel.delete({
                where: { id: novelId },
            });

            logger.info('Novel deleted', { novelId, userId });
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Delete novel error:', error);
            throw new AppError('Failed to delete novel', 500);
        }
    }

    /**
     * 获取小说的章节列表
     * @param {string} novelId - 小说ID
     * @param {string} userId - 用户ID
     * @returns {Array} - 章节列表
     */
    async getNovelChapters(novelId, userId) {
        try {
            const prisma = getPrisma();

            // 验证小说属于该用户
            const novel = await prisma.novel.findFirst({
                where: {
                    id: novelId,
                    userId,
                },
            });

            if (!novel) {
                throw new NotFoundError('Novel not found');
            }

            // 获取章节列表
            const chapters = await prisma.chapter.findMany({
                where: {
                    novelId,
                },
                select: {
                    id: true,
                    title: true,
                    order: true,
                    wordCount: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: { order: 'asc' },
            });

            return chapters.map(ch => ({
                chapterId: ch.id,
                chapterTitle: ch.title,
                order: ch.order,
                wordCount: ch.wordCount,
                createdAt: ch.createdAt,
                updatedAt: ch.updatedAt,
            }));
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Get novel chapters error:', error);
            throw new AppError('Failed to get novel chapters', 500);
        }
    }
}

module.exports = new NovelService();

