import express from "express";
import { getSettings, updateSettings } from "../controllers/Settings.js";
// import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", getSettings);
router.put("/", updateSettings);

export default router;
