const express = require('express');
const { body } = require('express-validator');
const globalConfigController = require('../controllers/globalConfigController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/global-config:
 *   get:
 *     summary: 获取全局配置
 *     description: 获取系统的全局配置信息（不包含密钥）
 *     tags: [GlobalConfig]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回全局配置
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
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         configLLM:
 *                           type: string
 *                           format: uuid
 *                           description: LLM模型UUID
 *                         configVideoAI:
 *                           type: string
 *                           format: uuid
 *                           description: 视频AI模型UUID
 *                         configTTS:
 *                           type: string
 *                           format: uuid
 *                           description: TTS模型UUID
 *                         configImageGen:
 *                           type: string
 *                           format: uuid
 *                           description: 图片生成模型UUID
 */
router.get('/', globalConfigController.getGlobalConfig);

/**
 * @swagger
 * /api/global-config:
 *   put:
 *     summary: 更新全局配置
 *     description: 更新系统的全局配置信息
 *     tags: [GlobalConfig]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               configLLM:
 *                 type: string
 *                 format: uuid
 *                 description: LLM模型UUID
 *               configLLMKey:
 *                 type: string
 *                 description: LLM API密钥（如果配置了configLLM则必填）
 *               configVideoAI:
 *                 type: string
 *                 format: uuid
 *                 description: 视频AI模型UUID
 *               configVideoAIKey:
 *                 type: string
 *                 description: 视频AI API密钥（如果配置了configVideoAI则必填）
 *               configTTS:
 *                 type: string
 *                 format: uuid
 *                 description: TTS模型UUID
 *               configTTSKey:
 *                 type: string
 *                 description: TTS API密钥（如果配置了configTTS则必填）
 *               configImageGen:
 *                 type: string
 *                 format: uuid
 *                 description: 图片生成模型UUID
 *               configImageGenKey:
 *                 type: string
 *                 description: 图片生成API密钥（如果配置了configImageGen则必填）
 *     responses:
 *       200:
 *         description: 全局配置更新成功
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
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         configLLM:
 *                           type: string
 *                           format: uuid
 *                         configVideoAI:
 *                           type: string
 *                           format: uuid
 *                         configTTS:
 *                           type: string
 *                           format: uuid
 *                         configImageGen:
 *                           type: string
 *                           format: uuid
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
    '/',
    [
        body('configLLM')
            .optional()
            .trim()
            .isString()
            .withMessage('configLLM must be a string'),
        body('configLLMKey')
            .optional()
            .custom((value, { req }) => {
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
                if (req.body.configImageGen && !value) {
                    throw new Error('configImageGenKey is required when configImageGen is configured');
                }
                return true;
            })
            .trim()
            .isString()
            .withMessage('configImageGenKey must be a string'),
    ],
    validate,
    globalConfigController.updateGlobalConfig
);

module.exports = router;

