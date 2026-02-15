// Handler function to wrap each route.
exports.asyncHandler = (callbackFn) => {
  return async (req, res, next) => {
    try {
      await callbackFn(req, res, next);
    } catch (error) {
      // Forward error to the global error handler
      next(error);
    }
  }
}
