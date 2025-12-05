const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const { parse: parseEpub } = require('epub-parser');
const mammoth = require('mammoth');
const jschardet = require('jschardet');
const logger = require('../utils/logger');

class NovelParserService {
    /**
     * 统计中文字数（只统计中文字符，不包括标点、数字、英文、空格等）
     * @param {string} text - 文本内容
     * @returns {number} - 字数
     */
    countChineseWords(text) {
        if (!text) return 0;
        // 匹配中文字符（包括中文标点）
        const chineseChars = text.match(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g);
        return chineseChars ? chineseChars.length : 0;
    }

    /**
     * 检测文件编码
     * @param {Buffer} buffer - 文件缓冲区
     * @param {string} defaultEncoding - 默认编码
     * @returns {string} - 检测到的编码
     */
    detectEncoding(buffer, defaultEncoding = 'UTF-8') {
        try {
            // 使用 jschardet 检测编码
            const detected = jschardet.detect(buffer);

            if (detected && detected.encoding) {
                let encoding = detected.encoding.toUpperCase();

                // 标准化编码名称
                const encodingMap = {
                    'GB2312': 'GBK',
                    'GB18030': 'GBK',
                    'BIG5': 'BIG5',
                    'UTF-8': 'UTF-8',
                    'UTF8': 'UTF-8',
                    'ASCII': 'UTF-8',
                    'ISO-8859-1': 'UTF-8', // 通常可以按 UTF-8 处理
                };

                encoding = encodingMap[encoding] || encoding;

                // 验证编码是否有效
                try {
                    const testText = iconv.decode(buffer.slice(0, Math.min(1000, buffer.length)), encoding);
                    if (testText && testText.length > 0) {
                        logger.info('Detected encoding', { encoding, confidence: detected.confidence });
                        return encoding;
                    }
                } catch (e) {
                    logger.warn('Encoding detection failed, trying alternatives', { encoding, error: e.message });
                }
            }

            // 回退方案：尝试常见编码
            const encodings = ['UTF-8', 'GBK', 'GB2312', 'BIG5', 'UTF-16LE', 'UTF-16BE'];
            for (const enc of encodings) {
                try {
                    const testText = iconv.decode(buffer.slice(0, Math.min(1000, buffer.length)), enc);
                    // 检查是否包含乱码字符（大量问号或特殊字符）
                    const invalidChars = (testText.match(/\?/g) || []).length;
                    if (testText.length > 0 && invalidChars < testText.length * 0.1) {
                        logger.info('Fallback encoding detection', { encoding: enc });
                        return enc;
                    }
                } catch (e) {
                    continue;
                }
            }

            logger.warn('Using default encoding', { defaultEncoding });
            return defaultEncoding;
        } catch (error) {
            logger.error('Encoding detection error', { error: error.message });
            return defaultEncoding;
        }
    }

    /**
     * 解析 TXT 文件
     * @param {string} filePath - 文件路径
     * @param {string} encoding - 文件编码
     * @returns {Object} - 解析结果
     */
    async parseTxt(filePath, encoding = 'UTF-8') {
        try {
            const buffer = fs.readFileSync(filePath);
            const detectedEncoding = this.detectEncoding(buffer, encoding);
            const content = iconv.decode(buffer, detectedEncoding);

            // 解析章节
            const chapters = this.parseChapters(content);

            // 提取元数据
            const metadata = this.extractMetadata(content);

            return {
                encoding: detectedEncoding,
                content,
                chapters,
                metadata,
            };
        } catch (error) {
            logger.error('Parse TXT error:', error);
            throw new Error(`Failed to parse TXT file: ${error.message}`);
        }
    }

