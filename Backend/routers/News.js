import express from "express";
import {
    createNews,
    getAllNews,
    getNewsById,
    getUserWiseNews,
    updateNewsStatus,
    deleteNews,
    likeNews,
    viewNews,
    shareNews,
    deleteOwnNews
} from "../controllers/News.js";
import { authenticate, authorizeAdmin, protect } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";


const router = express.Router();

// Public
router.get("/", getAllNews);
router.get("/:id", getNewsById);
router.get("/user/:userId", protect, getUserWiseNews);

// Protected (User/Reporter)
router.post("/", authenticate, upload.single("image"), createNews);
router.patch("/:id/like", authenticate, likeNews);
router.patch("/:id/share", authenticate, shareNews);
router.patch("/:id/view", authenticate, viewNews);

// Admin Only
router.patch("/:id/status", authenticate, authorizeAdmin, updateNewsStatus);
router.delete("/:id", authenticate, authorizeAdmin, deleteNews);

// Reporter deletes own news
router.delete("/my/:id", authenticate, deleteOwnNews);

export default router;
