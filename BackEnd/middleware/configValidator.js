const { body } = require('express-validator');
const { AppError } = require('../utils/errors');

/**
 * 自定义验证器：如果配置了服务，对应的密钥必须提供
 */
const validateConfigKeyPair = (configField, keyField) => {
  return body(keyField)
    .custom((value, { req }) => {
      const configValue = req.body[configField];
      // 如果配置了服务，密钥必须提供
      if (configValue && !value) {
        throw new Error(`${keyField} is required when ${configField} is configured`);
      }
      return true;
    });
};

/**
 * 验证所有配置和密钥的对应关系
 */
const validateAllConfigKeys = (req, res, next) => {
  const configKeyPairs = [
    { config: 'configLLM', key: 'configLLMKey' },
    { config: 'configVideoAI', key: 'configVideoAIKey' },
    { config: 'configTTS', key: 'configTTSKey' },
    { config: 'configImageGen', key: 'configImageGenKey' },
  ];

  for (const pair of configKeyPairs) {
    const configValue = req.body[pair.config];
    const keyValue = req.body[pair.key];

    // 如果配置了服务，密钥必须提供
    if (configValue && !keyValue) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: [{
          msg: `${pair.key} is required when ${pair.config} is configured`,
          param: pair.key,
          location: 'body'
        }]
      });
    }
  }

  next();
};

module.exports = {
  validateConfigKeyPair,
  validateAllConfigKeys,
};

