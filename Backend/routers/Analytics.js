import express from 'express';
import { getDashboardAnalytics, getReportsAnalytics, getUserAnalytics, getNewsAnalytics } from '../controllers/Analytics.js';

const router = express.Router();

router.get('/dashboard', getDashboardAnalytics);
router.get('/reports', getReportsAnalytics);
router.get('/user/:id', getUserAnalytics);

router.get('/news/:id', getNewsAnalytics);

export default router;
