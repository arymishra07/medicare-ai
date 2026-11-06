const { validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

const validate = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((error) => ({
    field: error.path,
    message: error.msg,
  }));

  return next(ApiError.unprocessable(details[0]?.message || 'Validation failed', details));
};

module.exports = validate;
