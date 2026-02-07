import { Request, Response } from 'express';

export const healthCheckHandler = (_req: Request, res: Response) => {
  res.json({ message: 'OK', timestamp: Date.now() });
};
