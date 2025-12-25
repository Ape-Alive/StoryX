const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');
const { authenticate } = require('../middleware/auth');

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/materials/read-file-info:
 *   post:
 *     summary: 读取本地文件信息
 *     description: 根据本地文件路径快速读取文件信息（视频、音频、图片、文档），返回文件元数据和可访问的URL
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filePath
 *             properties:
 *               filePath:
 *                 type: string
 *                 description: 本地文件路径（绝对路径或相对路径）
 *                 example: "/Users/liuqihui/lqh/mycode/StoryX/BackEnd/uploads/characters/merged_u89012qr-4567-7wxy-0qrs-789012345678_1766575906733/video_1766575906735.mp4"
 *     responses:
 *       200:
 *         description: 成功返回文件信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     filePath:
 *                       type: string
 *                       description: 文件的绝对路径
 *                     fileName:
 *                       type: string
 *                       description: 文件名
 *                     fileExtension:
 *                       type: string
 *                       description: 文件扩展名
 *                     fileType:
 *                       type: string
 *                       enum: [video, audio, image, document, other]
 *                       description: 文件类型
 *                     mimeType:
 *                       type: string
 *                       description: MIME类型
 *                     size:
 *                       type: integer
 *                       description: 文件大小（字节）
 *                     sizeFormatted:
 *                       type: string
 *                       description: 格式化后的文件大小
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: 文件创建时间
 *                     modifiedAt:
 *                       type: string
 *                       format: date-time
 *                       description: 文件修改时间
 *                     accessUrl:
 *                       type: string
 *                       description: 可访问的URL（用于前端播放/显示）
 *       400:
 *         description: 参数错误或路径不是文件
 *       404:
 *         description: 文件不存在
 */
router.post('/read-file-info', materialController.readFileInfo);

module.exports = router;

