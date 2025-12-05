const express = require('express');
const { body } = require('express-validator');
const novelController = require('../controllers/novelController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validator');
const novelUpload = require('../middleware/novelUpload');

const router = express.Router();

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/text/upload:
 *   post:
 *     summary: 上传并解析整本小说
 *     description: 上传小说文件（TXT、EPUB、DOC），自动解析元数据和章节，保存到数据库和文件系统
 *     tags: [Novels]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - projectId
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 小说文件（.txt, .epub, .doc, .docx）
 *               projectId:
 *                 type: string
 *                 description: 项目ID（必填）
 *                 example: "3d202970-ef1e-417d-a741-092bf62a47a0"
 *               fileName:
 *                 type: string
 *                 description: 文件名（可选，默认使用上传的文件名）
 *                 example: "斗破苍穹.txt"
 *               encoding:
 *                 type: string
 *                 description: 文件编码（可选，默认UTF-8，支持UTF-8、GBK等）
 *                 example: "UTF-8"
 *               customTitle:
 *                 type: string
 *                 description: 自定义书名（可选，如果提供则优先使用此名称）
 *                 example: "斗破苍穹"
 *     responses:
 *       201:
 *         description: 小说上传并解析成功
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
 *                         novelId:
 *                           type: string
 *                           format: uuid
 *                           description: 小说的唯一标识ID
 *                         title:
 *                           type: string
 *                           description: 书名
 *                         author:
 *                           type: string
 *                           description: 作者名称
 *                         coverUrl:
 *                           type: string
 *                           nullable: true
 *                           description: 封面图片URL
 *                         summary:
 *                           type: string
 *                           description: 小说简介
 *                         tags:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: 标签列表
 *                         totalChapters:
 *                           type: integer
 *                           description: 总章节数
 *                         chapterList:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               chapterId:
 *                                 type: string
 *                                 format: uuid
 *                               chapterTitle:
 *                                 type: string
 *                               order:
 *                                 type: integer
 *                               wordCount:
 *                                 type: integer
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    '/upload',
    novelUpload.single('file'), // multer 必须在验证器之前，以便解析 multipart/form-data
    [
        body('projectId')
            .notEmpty()
            .withMessage('projectId is required'),
    ],
    validate,
    novelController.uploadNovel
);

/**
 * @swagger
 * /api/text/paste:
 *   post:
 *     summary: 上传并解析文本粘贴片段
 *     description: 上传文本片段，可以选择扩写后解析或直接解析分割成章节。需要填写书本基本信息和存储方式。
 *     tags: [Novels]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *               - projectId
 *               - storageLocation
 *             properties:
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 description: 项目ID（必填）
 *               text:
 *                 type: string
 *                 description: 文本内容（必填）
 *               title:
 *                 type: string
 *                 description: 书名（可选）
 *               author:
 *                 type: string
 *                 description: 作者名称（可选）
 *               summary:
 *                 type: string
 *                 description: 简介（可选）
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 标签列表（可选）
 *               coverUrl:
 *                 type: string
 *                 description: 封面URL或文件路径（可选）
 *               storageLocation:
 *                 type: string
 *                 enum: [local, remote]
 *                 description: 存储位置（必填，local 或 remote）
 *               expandText:
 *                 type: boolean
 *                 default: false
 *                 description: 是否扩写（默认false，直接分割章节；true则先扩写再分割）
 *               modelId:
 *                 type: string
 *                 format: uuid
 *                 description: LLM模型ID（可选，如果expandText为true且未指定，则使用项目配置的模型或第一个可用模型）
 *     responses:
 *       201:
 *         description: 文本上传并解析成功
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
 *                         novelId:
 *                           type: string
 *                           format: uuid
 *                         title:
 *                           type: string
 *                         author:
 *                           type: string
 *                         coverUrl:
 *                           type: string
 *                           nullable: true
 *                         summary:
 *                           type: string
 *                         tags:
 *                           type: array
 *                           items:
 *                             type: string
 *                         totalChapters:
 *                           type: integer
 *                         chapterList:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               chapterId:
 *                                 type: string
 *                                 format: uuid
 *                               chapterTitle:
 *                                 type: string
 *                               order:
 *                                 type: integer
 *                               wordCount:
 *                                 type: integer
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    '/paste',
    [
        body('projectId')
            .notEmpty()
            .withMessage('projectId is required'),
        body('text')
            .notEmpty()
            .withMessage('text is required'),
        body('storageLocation')
            .notEmpty()
            .withMessage('storageLocation is required')
            .isIn(['local', 'remote'])
            .withMessage('storageLocation must be "local" or "remote"'),
    ],
    validate,
    novelController.uploadTextPaste
);

/**
 * @swagger
 * /api/novels:
 *   get:
 *     summary: 获取当前用户的小说列表
 *     description: 获取当前用户的小说列表，可以通过 projectId 查询参数筛选指定项目的小说
 *     tags: [Novels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 项目ID（可选），如果提供则只返回该项目的小说
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
 *         description: 项目不存在（当提供了 projectId 时）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', novelController.getUserNovels);

/**
 * @swagger
 * /api/novels/{id}/chapters:
 *   get:
 *     summary: 获取小说的章节列表
 *     description: 根据小说ID获取该小说的所有章节列表（不包含章节内容）
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
 *         description: 小说ID
 *     responses:
 *       200:
 *         description: 成功返回章节列表
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
 *                           chapterId:
 *                             type: string
 *                             format: uuid
 *                           chapterTitle:
 *                             type: string
 *                           order:
 *                             type: integer
 *                           wordCount:
 *                             type: integer
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *       404:
 *         description: 小说不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/chapters', novelController.getNovelChapters);

/**
 * @swagger
 * /api/novels/{id}:
 *   get:
 *     summary: 获取小说详情
 *     description: 根据小说ID获取小说详细信息（不包含章节列表，章节列表请使用 /api/novels/{id}/chapters 接口）。如果提供了 chapterId 查询参数，则同时返回该章节的详情（包括章节内容）。
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
 *         description: 小说ID
 *       - in: query
 *         name: chapterId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 章节ID（可选），如果提供则返回该章节的详情（包括章节内容）
 *         example: "723a5193-ffc7-458c-9b63-184cc44ad33b"
 *     responses:
 *       200:
 *         description: 成功返回小说详情
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       allOf:
 *                         - $ref: '#/components/schemas/Novel'
 *                         - type: object
 *                           properties:
 *                             chapter:
 *                               type: object
 *                               description: 章节详情（仅在提供了 chapterId 参数时返回）
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   format: uuid
 *                                 title:
 *                                   type: string
 *                                 order:
 *                                   type: integer
 *                                 wordCount:
 *                                   type: integer
 *                                 content:
 *                                   type: string
 *                                   description: 章节内容
 *                                 createdAt:
 *                                   type: string
 *                                   format: date-time
 *                                 updatedAt:
 *                                   type: string
 *                                   format: date-time
 *       404:
 *         description: 小说不存在或章节不存在（当提供了 chapterId 时）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', novelController.getNovel);

/**
 * @swagger
 * /api/novels/{id}:
 *   delete:
 *     summary: 删除整本小说
 *     description: 删除指定的小说及其所有关联数据，包括章节记录和文件系统中的所有文件
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
 *         description: 小说ID
 *     responses:
 *       200:
 *         description: 小说删除成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: 小说不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 无权限删除该小说
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', novelController.deleteNovel);

module.exports = router;

