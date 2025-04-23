import express from "express";
import {
  createInvitation,
  getUserInvitations,
  verifyInvitation,
  redeemInvitation,
  getPublicInviteDetails,
} from "../controllers/invitations";
import { protect } from "../middleware/auth";
import { createHandler } from "../utils/routeHandler";

const router = express.Router();

// Routes that require authentication
router.post(
  "/",
  protect as express.RequestHandler,
  createHandler(createInvitation) as express.RequestHandler
);
router.get(
  "/",
  protect as express.RequestHandler,
  createHandler(getUserInvitations) as express.RequestHandler
);
router.post(
  "/:code/redeem",
  protect as express.RequestHandler,
  createHandler(redeemInvitation) as express.RequestHandler
);

// Public routes
router.get(
  "/:code/verify",
  createHandler(verifyInvitation) as express.RequestHandler
);
router.get(
  "/:code/public",
  createHandler(getPublicInviteDetails) as express.RequestHandler
);

export default router;
