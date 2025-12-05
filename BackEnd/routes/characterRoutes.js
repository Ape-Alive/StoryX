const express = require('express');
const { body } = require('express-validator');
const characterController = require('../controllers/characterController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/characters:
 *   get:
 *     summary: 获取当前用户的所有角色
 *     description: 获取当前登录用户的所有角色列表
 *     tags: [Characters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cached
 *         schema:
 *           type: boolean
 *         description: 是否只返回已缓存的角色
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 项目ID，如果提供则只返回该项目和全局角色
 *       - in: query
 *         name: novelId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 小说ID，如果提供则只返回该小说的角色（需要同时提供 projectId）
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
 */
router.get('/', characterController.getCharacters);

/**
 * @swagger
 * /api/characters/{id}:
 *   get:
 *     summary: 获取角色详情
 *     description: 根据角色ID获取角色详细信息
 *     tags: [Characters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 角色ID
 *       - in: query
 *         name: novelId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 小说ID（可选，用于验证角色是否属于该小说）
 *     responses:
 *       200:
 *         description: 成功返回角色详情
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Character'
 *       404:
 *         description: 角色不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', characterController.getCharacter);

/**
 * @swagger
 * /api/characters:
 *   post:
 *     summary: 创建新角色
 *     description: 创建一个新的角色
 *     tags: [Characters]
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: "小明"
 *               description:
 *                 type: string
 *                 example: "角色描述"
 *               age:
 *                 type: integer
 *                 example: 20
 *               gender:
 *                 type: string
 *                 example: "male"
 *               personality:
 *                 type: string
 *                 description: "性格特征JSON数组字符串"
 *                 example: '["勇敢", "聪明"]'
 *               appearance:
 *                 type: string
 *                 example: "黑色短发，蓝色眼睛"
 *               style:
 *                 type: string
 *                 example: "现代风格"
 *               voiceActor:
 *                 type: string
 *                 description: "发音人"
 *                 example: "张三"
 *               voiceTone:
 *                 type: string
 *                 description: "音色"
 *                 example: "温柔"
 *               voiceSample:
 *                 type: string
 *                 format: uri
 *                 description: "音色示例（URL）"
 *                 example: "https://example.com/voice-sample.mp3"
 *               clothingStyle:
 *                 type: string
 *                 description: "服饰风格"
 *                 example: "现代休闲"
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/character.jpg"
 *               modelUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/model.glb"
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 description: "项目ID（可选），如果提供则角色属于该项目，否则为全局角色"
 *                 example: "uuid-of-project"
 *               novelId:
 *                 type: string
 *                 format: uuid
 *                 description: "小说ID（可选），如果提供则角色属于该小说（需要同时提供 projectId）"
 *                 example: "uuid-of-novel"
 *     responses:
 *       201:
 *         description: 角色创建成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Character'
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
        body('name')
            .trim()
            .notEmpty()
            .withMessage('Character name is required'),
    ],
    validate,
    characterController.createCharacter
);

/**
 * @swagger
 * /api/characters/{id}:
 *   put:
 *     summary: 更新角色
 *     description: 更新角色信息
 *     tags: [Characters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 角色ID
 *       - in: query
 *         name: novelId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 小说ID（可选，用于验证角色是否属于该小说）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               age:
 *                 type: integer
 *               gender:
 *                 type: string
 *               personality:
 *                 type: string
 *               appearance:
 *                 type: string
 *               style:
 *                 type: string
 *               voiceActor:
 *                 type: string
 *                 description: "发音人"
 *               voiceTone:
 *                 type: string
 *                 description: "音色"
 *               voiceSample:
 *                 type: string
 *                 format: uri
 *                 description: "音色示例（URL）"
 *               clothingStyle:
 *                 type: string
 *                 description: "服饰风格"
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *               modelUrl:
 *                 type: string
 *                 format: uri
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 description: "项目ID（可选），如果提供则角色属于该项目，否则为全局角色"
 *               novelId:
 *                 type: string
 *                 format: uuid
 *                 description: "小说ID（可选），如果提供则角色属于该小说（需要同时提供 projectId）"
 *     responses:
 *       200:
 *         description: 角色更新成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Character'
 *       404:
 *         description: 角色不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', characterController.updateCharacter);

/**
 * @swagger
 * /api/characters/{id}:
 *   delete:
 *     summary: 删除角色
 *     description: 删除指定的角色
 *     tags: [Characters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 角色ID
 *       - in: query
 *         name: novelId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 小说ID（可选，用于验证角色是否属于该小说）
 *     responses:
 *       200:
 *         description: 角色删除成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: 角色不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', characterController.deleteCharacter);

/**
 * @swagger
 * /api/characters/merge:
 *   post:
 *     summary: 自动合并重复角色
 *     description: 合并同一用户、同一项目下同名的角色，保留最完整的信息，合并 shotIds。如果未提供 projectId，则合并用户下所有项目的重复角色。
 *     tags: [Characters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 description: "项目ID（可选），如果提供则只合并该项目下的角色，否则合并用户下所有项目的角色"
 *                 example: "uuid-of-project"
 *               novelId:
 *                 type: string
 *                 format: uuid
 *                 description: "小说ID（可选），如果提供则只合并该小说下的角色（需要同时提供 projectId）"
 *                 example: "uuid-of-novel"
 *     responses:
 *       200:
 *         description: 合并成功
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
 *                         totalProcessed:
 *                           type: integer
 *                           description: 处理的总角色数
 *                         mergedCount:
 *                           type: integer
 *                           description: 合并的角色数（被删除的重复角色数）
 *                         deletedCount:
 *                           type: integer
 *                           description: 删除的重复角色数
 *                         remainingCount:
 *                           type: integer
 *                           description: 剩余的角色数（合并后）
 *       404:
 *         description: 项目不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/merge', characterController.mergeDuplicateCharacters);

module.exports = router;

