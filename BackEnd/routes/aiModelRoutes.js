const express = require('express');
const aiModelController = require('../controllers/aiModelController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Public routes (read-only)
// All GET routes are public (can be accessed without authentication)

// Protected routes (write operations require authentication)
// POST, PUT, DELETE routes require authentication

/**
 * @swagger
 * /api/ai-models/config-options:
 *   get:
 *     summary: 获取项目配置选项
 *     description: 获取用于项目创建的AI模型配置选项，按类型分组（LLM、视频、图片、TTS）
 *     tags: [AI Models]
 *     security: []
 *     responses:
 *       200:
 *         description: 成功返回配置选项
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
 *                         llm:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AIModel'
 *                         video:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AIModel'
 *                         image:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AIModel'
 *                         tts:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AIModel'
 */
router.get('/config-options', aiModelController.getConfigOptions);

// ==================== Provider Routes (must be before /:id) ====================

/**
 * @swagger
 * /api/ai-models/providers:
 *   get:
 *     summary: 获取所有AI提供商
 *     description: 获取所有活跃的AI服务提供商列表
 *     tags: [AI Models]
 *     security: []
 *     responses:
 *       200:
 *         description: 成功返回提供商列表
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
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                           description:
 *                             type: string
 *                           website:
 *                             type: string
 *                           logoUrl:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 */
router.get('/providers', aiModelController.getProviders);

/**
 * @swagger
 * /api/ai-models/providers/all:
 *   get:
 *     summary: 获取所有提供商（包括未启用的）
 *     description: 获取所有AI服务提供商列表，包括未启用的
 *     tags: [AI Models]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回提供商列表
 */
router.get('/providers/all', authenticate, aiModelController.getAllProviders);

/**
 * @swagger
 * /api/ai-models/providers/{id}:
 *   get:
 *     summary: 获取提供商详情
 *     description: 根据提供商ID获取详细信息
 *     tags: [AI Models]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 成功返回提供商详情
 *       404:
 *         description: 提供商不存在
 */
router.get('/providers/:id', aiModelController.getProviderById);

/**
 * @swagger
 * /api/ai-models/providers:
 *   post:
 *     summary: 创建新提供商
 *     description: 创建一个新的AI服务提供商
 *     tags: [AI Models]
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
 *               - displayName
 *             properties:
 *               name:
 *                 type: string
 *                 description: 提供商名称（唯一标识）
 *               displayName:
 *                 type: string
 *                 description: 显示名称
 *               description:
 *                 type: string
 *                 description: 提供商描述
 *               website:
 *                 type: string
 *                 description: 官网链接
 *               logoUrl:
 *                 type: string
 *                 description: Logo链接
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: 提供商创建成功
 *       400:
 *         description: 请求参数错误
 */
router.post('/providers', authenticate, aiModelController.createProvider);

/**
 * @swagger
 * /api/ai-models/providers/{id}:
 *   put:
 *     summary: 更新提供商
 *     description: 更新提供商信息
 *     tags: [AI Models]
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
 *               displayName:
 *                 type: string
 *               description:
 *                 type: string
 *               website:
 *                 type: string
 *               logoUrl:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 提供商更新成功
 *       404:
 *         description: 提供商不存在
 */
router.put('/providers/:id', authenticate, aiModelController.updateProvider);

/**
 * @swagger
 * /api/ai-models/providers/{id}:
 *   delete:
 *     summary: 删除提供商
 *     description: 删除提供商（如果有关联的模型，将无法删除）
 *     tags: [AI Models]
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
 *         description: 提供商删除成功
 *       400:
 *         description: 提供商下还有模型，无法删除
 *       404:
 *         description: 提供商不存在
 */
router.delete('/providers/:id', authenticate, aiModelController.deleteProvider);

/**
 * @swagger
 * /api/ai-models/grouped:
 *   get:
 *     summary: 获取按类型分组的模型
 *     description: 获取所有AI模型，按类型（LLM、视频、图片、TTS）分组
 *     tags: [AI Models]
 *     security: []
 *     responses:
 *       200:
 *         description: 成功返回分组模型
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
 *                         llm:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AIModel'
 *                         video:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AIModel'
 *                         image:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AIModel'
 *                         tts:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AIModel'
 */
router.get('/grouped', aiModelController.getModelsGrouped);

/**
 * @swagger
 * /api/ai-models/type/{type}:
 *   get:
 *     summary: 按类型获取模型
 *     description: 根据类型获取AI模型列表（llm、video、image、tts）
 *     tags: [AI Models]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [llm, video, image, tts]
 *         description: 模型类型
 *     responses:
 *       200:
 *         description: 成功返回模型列表
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
 *                         $ref: '#/components/schemas/AIModel'
 *       400:
 *         description: 无效的模型类型
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/type/:type', aiModelController.getModelsByType);

/**
 * @swagger
 * /api/ai-models/{id}:
 *   get:
 *     summary: 获取模型详情
 *     description: 根据模型ID获取AI模型的详细信息
 *     tags: [AI Models]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 模型ID
 *     responses:
 *       200:
 *         description: 成功返回模型详情
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AIModel'
 *       404:
 *         description: 模型不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// ==================== Model CRUD Routes (must be before /:id) ====================

/**
 * @swagger
 * /api/ai-models/all:
 *   get:
 *     summary: 获取所有模型（包括未启用的）
 *     description: 获取所有AI模型列表，包括未启用的
 *     tags: [AI Models]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回模型列表
 */
router.get('/all', authenticate, aiModelController.getAllModels);

/**
 * @swagger
 * /api/ai-models:
 *   post:
 *     summary: 创建新模型
 *     description: 创建一个新的AI模型
 *     tags: [AI Models]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerId
 *               - name
 *               - displayName
 *               - type
 *             properties:
 *               providerId:
 *                 type: string
 *                 format: uuid
 *                 description: 提供商ID
 *               name:
 *                 type: string
 *                 description: 模型名称（唯一标识）
 *               displayName:
 *                 type: string
 *                 description: 显示名称
 *               description:
 *                 type: string
 *                 description: 模型描述
 *               type:
 *                 type: string
 *                 enum: [llm, video, image, tts]
 *                 description: 模型类型
 *               category:
 *                 type: string
 *                 description: 分类
 *               baseUrl:
 *                 type: string
 *                 description: API基路径
 *               apiConfig:
 *                 type: object
 *                 description: API配置参数（对象），存储每个模型独有的请求参数
 *                 example: {"temperature": 0.7, "max_tokens": 2000}
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               requiresKey:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: 模型创建成功
 *       400:
 *         description: 请求参数错误
 */
router.post('/', authenticate, aiModelController.createModel);

/**
 * @swagger
 * /api/ai-models/{id}:
 *   put:
 *     summary: 更新模型
 *     description: 更新模型信息
 *     tags: [AI Models]
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
 *               providerId:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *               displayName:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [llm, video, image, tts]
 *               category:
 *                 type: string
 *               baseUrl:
 *                 type: string
 *               apiConfig:
 *                 type: object
 *                 description: API配置参数（对象），存储每个模型独有的请求参数
 *                 example: {"temperature": 0.7, "max_tokens": 2000}
 *               isActive:
 *                 type: boolean
 *               requiresKey:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 模型更新成功
 *       404:
 *         description: 模型不存在
 */
router.put('/:id', authenticate, aiModelController.updateModel);

/**
 * @swagger
 * /api/ai-models/{id}:
 *   delete:
 *     summary: 删除模型
 *     description: 删除AI模型
 *     tags: [AI Models]
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
 *         description: 模型删除成功
 *       404:
 *         description: 模型不存在
 */
router.delete('/:id', authenticate, aiModelController.deleteModel);

module.exports = router;

