import express from 'express';
import { getDashboardStats, getUserActivity, getAllLogs, getUserLogs } from '../controllers/Activity.js';
import { authenticate, authorizeAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public/Protected
router.get('/dashboard', authenticate, authorizeAdmin, getDashboardStats); // Admin Dashboard
router.get('/user/:id', getUserLogs); // TEMPORARY: Made public for testing

// User Activity
router.get('/me', authenticate, getUserActivity);

// Admin Logs
router.get('/logs', authenticate, authorizeAdmin, getAllLogs);

export default router;
