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
router.post("/", createNews); // TEMPORARY: Made public for testing
router.patch("/:id/like", likeNews); // TEMPORARY: Made public for testing
router.patch("/:id/share", shareNews); // TEMPORARY: Made public for testing

// Admin Only
router.patch("/:id/status", updateNewsStatus); // TEMPORARY: Removed auth for testing
router.delete("/:id", deleteNews); // TEMPORARY: Removed auth for testing

export default router;
