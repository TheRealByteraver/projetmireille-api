import { Request, Response, NextFunction } from 'express';

export function asyncHandler(
  callbackFn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await callbackFn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}
