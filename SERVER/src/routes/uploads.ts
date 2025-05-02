import express from "express"
import { uploadFile } from "../controllers/uploads"
import { protect } from "../middleware/auth"
import { upload } from "../middleware/upload"

const router = express.Router()

// All routes in this router require authentication
router.use(protect as express.RequestHandler)

// Upload route - accepts up to 5 files
router.post("/", upload.array("files", 5), uploadFile as express.RequestHandler)

export default router
