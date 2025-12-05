const characterService = require('../services/characterService');
const ResponseUtil = require('../utils/response');
const asyncHandler = require('../middleware/asyncHandler');

class CharacterController {
    /**
     * Create a new character
     * POST /api/characters
     */
    createCharacter = asyncHandler(async (req, res) => {
        const character = await characterService.createCharacter(req.body, req.user.id);
        ResponseUtil.success(res, character, 'Character created successfully', 201);
    });

    /**
     * Get all characters for current user
     * GET /api/characters
     */
    getCharacters = asyncHandler(async (req, res) => {
        const { cached, projectId, novelId } = req.query;
        const characters = await characterService.getUserCharacters(req.user.id, { cached, projectId, novelId });
        ResponseUtil.success(res, characters, 'Characters retrieved successfully');
    });

    /**
     * Get all characters for a project
     * GET /api/projects/:projectId/characters
     */
    getProjectCharacters = asyncHandler(async (req, res) => {
        const { projectId } = req.params;
        const characters = await characterService.getProjectCharacters(projectId, req.user.id);
        ResponseUtil.success(res, characters, 'Project characters retrieved successfully');
    });

    /**
     * Get character by ID
     * GET /api/characters/:id
     */
    getCharacter = asyncHandler(async (req, res) => {
        const { novelId } = req.query;
        const character = await characterService.getCharacterById(req.params.id, req.user.id, novelId || null);
        ResponseUtil.success(res, character, 'Character retrieved successfully');
    });

    /**
     * Update character
     * PUT /api/characters/:id
     */
    updateCharacter = asyncHandler(async (req, res) => {
        const character = await characterService.updateCharacter(
            req.params.id,
            req.user.id,
            req.body
        );
        ResponseUtil.success(res, character, 'Character updated successfully');
    });

    /**
     * Delete character
     * DELETE /api/characters/:id
     */
    deleteCharacter = asyncHandler(async (req, res) => {
        const { novelId } = req.query;
        await characterService.deleteCharacter(req.params.id, req.user.id, novelId || null);
        ResponseUtil.success(res, null, 'Character deleted successfully');
    });

    /**
     * 自动合并重复角色
     * POST /api/characters/merge
     */
    mergeDuplicateCharacters = asyncHandler(async (req, res) => {
        const { projectId, novelId } = req.body;
        const userId = req.user.id;

        const result = await characterService.mergeDuplicateCharacters(projectId, userId, novelId || null);
        ResponseUtil.success(res, result, 'Duplicate characters merged successfully');
    });
}

module.exports = new CharacterController();

