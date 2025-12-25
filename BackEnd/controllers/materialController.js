const asyncHandler = require('../middleware/asyncHandler');
const ResponseUtil = require('../utils/response');
const materialService = require('../services/materialService');

class MaterialController {
    /**
     * 读取本地文件信息
     * POST /api/materials/read-file-info
     */
    readFileInfo = asyncHandler(async (req, res) => {
        const { filePath } = req.body;

        if (!filePath) {
            return ResponseUtil.error(res, 'filePath is required', 400);
        }

        const fileInfo = await materialService.readFileInfo(filePath);
        ResponseUtil.success(res, fileInfo, 'File info retrieved successfully');
    });
}

module.exports = new MaterialController();

