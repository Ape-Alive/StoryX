const app = require('./app');
const config = require('./config');
const database = require('./config/database');
const logger = require('./utils/logger');

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
});

// Start server
const startServer = async () => {
    try {
        // Connect to database
        await database.connect();

        // Start listening
        const server = app.listen(config.server.port, config.server.host, () => {
            logger.info(
                `Server running in ${config.server.env} mode on http://${config.server.host}:${config.server.port}`
            );
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            logger.info(`${signal} received. Starting graceful shutdown...`);

            server.close(async () => {
                logger.info('HTTP server closed');

                try {
                    await database.disconnect();
                    logger.info('Database disconnected');
                    process.exit(0);
                } catch (error) {
                    logger.error('Error during shutdown:', error);
                    process.exit(1);
                }
            });

            // Force close after 10 seconds
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        return server;
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer();

