const express = require('express');
const { body } = require('express-validator');
const projectController = require('../controllers/projectController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: 获取当前用户的所有项目
 *     description: 获取当前登录用户的所有项目列表，支持分页和状态筛选
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: all
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 是否获取全部项目（不分页），设置为 true 时忽略 page 和 limit 参数
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码（当 all=false 时生效）
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页数量（当 all=false 时生效）
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, reviewing, generating, rendering, completed, failed]
 *         description: 项目状态筛选
 *     responses:
 *       200:
 *         description: 成功返回项目列表
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         projects:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Project'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page:
 *                               type: integer
 *                             limit:
 *                               type: integer
 *                             total:
 *                               type: integer
 *                             pages:
 *                               type: integer
 */
router.get('/', projectController.getProjects);

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: 获取项目详情
 *     description: 根据项目ID获取项目详细信息
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 项目ID
 *     responses:
 *       200:
 *         description: 成功返回项目详情
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Project'
 *       404:
 *         description: 项目不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', projectController.getProject);

/**
 * @swagger
 * /api/projects/{id}/model-api-config:
 *   get:
 *     summary: 获取项目指定类型模型的apiConfig
 *     description: 根据项目ID和模型类型获取当前项目使用的该类型模型的apiConfig配置
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 项目ID
 *       - in: query
 *         name: modelType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [llm, video, tts, image]
 *         description: 模型类型
 *     responses:
 *       200:
 *         description: 成功返回apiConfig
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         apiConfig:
 *                           type: object
 *                           nullable: true
 *                           description: API配置参数对象，如果项目未配置该类型模型则返回null
 *       400:
 *         description: 请求参数错误（模型类型无效）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: 项目不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/model-api-config', projectController.getProjectModelApiConfig);

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: 创建新项目
 *     description: 创建一个新的动画项目，需要配置AI模型和存储位置
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - storageLocation
 *             properties:
 *               title:
 *                 type: string
 *                 example: "我的第一个动画项目"
 *               description:
 *                 type: string
 *                 example: "项目描述"
 *               sourceText:
 *                 type: string
 *                 example: "小说文本内容"
 *               configMode:
 *                 type: string
 *                 enum: [default, custom]
 *                 default: default
 *                 description: 配置模式，default使用全局配置，custom使用自定义配置
 *                 example: "default"
 *               configLLM:
 *                 type: string
 *                 format: uuid
 *                 description: LLM模型ID
 *                 example: "uuid-of-llm-model"
 *               configLLMKey:
 *                 type: string
 *                 description: LLM API密钥（如果配置了configLLM则必填）
 *                 example: "sk-xxxxxxxxxxxxx"
 *               configVideoAI:
 *                 type: string
 *                 format: uuid
 *                 description: 视频AI模型ID
 *                 example: "uuid-of-video-model"
 *               configVideoAIKey:
 *                 type: string
 *                 description: 视频AI API密钥（如果配置了configVideoAI则必填）
 *                 example: "video-api-key-xxxxx"
 *               configTTS:
 *                 type: string
 *                 format: uuid
 *                 description: TTS模型ID
 *                 example: "uuid-of-tts-model"
 *               configTTSKey:
 *                 type: string
 *                 description: TTS API密钥（如果配置了configTTS则必填）
 *                 example: "tts-api-key-xxxxx"
 *               configImageGen:
 *                 type: string
 *                 format: uuid
 *                 description: 图片生成模型ID
 *                 example: "uuid-of-image-model"
 *               configImageGenKey:
 *                 type: string
 *                 description: 图片生成API密钥（如果配置了configImageGen则必填）
 *                 example: "sd-api-key-xxxxx"
 *               storageLocation:
 *                 type: string
 *                 enum: [local, remote]
 *                 description: 存储位置
 *                 example: "local"
 *     responses:
 *       201:
 *         description: 项目创建成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Project'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    '/',
    [
        body('title')
            .trim()
            .notEmpty()
            .withMessage('Title is required'),
        body('description')
            .optional()
            .trim(),
        body('sourceText')
            .optional()
            .trim(),
        body('configMode')
            .optional()
            .trim()
            .isIn(['default', 'custom'])
            .withMessage('configMode must be "default" or "custom"'),
        body('configLLM')
            .optional()
            .trim()
            .isString()
            .withMessage('configLLM must be a string'),
        body('configLLMKey')
            .optional()
            .custom((value, { req }) => {
                // 如果配置了 configLLM，密钥必须提供
                if (req.body.configLLM && !value) {
                    throw new Error('configLLMKey is required when configLLM is configured');
                }
                return true;
            })
            .trim()
            .isString()
            .withMessage('configLLMKey must be a string'),
        body('configVideoAI')
            .optional()
            .trim()
            .isString()
            .withMessage('configVideoAI must be a string'),
        body('configVideoAIKey')
            .optional()
            .custom((value, { req }) => {
                // 如果配置了 configVideoAI，密钥必须提供
                if (req.body.configVideoAI && !value) {
                    throw new Error('configVideoAIKey is required when configVideoAI is configured');
                }
                return true;
            })
            .trim()
            .isString()
            .withMessage('configVideoAIKey must be a string'),
        body('configTTS')
            .optional()
            .trim()
            .isString()
            .withMessage('configTTS must be a string'),
        body('configTTSKey')
            .optional()
            .custom((value, { req }) => {
                // 如果配置了 configTTS，密钥必须提供
                if (req.body.configTTS && !value) {
                    throw new Error('configTTSKey is required when configTTS is configured');
                }
                return true;
            })
            .trim()
            .isString()
            .withMessage('configTTSKey must be a string'),
        body('configImageGen')
            .optional()
            .trim()
            .isString()
            .withMessage('configImageGen must be a string'),
        body('configImageGenKey')
            .optional()
            .custom((value, { req }) => {
                // 如果配置了 configImageGen，密钥必须提供
                if (req.body.configImageGen && !value) {
                    throw new Error('configImageGenKey is required when configImageGen is configured');
                }
                return true;
            })
            .trim()
            .isString()
            .withMessage('configImageGenKey must be a string'),
        body('storageLocation')
            .trim()
            .notEmpty()
            .withMessage('Storage location is required')
            .isIn(['local', 'remote'])
            .withMessage('Storage location must be "local" or "remote"'),
    ],
    validate,
    projectController.createProject
);

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: 更新项目
 *     description: 更新项目信息
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 项目ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               sourceText:
 *                 type: string
 *               configLLM:
 *                 type: string
 *                 format: uuid
 *               configLLMKey:
 *                 type: string
 *               configVideoAI:
 *                 type: string
 *                 format: uuid
 *               configVideoAIKey:
 *                 type: string
 *               configTTS:
 *                 type: string
 *                 format: uuid
 *               configTTSKey:
 *                 type: string
 *               configImageGen:
 *                 type: string
 *                 format: uuid
 *               configImageGenKey:
 *                 type: string
 *               storageLocation:
 *                 type: string
 *                 enum: [local, remote]
 *     responses:
 *       200:
 *         description: 项目更新成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Project'
 *       404:
 *         description: 项目不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', projectController.updateProject);

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: 删除项目
 *     description: 删除指定的项目
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 项目ID
 *     responses:
 *       200:
 *         description: 项目删除成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: 项目不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', projectController.deleteProject);

/**
 * @swagger
 * /api/projects/{id}/process:
 *   post:
 *     summary: 开始处理项目
 *     description: 开始处理项目的文本内容，生成动画视频
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 项目ID
 *     responses:
 *       200:
 *         description: 处理已开始
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Project'
 *       404:
 *         description: 项目不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/process', projectController.startProcessing);

// 项目角色相关路由
const characterController = require('../controllers/characterController');

/**
 * @swagger
 * /api/projects/{id}/characters:
 *   get:
 *     summary: 获取项目的所有角色
 *     description: 获取指定项目的所有角色（包括项目专属角色和全局角色）
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 项目ID
 *     responses:
 *       200:
 *         description: 成功返回角色列表
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Character'
 *       404:
 *         description: 项目不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/characters', characterController.getProjectCharacters);

// 项目小说相关路由
const novelController = require('../controllers/novelController');

/**
 * @swagger
 * /api/projects/{id}/novels:
 *   get:
 *     summary: 获取项目的所有小说
 *     description: 获取指定项目的所有小说列表
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 项目ID
 *     responses:
 *       200:
 *         description: 成功返回小说列表
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Novel'
 *       404:
 *         description: 项目不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/novels', novelController.getProjectNovels);

module.exports = router;

