import express from "express"
import { getMe, updateProfile, getAllUsers, getUserById } from "../controllers/users"
import { protect } from "../middleware/auth"
import { createHandler } from "../utils/routeHandler"

const router = express.Router()

// All routes in this router require authentication
router.use(protect as express.RequestHandler)

// User routes
router.get("/me", createHandler(getMe))
router.put("/me", createHandler(updateProfile))
router.get("/", createHandler(getAllUsers))
router.get("/:id", createHandler(getUserById))

export default router
