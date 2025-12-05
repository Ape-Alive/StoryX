const express = require('express');
const chapterController = require('../controllers/novelController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/chapters/{id}:
 *   get:
 *     summary: 获取章节内容
 *     description: 根据章节ID获取章节的完整内容
 *     tags: [Novels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 章节ID
 *     responses:
 *       200:
 *         description: 成功返回章节内容
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Chapter'
 *       404:
 *         description: 章节不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', chapterController.getChapterContent);

module.exports = router;