    /**
     * 解析 EPUB 文件
     * @param {string} filePath - 文件路径
     * @returns {Object} - 解析结果
     */
    async parseEpub(filePath) {
        try {
            const epub = await parseEpub(filePath);

            const chapters = [];
            let totalWords = 0;

            // 解析章节
            for (let i = 0; i < epub.flow.length; i++) {
                const item = epub.flow[i];
                if (item.type === 'text/html' || item.type === 'application/xhtml+xml') {
                    const content = item.data || '';
                    const textContent = this.stripHtml(content);
                    const title = this.extractChapterTitle(content) || `第${chapters.length + 1}章`;

                    const wordCount = this.countChineseWords(textContent);
                    chapters.push({
                        title,
                        content: textContent,
                        order: chapters.length + 1,
                        wordCount: wordCount,
                    });

                    totalWords += wordCount;
                }
            }

            // 提取元数据
            const metadata = {
                title: epub.metadata?.title?.[0] || '',
                author: epub.metadata?.creator?.[0] || '',
                summary: epub.metadata?.description?.[0] || '',
                coverUrl: epub.cover ? path.join(filePath, '..', epub.cover) : null,
            };

            return {
                encoding: 'UTF-8',
                content: chapters.map(c => c.content).join('\n\n'),
                chapters,
                metadata,
            };
        } catch (error) {
            logger.error('Parse EPUB error:', error);
            throw new Error(`Failed to parse EPUB file: ${error.message}`);
        }
    }

    /**
     * 解析 DOC/DOCX 文件
     * @param {string} filePath - 文件路径
     * @returns {Object} - 解析结果
     */
    async parseDoc(filePath) {
        try {
            const result = await mammoth.extractRawText({ path: filePath });
            const content = result.value;

            // 解析章节
            const chapters = this.parseChapters(content);

            // 提取元数据
            const metadata = this.extractMetadata(content);

            return {
                encoding: 'UTF-8',
                content,
                chapters,
                metadata,
            };
        } catch (error) {
            logger.error('Parse DOC error:', error);
            throw new Error(`Failed to parse DOC file: ${error.message}`);
        }
    }

    /**
     * 检查是否是章节标题行
     * @param {string} line - 文本行
     * @returns {boolean} - 是否是章节标题
     */
    isChapterTitle(line) {
        if (!line || line.length < 2) {
            return false;
        }

        const trimmedLine = line.trim();

        // 如果行太长（超过100字符），不太可能是章节标题
        if (trimmedLine.length > 100) {
            return false;
        }

        // 扩展的章节标题模式
        const chapterPatterns = [
            // 基础格式：第X章、第X节
            /^第[一二三四五六七八九十百千万\d]+章[^\n]*$/,
            /^第[一二三四五六七八九十百千万\d]+节[^\n]*$/,
            /^第\d+章[^\n]*$/,
            /^第\d+节[^\n]*$/,

            // 带括号：第一章(1)、第一章（1）
            /^第[一二三四五六七八九十百千万\d]+章[（(]\d+[）)]/,
            /^第\d+章[（(]\d+[）)]/,

            // 包含集/卷/部：第一集 第一章、第一卷 第一章
            /^第[一二三四五六七八九十百千万\d]+[集卷部][^\n]*第[一二三四五六七八九十百千万\d]+章[^\n]*$/,
            /^第\d+[集卷部][^\n]*第\d+章[^\n]*$/,

            // 正文 第一章、正文 第X章
            /^正文\s*第[一二三四五六七八九十百千万\d]+章[^\n]*$/,
            /^正文\s*第\d+章[^\n]*$/,

            // 书名 正文 第一章：如《极品家丁》 正文 第一章
            /^[《【].*?[》】]\s*正文\s*第[一二三四五六七八九十百千万\d]+章[^\n]*$/,
            /^[《【].*?[》】]\s*正文\s*第\d+章[^\n]*$/,

            // 英文格式
            /^Chapter\s+\d+[^\n]*$/i,
            /^Chapter\s+[IVXLCDM]+[^\n]*$/i, // 罗马数字

            // 带空格的格式：第 X 章
            /^第\s*[一二三四五六七八九十百千万\d]+\s*章[^\n]*$/,
            /^第\s*\d+\s*章[^\n]*$/,

            // 其他变体
            /^[第]\s*[一二三四五六七八九十百千万]+\s*[章节][^\n]*$/,
            /^[第]\s*\d+\s*[章节][^\n]*$/,
        ];

        // 检查是否匹配任何模式
        for (const pattern of chapterPatterns) {
            if (pattern.test(trimmedLine)) {
                return true;
            }
        }

        // 额外检查：如果行很短且包含"第"和"章"或"节"，也可能是章节标题
        if (trimmedLine.length < 50 && /第.*[章节]/.test(trimmedLine)) {
            // 进一步验证：不应该包含太多标点符号或特殊字符
            const punctuationCount = (trimmedLine.match(/[，。！？；：]/g) || []).length;
            if (punctuationCount <= 2) {
                return true;
            }
        }

        return false;
    }

