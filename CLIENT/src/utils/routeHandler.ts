import { Request, Response, RequestHandler } from "express";

// Helper function to wrap controller functions for Express routes
export const createHandler = (
  handler: (req: Request, res: Response) => Promise<any>
): RequestHandler => {
  return (req: Request, res: Response) => {
    return handler(req, res);
  };
};
