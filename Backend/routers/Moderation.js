import express from "express";
import { getReports, updateReportStatus, createReport } from "../controllers/Moderation.js";

const router = express.Router();

router.get("/", getReports);
router.patch("/:id/status", updateReportStatus);
router.post("/", createReport);

export default router;