    /**
     * 解析章节
     * @param {string} content - 文本内容
     * @returns {Array} - 章节列表
     */
    parseChapters(content) {
        const chapters = [];

        // 按行分割
        const lines = content.split(/\r?\n/);
        let currentChapter = null;
        let currentContent = [];
        let lastChapterIndex = -1; // 记录上一章的索引，用于检测连续章节标题

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // 跳过空行（在章节标题检测时）
            if (!trimmedLine) {
                if (currentChapter) {
                    currentContent.push(line); // 保留空行在内容中
                }
                continue;
            }

            // 检查是否是章节标题
            const isChapterTitle = this.isChapterTitle(trimmedLine);

            if (isChapterTitle) {
                // 如果距离上一章太近（少于3行），可能是误判，跳过
                if (lastChapterIndex >= 0 && i - lastChapterIndex < 3) {
                    if (currentChapter) {
                        currentContent.push(line);
                    }
                    continue;
                }

                // 保存上一章
                if (currentChapter) {
                    const chapterContent = currentContent.join('\n').trim();
                    // 只有当内容不为空时才保存章节
                    if (chapterContent.length > 0) {
                        const wordCount = this.countChineseWords(chapterContent);
                        chapters.push({
                            title: currentChapter,
                            content: chapterContent,
                            order: chapters.length + 1,
                            wordCount: wordCount,
                        });
                    }
                }

                // 开始新章节
                currentChapter = trimmedLine;
                currentContent = [];
                lastChapterIndex = i;
            } else if (currentChapter) {
                // 添加到当前章节内容
                currentContent.push(line);
            } else if (trimmedLine.length > 0) {
                // 在第一个章节之前的内容，可能是简介或前言
                // 但如果是明显的正文内容（很长），也保存为第一章
                if (trimmedLine.length > 50 || currentContent.length > 10) {
                    // 可能是没有章节标题的正文，先保存起来
                    currentContent.push(line);
                }
            }
        }

        // 保存最后一章
        if (currentChapter) {
            const chapterContent = currentContent.join('\n').trim();
            if (chapterContent.length > 0) {
                chapters.push({
                    title: currentChapter,
                    content: chapterContent,
                    order: chapters.length + 1,
                    wordCount: chapterContent.length,
                });
            }
        } else if (currentContent.length > 0) {
            // 如果没有找到章节标题，将整个内容作为一章
            const chapterContent = currentContent.join('\n').trim();
            if (chapterContent.length > 0) {
                chapters.push({
                    title: '正文',
                    content: chapterContent,
                    order: 1,
                    wordCount: chapterContent.length,
                });
            }
        }

        // 如果只解析出一章，可能是解析失败，尝试更宽松的匹配
        if (chapters.length === 0 || (chapters.length === 1 && chapters[0].title === '正文')) {
            logger.warn('Chapter parsing may have failed, trying relaxed matching');
            return this.parseChaptersRelaxed(content);
        }

