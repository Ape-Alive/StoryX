const globalConfigService = require('../services/globalConfigService');
const ResponseUtil = require('../utils/response');
const asyncHandler = require('../middleware/asyncHandler');

class GlobalConfigController {
    /**
     * 获取全局配置
     * GET /api/global-config
     */
    getGlobalConfig = asyncHandler(async (req, res) => {
        const config = await globalConfigService.getGlobalConfig();
        ResponseUtil.success(res, config, 'Global config retrieved successfully');
    });

    /**
     * 更新全局配置
     * PUT /api/global-config
     */
    updateGlobalConfig = asyncHandler(async (req, res) => {
        const config = await globalConfigService.updateGlobalConfig(req.body);
        ResponseUtil.success(res, config, 'Global config updated successfully');
    });
}

module.exports = new GlobalConfigController();

