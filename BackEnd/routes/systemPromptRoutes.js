const express = require('express');
const { body } = require('express-validator');
const systemPromptController = require('../controllers/systemPromptController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/system-prompts:
 *   post:
 *     summary: 创建系统提示词
 *     description: 创建新的系统提示词，用于配置AI功能
 *     tags: [SystemPrompts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - functionKey
 *               - prompt
 *             properties:
 *               name:
 *                 type: string
 *                 description: 提示词名称
 *               functionKey:
 *                 type: string
 *                 description: 功能标识（唯一，如：text_expansion, script_generation等）
 *               description:
 *                 type: string
 *                 description: 功能描述
 *               prompt:
 *                 type: string
 *                 description: 提示词内容
 *               category:
 *                 type: string
 *                 description: 分类（如：llm, video, image, tts等）
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 description: 是否启用
 *               metadata:
 *                 type: object
 *                 description: 额外配置信息（JSON对象）
 *     responses:
 *       201:
 *         description: 系统提示词创建成功
 *       400:
 *         description: 请求参数错误
 */
router.post(
    '/',
    [
        body('name')
            .notEmpty()
            .withMessage('name is required'),
        body('functionKey')
            .notEmpty()
            .withMessage('functionKey is required')
            .matches(/^[a-z_]+$/)
            .withMessage('functionKey must contain only lowercase letters and underscores'),
        body('prompt')
            .notEmpty()
            .withMessage('prompt is required'),
    ],
    validate,
    systemPromptController.createSystemPrompt
);

/**
 * @swagger
 * /api/system-prompts:
 *   get:
 *     summary: 获取所有系统提示词
 *     description: 获取所有系统提示词列表，支持按分类和状态筛选
 *     tags: [SystemPrompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 分类筛选（可选）
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: 是否启用筛选（可选）
 *     responses:
 *       200:
 *         description: 成功返回提示词列表
 */
router.get('/', systemPromptController.getAllSystemPrompts);

/**
 * @swagger
 * /api/system-prompts/{id}:
 *   get:
 *     summary: 根据ID获取系统提示词
 *     tags: [SystemPrompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 成功返回提示词
 *       404:
 *         description: 提示词不存在
 */
router.get('/:id', systemPromptController.getSystemPromptById);

/**
 * @swagger
 * /api/system-prompts/{id}:
 *   put:
 *     summary: 更新系统提示词
 *     tags: [SystemPrompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               functionKey:
 *                 type: string
 *               description:
 *                 type: string
 *               prompt:
 *                 type: string
 *               category:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 提示词不存在
 */
router.put(
    '/:id',
    [
        body('functionKey')
            .optional()
            .matches(/^[a-z_]+$/)
            .withMessage('functionKey must contain only lowercase letters and underscores'),
    ],
    validate,
    systemPromptController.updateSystemPrompt
);

/**
 * @swagger
 * /api/system-prompts/{id}:
 *   delete:
 *     summary: 删除系统提示词
 *     tags: [SystemPrompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 提示词不存在
 */
router.delete('/:id', systemPromptController.deleteSystemPrompt);

/**
 * @swagger
 * /api/system-prompts/function/{functionKey}:
 *   get:
 *     summary: 根据功能标识获取系统提示词
 *     tags: [SystemPrompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: functionKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功返回提示词
 *       404:
 *         description: 提示词不存在
 */
router.get('/function/:functionKey', systemPromptController.getSystemPromptByFunctionKey);

/**
 * @swagger
 * /api/system-prompts/category/{category}:
 *   get:
 *     summary: 根据分类获取系统提示词
 *     tags: [SystemPrompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功返回提示词列表
 */
router.get('/category/:category', systemPromptController.getSystemPromptsByCategory);

module.exports = router;

