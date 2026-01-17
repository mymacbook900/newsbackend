import express from "express";
import {
    createNews,
    getAllNews,
    getNewsById,
    updateNewsStatus,
    deleteNews,
    likeNews,
    shareNews
} from "../controllers/News.js";
import { authenticate, authorizeAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public
router.get("/", getAllNews);
router.get("/:id", getNewsById);

// Protected (User/Reporter)
router.post("/", authenticate, createNews);
router.patch("/:id/like", authenticate, likeNews);
router.patch("/:id/share", authenticate, shareNews);

// Admin Only
router.patch("/:id/status", authenticate, authorizeAdmin, updateNewsStatus);
router.delete("/:id", authenticate, authorizeAdmin, deleteNews);

export default router;
