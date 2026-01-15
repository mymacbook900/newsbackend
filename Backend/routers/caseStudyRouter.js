import express from "express";
import { createCaseStudy, getCaseStudies, getCaseStudyById, deleteCaseStudy } from "../controllers/CaseStudy.js";
// import { protect, admin } from "../middlewares/authMiddleware.js"; // Assuming auth middlewares exist

const router = express.Router();

router.post("/", createCaseStudy);
router.get("/", getCaseStudies);
router.get("/:id", getCaseStudyById);
router.delete("/:id", deleteCaseStudy);

export default router;
