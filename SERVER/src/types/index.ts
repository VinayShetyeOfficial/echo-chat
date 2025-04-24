import { Request } from "express";
import { Express } from "express";

export interface FileRequest extends Request {
  files: Express.Multer.File[] | undefined;
  file: Express.Multer.File | undefined;
}

// Add other custom types here as needed
