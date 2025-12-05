const { validationResult } = require('express-validator');
const ResponseUtil = require('../utils/response');

/**
 * Validation middleware
 * Checks validation results from express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return ResponseUtil.validationError(res, errors.array());
  }

  next();
};

module.exports = validate;

