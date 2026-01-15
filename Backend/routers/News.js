import express from "express";
import {
    createNews,
    getAllNews,
    updateNewsStatus,
    deleteNews
} from "../controllers/News.js";

const router = express.Router();

router.post("/", createNews);
router.get("/", getAllNews);
router.patch("/:id/status", updateNewsStatus);
router.delete("/:id", deleteNews);

export default router;
