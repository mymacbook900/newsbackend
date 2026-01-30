import express from "express";
import {
  createCaseStudy,
  getCaseStudies,
  getCaseStudyById,
  deleteCaseStudy,
  toggleLikeCaseStudy,
  shareCaseStudy,
  addComment,
  getMyLikedCaseStudies,
  getMySharedCaseStudies,
  getMyCommentedCaseStudies,
  incrementViewCount
} from "../controllers/CaseStudy.js";

import { protect ,authorizeAdmin} from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

/* CRUD */
router.post("/", protect,upload.single("image"), createCaseStudy);
router.get("/", getCaseStudies);
router.get("/:id", getCaseStudyById);
router.delete("/:id", protect, authorizeAdmin, deleteCaseStudy);

/* Actions */
router.post("/:id/like", protect, toggleLikeCaseStudy);
router.post("/:id/share", protect, shareCaseStudy);
router.post("/:id/view", protect, incrementViewCount);
router.post("/:id/comment", protect, addComment);


/* User Activity */
router.get("/me/liked", protect, getMyLikedCaseStudies);
router.get("/me/shared", protect, getMySharedCaseStudies);
router.get("/me/commented", protect, getMyCommentedCaseStudies);

export default router;
