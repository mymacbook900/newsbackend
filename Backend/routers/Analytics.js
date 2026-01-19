import express from 'express';
import { getDashboardAnalytics, getReportsAnalytics, getUserAnalytics } from '../controllers/Analytics.js';

const router = express.Router();

router.get('/dashboard', getDashboardAnalytics);
router.get('/reports', getReportsAnalytics);
router.get('/user/:id', getUserAnalytics);

export default router;
