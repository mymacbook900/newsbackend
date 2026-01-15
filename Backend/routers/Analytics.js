import express from 'express';
import { getDashboardAnalytics, getReportsAnalytics } from '../controllers/Analytics.js';

const router = express.Router();

router.get('/dashboard', getDashboardAnalytics);
router.get('/reports', getReportsAnalytics);

export default router;
