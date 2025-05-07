import multer from "multer";
import path from "path";
import fs from "fs";

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Get the original filename and sanitize it
    const originalName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    // Get file extension
    const ext = path.extname(originalName);
    // Get the filename without extension
    const nameWithoutExt = path.basename(originalName, ext);
    // Add a unique timestamp suffix to prevent overwriting
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1000);
    // Create final filename: originalname-timestamp.ext
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  },
});

// File filter function
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept images, audio, and common document types
  const allowedMimeTypes = [
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    // Audio
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("File type not supported"));
  }
};

// Create multer upload instance
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: fileFilter,
});

// Helper function to get file type category
export const getFileType = (mimetype: string): "image" | "audio" | "file" => {
  if (mimetype.startsWith("image/")) {
    return "image";
  } else if (mimetype.startsWith("audio/")) {
    return "audio";
  } else {
    return "file";
  }
};
