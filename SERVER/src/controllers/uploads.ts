import { Request, Response } from "express";
import { prisma } from "../index";
import { getFileType } from "../middleware/upload";
import path from "path";
import fs from "fs";
import { FileRequest } from "../types";

/**
 * Upload files
 * @route POST /api/uploads
 * @access Private
 */
export const uploadFile = async (req: FileRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          message: "Not authenticated",
          statusCode: 401,
          code: "NOT_AUTHENTICATED",
        },
      });
      return;
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          message: "No files uploaded",
          statusCode: 400,
          code: "NO_FILES",
        },
      });
      return;
    }

    const files = req.files;
    const uploadedFiles = [];

    // Process each file
    for (const file of files) {
      const fileType = getFileType(file.mimetype);

      // Create a URL for the file
      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
        file.filename
      }`;

      // Create attachment record in database
      const attachment = await prisma.attachment.create({
        data: {
          messageId: req.body.messageId || null, // Optional: associate with a message
          type: fileType,
          url: fileUrl,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          width: req.body.width ? parseInt(req.body.width) : null,
          height: req.body.height ? parseInt(req.body.height) : null,
          duration: req.body.duration ? parseInt(req.body.duration) : null,
        },
      });

      uploadedFiles.push(attachment);
    }

    res.status(201).json({
      success: true,
      data: uploadedFiles,
    });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Could not upload files",
        statusCode: 500,
        code: "UPLOAD_ERROR",
      },
    });
  }
};

/**
 * Serve static files
 * This is handled by Express static middleware in index.ts
 */