        return chapters;
    }

    /**
     * 更宽松的章节解析（备用方案）
     * @param {string} content - 文本内容
     * @returns {Array} - 章节列表
     */
    parseChaptersRelaxed(content) {
        const chapters = [];
        const lines = content.split(/\r?\n/);
        let currentChapter = null;
        let currentContent = [];

        // 更宽松的模式：只要包含"第"和"章"或"节"就认为是章节标题
        const relaxedPattern = /第.*?[章节]/;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            if (!trimmedLine) {
                if (currentChapter) {
                    currentContent.push(line);
                }
                continue;
            }

            // 宽松匹配：包含"第"和"章"/"节"，且行长度不超过80字符
            if (relaxedPattern.test(trimmedLine) && trimmedLine.length <= 80) {
                if (currentChapter) {
                    const chapterContent = currentContent.join('\n').trim();
                    if (chapterContent.length > 0) {
                        const wordCount = this.countChineseWords(chapterContent);
                        chapters.push({
                            title: currentChapter,
                            content: chapterContent,
                            order: chapters.length + 1,
                            wordCount: wordCount,
                        });
                    }
                }

                currentChapter = trimmedLine;
                currentContent = [];
            } else if (currentChapter) {
                currentContent.push(line);
            } else {
                currentContent.push(line);
            }
        }

        // 保存最后一章
        if (currentChapter) {
            const chapterContent = currentContent.join('\n').trim();
            if (chapterContent.length > 0) {
                chapters.push({
                    title: currentChapter,
                    content: chapterContent,
                    order: chapters.length + 1,
                    wordCount: chapterContent.length,
                });
            }
        } else if (currentContent.length > 0) {
            const chapterContent = currentContent.join('\n').trim();
            if (chapterContent.length > 0) {
                chapters.push({
                    title: '正文',
                    content: chapterContent,
                    order: 1,
                    wordCount: chapterContent.length,
                });
            }
        }

        return chapters;
    }

    /**
     * 提取元数据
     * @param {string} content - 文本内容
     * @returns {Object} - 元数据
     */
    extractMetadata(content) {
        const metadata = {
            title: '',
            author: '',
            summary: '',
            tags: [],
        };

        // 提取书名（通常在文件开头）
        const titlePatterns = [
            /书名[：:]\s*([^\n]+)/,
            /《([^》]+)》/,
            /^([^\n]{2,20})$/m,
        ];

        for (const pattern of titlePatterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
                metadata.title = match[1].trim();
                break;
            }
        }

        // 提取作者
        const authorPatterns = [
            /作者[：:]\s*([^\n]+)/,
            /^作者[：:]\s*([^\n]+)/m,
            /著[：:]\s*([^\n]+)/,
        ];

        for (const pattern of authorPatterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
                metadata.author = match[1].trim();
                break;
            }
        }

        // 提取简介（通常在书名和作者之后，章节之前）
        const summaryPattern = /简介[：:]\s*([\s\S]+?)(?=第[一二三四五六七八九十百千万\d]+章|第\d+章|$)/;
        const summaryMatch = content.match(summaryPattern);
        if (summaryMatch && summaryMatch[1]) {
            metadata.summary = summaryMatch[1].trim().substring(0, 500); // 限制长度
        } else {
            // 如果没有找到简介，取前500字作为简介
            const firstChapterIndex = content.search(/第[一二三四五六七八九十百千万\d]+章|第\d+章/);
            if (firstChapterIndex > 0) {
                metadata.summary = content.substring(0, Math.min(firstChapterIndex, 500)).trim();
            }
        }

        return metadata;
    }

    /**
     * 从 HTML 中提取纯文本
     * @param {string} html - HTML 内容
     * @returns {string} - 纯文本
     */
    stripHtml(html) {
        return html
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .trim();
    }

    /**
     * 从 HTML 中提取章节标题
     * @param {string} html - HTML 内容
     * @returns {string} - 章节标题
     */
    extractChapterTitle(html) {
        const titleMatch = html.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i);
        if (titleMatch) {
            return this.stripHtml(titleMatch[1]);
        }
        return null;
    }

    /**
     * 根据文件扩展名选择解析器
     * @param {string} filePath - 文件路径
     * @param {string} encoding - 文件编码
     * @returns {Object} - 解析结果
     */
    async parseFile(filePath, encoding = 'UTF-8') {
        const ext = path.extname(filePath).toLowerCase();

        switch (ext) {
            case '.txt':
                return await this.parseTxt(filePath, encoding);
            case '.epub':
                return await this.parseEpubFile(filePath);
            case '.doc':
            case '.docx':
                return await this.parseDoc(filePath);
            default:
                throw new Error(`Unsupported file type: ${ext}`);
        }
    }
}

module.exports = new NovelParserService();

