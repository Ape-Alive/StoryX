const projectService = require('../services/projectService');
const ResponseUtil = require('../utils/response');
const asyncHandler = require('../middleware/asyncHandler');
const { NotFoundError } = require('../utils/errors');

class ProjectController {
    /**
     * Create a new project
     * POST /api/projects
     */
    createProject = asyncHandler(async (req, res) => {
        const project = await projectService.createProject(req.body, req.user.id);
        ResponseUtil.success(res, project, 'Project created successfully', 201);
    });

    /**
     * Get all projects for current user
     * GET /api/projects
     */
    getProjects = asyncHandler(async (req, res) => {
        const { page, limit, status } = req.query;
        const result = await projectService.getUserProjects(req.user.id, {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            status,
        });
        ResponseUtil.success(res, result, 'Projects retrieved successfully');
    });

    /**
     * Get project by ID
     * GET /api/projects/:id
     */
    getProject = asyncHandler(async (req, res) => {
        const project = await projectService.getProjectById(req.params.id, req.user.id);
        ResponseUtil.success(res, project, 'Project retrieved successfully');
    });

    /**
     * Update project
     * PUT /api/projects/:id
     */
    updateProject = asyncHandler(async (req, res) => {
        const project = await projectService.updateProject(
            req.params.id,
            req.user.id,
            req.body
        );
        ResponseUtil.success(res, project, 'Project updated successfully');
    });

    /**
     * Delete project
     * DELETE /api/projects/:id
     */
    deleteProject = asyncHandler(async (req, res) => {
        await projectService.deleteProject(req.params.id, req.user.id);
        ResponseUtil.success(res, null, 'Project deleted successfully');
    });

    /**
     * Start text processing
     * POST /api/projects/:id/process
     */
    startProcessing = asyncHandler(async (req, res) => {
        const project = await projectService.startTextProcessing(
            req.params.id,
            req.user.id
        );
        ResponseUtil.success(res, project, 'Text processing started');
    });
}

module.exports = new ProjectController();

