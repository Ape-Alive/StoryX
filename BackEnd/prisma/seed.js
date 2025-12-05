const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding AI providers and models...');

    // Create AI Providers
    const deepseek = await prisma.aIProvider.upsert({
        where: { name: 'deepseek' },
        update: {},
        create: {
            name: 'deepseek',
            displayName: 'DeepSeek',
            description: 'DeepSeek AI - 专注于大语言模型',
            website: 'https://www.deepseek.com',
            isActive: true,
        },
    });

    const openai = await prisma.aIProvider.upsert({
        where: { name: 'openai' },
        update: {},
        create: {
            name: 'openai',
            displayName: 'OpenAI',
            description: 'OpenAI - 领先的人工智能研究公司',
            website: 'https://openai.com',
            isActive: true,
        },
    });

    const stability = await prisma.aIProvider.upsert({
        where: { name: 'stability-ai' },
        update: {},
        create: {
            name: 'stability-ai',
            displayName: 'Stability AI',
            description: 'Stability AI - 图像生成模型',
            website: 'https://stability.ai',
            isActive: true,
        },
    });

    const anthropic = await prisma.aIProvider.upsert({
        where: { name: 'anthropic' },
        update: {},
        create: {
            name: 'anthropic',
            displayName: 'Anthropic',
            description: 'Anthropic - Claude AI 模型',
            website: 'https://www.anthropic.com',
            isActive: true,
        },
    });

    const doubao = await prisma.aIProvider.upsert({
        where: { name: 'doubao' },
        update: {},
        create: {
            name: 'doubao',
            displayName: '豆包',
            description: '字节跳动豆包 - AI 语言模型和语音合成',
            website: 'https://www.volcengine.com/product/doubao',
            isActive: true,
        },
    });

    // Create LLM Models
    await prisma.aIModel.upsert({
        where: {
            providerId_name: {
                providerId: deepseek.id,
                name: 'deepseek-chat',
            },
        },
        update: {},
        create: {
            providerId: deepseek.id,
            name: 'deepseek-chat',
            displayName: 'DeepSeek Chat',
            description: 'DeepSeek 对话模型',
            type: 'llm',
            category: 'chat',
            baseUrl: 'https://api.deepseek.com/v1',
            isActive: true,
            requiresKey: true,
        },
    });

    await prisma.aIModel.upsert({
        where: {
            providerId_name: {
                providerId: openai.id,
                name: 'gpt-4',
            },
        },
        update: {},
        create: {
            providerId: openai.id,
            name: 'gpt-4',
            displayName: 'GPT-4',
            description: 'OpenAI GPT-4 模型',
            type: 'llm',
            category: 'chat',
            baseUrl: 'https://api.openai.com/v1',
            isActive: true,
            requiresKey: true,
        },
    });

    await prisma.aIModel.upsert({
        where: {
            providerId_name: {
                providerId: openai.id,
                name: 'gpt-3.5-turbo',
            },
        },
        update: {},
        create: {
            providerId: openai.id,
            name: 'gpt-3.5-turbo',
            displayName: 'GPT-3.5 Turbo',
            description: 'OpenAI GPT-3.5 Turbo 模型',
            type: 'llm',
            category: 'chat',
            baseUrl: 'https://api.openai.com/v1',
            isActive: true,
            requiresKey: true,
        },
    });

    await prisma.aIModel.upsert({
        where: {
            providerId_name: {
                providerId: anthropic.id,
                name: 'claude-3-opus',
            },
        },
        update: {},
        create: {
            providerId: anthropic.id,
            name: 'claude-3-opus',
            displayName: 'Claude 3 Opus',
            description: 'Anthropic Claude 3 Opus 模型',
            type: 'llm',
            category: 'chat',
            baseUrl: 'https://api.anthropic.com/v1',
            isActive: true,
            requiresKey: true,
        },
    });

    // Create Video AI Models (示例)
    await prisma.aIModel.upsert({
        where: {
            providerId_name: {
                providerId: openai.id,
                name: 'sora',
            },
        },
        update: {},
        create: {
            providerId: openai.id,
            name: 'sora',
            displayName: 'Sora',
            description: 'OpenAI 视频生成模型',
            type: 'video',
            category: 'generation',
            baseUrl: 'https://api.openai.com/v1',
            isActive: true,
            requiresKey: true,
        },
    });

    // Create Image Generation Models
    await prisma.aIModel.upsert({
        where: {
            providerId_name: {
                providerId: stability.id,
                name: 'stable-diffusion-xl',
            },
        },
        update: {},
        create: {
            providerId: stability.id,
            name: 'stable-diffusion-xl',
            displayName: 'Stable Diffusion XL',
            description: 'Stability AI Stable Diffusion XL 模型',
            type: 'image',
            category: 'generation',
            baseUrl: 'https://api.stability.ai/v1',
            isActive: true,
            requiresKey: true,
        },
    });

    await prisma.aIModel.upsert({
        where: {
            providerId_name: {
                providerId: openai.id,
                name: 'dall-e-3',
            },
        },
        update: {},
        create: {
            providerId: openai.id,
            name: 'dall-e-3',
            displayName: 'DALL-E 3',
            description: 'OpenAI DALL-E 3 图像生成模型',
            type: 'image',
            category: 'generation',
            baseUrl: 'https://api.openai.com/v1',
            isActive: true,
            requiresKey: true,
        },
    });

    // Create TTS Models
    await prisma.aIModel.upsert({
        where: {
            providerId_name: {
                providerId: openai.id,
                name: 'tts-1',
            },
        },
        update: {},
        create: {
            providerId: openai.id,
            name: 'tts-1',
            displayName: 'OpenAI TTS',
            description: 'OpenAI 文本转语音模型',
            type: 'tts',
            category: 'synthesis',
            baseUrl: 'https://api.openai.com/v1',
            isActive: true,
            requiresKey: true,
        },
    });

    // 豆包 TTS 模型
    await prisma.aIModel.upsert({
        where: {
            providerId_name: {
                providerId: doubao.id,
                name: 'doubao-tts',
            },
        },
        update: {},
        create: {
            providerId: doubao.id,
            name: 'doubao-tts',
            displayName: '豆包语音合成',
            description: '字节跳动豆包文本转语音模型',
            type: 'tts',
            category: 'synthesis',
            baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
            isActive: true,
            requiresKey: true,
        },
    });

    // 创建默认系统提示词
    console.log('📝 Creating default system prompts...');

    const defaultPrompts = [
        {
            name: '文本扩写',
            functionKey: 'text_expansion',
            description: '用于文本扩写功能的系统提示词',
            prompt: '你是一个专业的小说扩写助手。请根据用户提供的文本片段，进行合理的扩写，保持原有的风格和情节连贯性。扩写后的文本应该更加丰富详细，但不要改变原有的核心内容。',
            category: 'llm',
            isActive: true,
        },
        {
            name: '剧本生成',
            functionKey: 'script_generation',
            description: '用于剧本结构化生成功能的系统提示词',
            prompt: `你是一个专业的剧本结构化助手。请将提供的小说章节内容转换为结构化的剧本格式。

返回的JSON数据结构必须包含以下字段：
{
  "character_settings": [
    {
      "id": "uuid唯一标识",
      "name": "角色名",
      "age": "角色年龄范围",
      "appearance": "角色外貌",
      "personality": "角色人格特质",
      "background": "人物背景"
    }
  ],
  "plot_outline": [
    {
      "id": "uuid唯一标识",
      "act": "第一幕",
      "scene": [
        {
          "address": "地点A",
          "sceneDescription": "详细的环境描述、氛围设定、时间信息等"
        }
      ],
      "content": "内容",
      "highlight": "爽点",
      "emotional_curve": "情感曲线描述",
      "rhythm": "节奏描述（紧张/舒缓/高潮）",
      "shots": [
        {
          "id": "uuid唯一标识",
          "shot_id": 1,
          "duration": 3,
          "shot_type": "中景",
          "framing": "中景",
          "camera_angle": "平视",
          "camera_movement": "缓慢推进",
          "character_action": "动态动作描述，体现角色间的互动",
          "expression": "表情细节",
          "dialogue": [
            {
              "id": "uuid唯一标识",
              "name": "说话者姓名",
              "say": "具体台词内容",
              "mood": "说话时的情绪状态"
            }
          ],
          "voiceover": "画外音-人物心理独白",
          "lighting": "光线效果",
          "atmosphere": "氛围营造",
          "bgm": "背景音乐",
          "fx": "音效",
          "is_transition": false
        }
      ]
    }
  ]
}

请严格按照JSON格式返回，不要包含任何其他文本。`,
            category: 'llm',
            isActive: true,
        },
        {
            name: '角色图片生成',
            functionKey: 'character_image_generation',
            description: '用于角色图片生成功能的系统提示词模板',
            prompt: `你是一个专业的角色图片生成助手。请根据提供的角色信息生成高质量的图片。

角色信息将包含以下字段：
- appearance: 角色外貌描述
- clothingStyle: 服装风格
- age: 年龄
- gender: 性别
- background: 背景信息
- description: 其他描述

请将角色信息转换为详细的图片生成提示词，要求：
1. 详细描述角色的外貌特征
2. 包含服装和配饰的细节
3. 描述角色的表情和姿态
4. 确保生成高质量、专业、细节丰富的图片
5. 风格要与角色设定一致

输出格式：直接输出图片生成提示词，不要包含其他解释文字。`,
            category: 'image',
            isActive: true,
        },
        {
            name: '角色视频生成',
            functionKey: 'character_video_generation',
            description: '用于角色视频生成功能的系统提示词模板',
            prompt: `你是一个专业的角色视频生成助手。请根据提供的角色信息生成高质量的视频。

角色信息将包含以下字段：
- appearance: 角色外貌描述
- clothingStyle: 服装风格
- age: 年龄
- gender: 性别
- background: 背景信息
- description: 其他描述

请将角色信息转换为详细的视频生成提示词，要求：
1. 详细描述角色的外貌特征
2. 包含服装和配饰的细节
3. 描述角色的动作和运动轨迹
4. 确保生成高质量、流畅、自然的视频
5. 视频时长通常为2秒，动作要连贯
6. 风格要与角色设定一致

输出格式：直接输出视频生成提示词，不要包含其他解释文字。`,
            category: 'video',
            isActive: true,
        },
        {
            name: '场景图生成',
            functionKey: 'scene_image_generation',
            description: '用于场景图生成功能的系统提示词模板',
            prompt: `你是一个专业的场景图生成助手。请根据提供的场景信息生成高质量的图片。

场景信息将包含以下字段：
- address: 场景地点/地址
- sceneDescription: 场景详细描述（包含环境、氛围、时间等信息）

请将场景信息转换为详细的图片生成提示词，要求：
1. 详细描述场景的地理位置和环境
2. 包含氛围和光线效果的描述
3. 描述场景的时间信息（如白天、夜晚、黄昏等）
4. 确保生成高质量、专业、电影级的场景图片
5. 风格要符合场景的氛围设定
6. 适合作为影视场景背景使用

输出格式：直接输出图片生成提示词，不要包含其他解释文字。`,
            category: 'image',
            isActive: true,
        },
    ];

    for (const promptData of defaultPrompts) {
        const existing = await prisma.systemPrompt.findUnique({
            where: { functionKey: promptData.functionKey },
        });

        if (!existing) {
            await prisma.systemPrompt.create({
                data: promptData,
            });
            console.log(`  ✅ Created system prompt: ${promptData.name}`);
        } else {
            console.log(`  ⏭️  System prompt already exists: ${promptData.name}`);
        }
    }

    console.log('✅ Database seeded successfully');
}

main()
    .catch((e) => {
        console.error('Error seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

