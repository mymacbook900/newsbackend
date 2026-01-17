import express from "express";
import { getMyNews, getEarningsStats } from "../controllers/Reporter.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/my-news", authenticate, getMyNews);
router.get("/stats", authenticate, getEarningsStats);

export default router;
