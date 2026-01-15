import express from 'express';
import { getLogs, getDashboardStats } from '../controllers/Activity.js';

const router = express.Router();

router.get('/logs', getLogs);
router.get('/dashboard', getDashboardStats);

export default router;
