const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'StoryX API',
            version: '1.0.0',
            description: 'StoryX Backend API - AI-powered animation video generation platform',
            contact: {
                name: 'StoryX Team',
            },
            license: {
                name: 'ISC',
            },
        },
        servers: [
            {
                url: process.env.API_BASE_URL || 'http://localhost:3000',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false,
                        },
                        message: {
                            type: 'string',
                            example: 'Error message',
                        },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'object',
                            },
                        },
                    },
                },
                Success: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true,
                        },
                        message: {
                            type: 'string',
                            example: 'Success message',
                        },
                        data: {
                            type: 'object',
                        },
                    },
                },
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        username: {
                            type: 'string',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                Project: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        userId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        title: {
                            type: 'string',
                        },
                        description: {
                            type: 'string',
                        },
                        sourceText: {
                            type: 'string',
                        },
                        configLLM: {
                            type: 'string',
                        },
                        configVideoAI: {
                            type: 'string',
                        },
                        configTTS: {
                            type: 'string',
                        },
                        configImageGen: {
                            type: 'string',
                        },
                        storageLocation: {
                            type: 'string',
                            enum: ['local', 'remote'],
                        },
                        status: {
                            type: 'string',
                            enum: ['pending', 'processing', 'reviewing', 'generating', 'rendering', 'completed', 'failed'],
                        },
                        progress: {
                            type: 'integer',
                            minimum: 0,
                            maximum: 100,
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                AIModel: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        name: {
                            type: 'string',
                        },
                        displayName: {
                            type: 'string',
                        },
                        type: {
                            type: 'string',
                            enum: ['llm', 'video', 'image', 'tts'],
                        },
                        baseUrl: {
                            type: 'string',
                        },
                        provider: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                },
                                name: {
                                    type: 'string',
                                },
                                displayName: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
                Character: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        userId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        projectId: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true,
                            description: '项目ID，如果为null则表示是全局角色（所有项目共享）',
                        },
                        name: {
                            type: 'string',
                        },
                        description: {
                            type: 'string',
                        },
                        age: {
                            type: 'string',
                            nullable: true,
                            description: '角色年龄，可能是"25岁"这样的描述',
                        },
                        gender: {
                            type: 'string',
                        },
                        personality: {
                            type: 'string',
                            description: 'JSON array string',
                        },
                        appearance: {
                            type: 'string',
                        },
                        style: {
                            type: 'string',
                        },
                        voiceActor: {
                            type: 'string',
                            nullable: true,
                            description: '发音人',
                        },
                        voiceTone: {
                            type: 'string',
                            nullable: true,
                            description: '音色',
                        },
                        voiceSample: {
                            type: 'string',
                            format: 'uri',
                            nullable: true,
                            description: '音色示例（URL）',
                        },
                        clothingStyle: {
                            type: 'string',
                            nullable: true,
                            description: '服饰风格',
                        },
                        imageUrl: {
                            type: 'string',
                            nullable: true,
                            description: '角色图片URL',
                        },
                        videoUrl: {
                            type: 'string',
                            nullable: true,
                            description: '角色视频URL（从抽卡任务生成）',
                        },
                        modelUrl: {
                            type: 'string',
                            nullable: true,
                        },
                        cached: {
                            type: 'boolean',
                        },
                        usageCount: {
                            type: 'integer',
                        },
                        project: {
                            type: 'object',
                            nullable: true,
                            properties: {
                                id: {
                                    type: 'string',
                                    format: 'uuid',
                                },
                                title: {
                                    type: 'string',
                                },
                            },
                            description: '关联的项目信息（如果角色属于项目）',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
            },
            Novel: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid',
                    },
                    projectId: {
                        type: 'string',
                        format: 'uuid',
                    },
                    userId: {
                        type: 'string',
                        format: 'uuid',
                    },
                    title: {
                        type: 'string',
                    },
                    author: {
                        type: 'string',
                        nullable: true,
                    },
                    summary: {
                        type: 'string',
                        nullable: true,
                    },
                    coverUrl: {
                        type: 'string',
                        nullable: true,
                    },
                    tags: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                    },
                    fileName: {
                        type: 'string',
                    },
                    filePath: {
                        type: 'string',
                    },
                    fileSize: {
                        type: 'integer',
                    },
                    encoding: {
                        type: 'string',
                        nullable: true,
                    },
                    totalChapters: {
                        type: 'integer',
                    },
                    totalWords: {
                        type: 'integer',
                    },
                    status: {
                        type: 'string',
                    },
                    chapterList: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                chapterId: {
                                    type: 'string',
                                    format: 'uuid',
                                },
                                chapterTitle: {
                                    type: 'string',
                                },
                                order: {
                                    type: 'integer',
                                },
                                wordCount: {
                                    type: 'integer',
                                },
                            },
                        },
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                },
            },
            Chapter: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid',
                    },
                    novelId: {
                        type: 'string',
                        format: 'uuid',
                    },
                    title: {
                        type: 'string',
                    },
                    content: {
                        type: 'string',
                        nullable: true,
                    },
                    contentPath: {
                        type: 'string',
                        nullable: true,
                    },
                    order: {
                        type: 'integer',
                    },
                    wordCount: {
                        type: 'integer',
                    },
                    novel: {
                        type: 'object',
                        nullable: true,
                        properties: {
                            id: {
                                type: 'string',
                                format: 'uuid',
                            },
                            title: {
                                type: 'string',
                            },
                        },
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                },
            },
            Act: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid',
                    },
                    scriptTaskId: {
                        type: 'string',
                        format: 'uuid',
                        description: '关联的剧本生成任务ID',
                    },
                    novelId: {
                        type: 'string',
                        format: 'uuid',
                    },
                    projectId: {
                        type: 'string',
                        format: 'uuid',
                    },
                    userId: {
                        type: 'string',
                        format: 'uuid',
                    },
                    actName: {
                        type: 'string',
                        description: '剧幕名称，如 "第一幕"',
                    },
                    content: {
                        type: 'string',
                        nullable: true,
                        description: '剧幕内容描述',
                    },
                    highlight: {
                        type: 'string',
                        nullable: true,
                        description: '爽点描述',
                    },
                    emotionalCurve: {
                        type: 'string',
                        nullable: true,
                        description: '情感曲线描述',
                    },
                    rhythm: {
                        type: 'string',
                        nullable: true,
                        description: '节奏描述',
                    },
                    chapterIds: {
                        type: 'string',
                        nullable: true,
                        description: 'JSON数组，存储关联的章节ID列表',
                    },
                    order: {
                        type: 'integer',
                        description: '剧幕顺序（在任务内的顺序）',
                    },
                    startChapterOrder: {
                        type: 'integer',
                        nullable: true,
                        description: '起始章节顺序号（用于按章节顺序排序，取关联章节中的最小order值）',
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                },
            },
            Scene: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid',
                    },
                    actId: {
                        type: 'string',
                        format: 'uuid',
                        description: '关联的剧幕ID',
                    },
                    novelId: {
                        type: 'string',
                        format: 'uuid',
                    },
                    projectId: {
                        type: 'string',
                        format: 'uuid',
                    },
                    userId: {
                        type: 'string',
                        format: 'uuid',
                    },
                    address: {
                        type: 'string',
                        description: '场景地址/地点',
                    },
                    sceneDescription: {
                        type: 'string',
                        nullable: true,
                        description: '场景描述',
                    },
                    sceneImage: {
                        type: 'string',
                        format: 'uri',
                        nullable: true,
                        description: '场景图片URL',
                    },
                    shotIds: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                        nullable: true,
                        description: '关联的镜头ID列表',
                    },
                    order: {
                        type: 'integer',
                        description: '场景顺序',
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: [
        path.join(__dirname, '../routes/*.js'),
        path.join(__dirname, '../app.js'),
    ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

