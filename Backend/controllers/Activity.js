import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';
import News from '../models/News.js';
import ModerationReport from '../models/ModerationReport.js';
import CaseStudy from '../models/CaseStudy.js';

/* ================= LOG ACTIVITY ================= */
// Helper function to be used by other controllers
export const logActivity = async (userId, action, targetModel, targetId, details = "") => {
    try {
        const newLog = new ActivityLog({
            user: userId,
            action,
            targetModel,
            targetId,
            details
        });
        await newLog.save();
    } catch (error) {
        console.error("Log Activity Error:", error);
    }
};

/* ================= ADMIN: GET SPECIFIC USER LOGS ================= */
export const getUserLogs = async (req, res) => {
    try {
        const { id } = req.params;
        const logs = await ActivityLog.find({ user: id })
            .sort({ timestamp: -1 })
            .populate('targetId', 'title name content')
            .limit(50);
        res.status(200).json(logs);
    } catch (error) {
        console.error("Get Specific User Logs Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/* ================= GET USER ACTIVITY (Targeted at 'me') ================= */
export const getUserActivity = async (req, res) => {
    try {
        const userId = req.user.id;
        // console.log("Fetching activity for User ID:", userId);
        const logs = await ActivityLog.find({ user: userId })
            .sort({ timestamp: -1 })
            .populate('targetId', 'title name content') // works for News, Community, Post
            .limit(100);

        res.status(200).json(logs);
    } catch (error) {
        console.error("Get User Activity Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/* ================= ADMIN: GET ALL LOGS ================= */
export const getAllLogs = async (req, res) => {
    try {
        const logs = await ActivityLog.find()
            .populate('user', 'fullName email')
            .populate('targetId', 'title name content')
            .sort({ timestamp: -1 })
            .limit(100);
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* ================= DASHBOARD STATS (Unchanged mostly) ================= */
export const getDashboardStats = async (req, res) => {
    try {
        const totalNews = await News.countDocuments();
        const pendingNewsCount = await News.countDocuments({ status: 'Pending' });
        const publishedNews = await News.countDocuments({ status: 'Published' });
        const reportedNews = await ModerationReport.countDocuments({ status: 'Pending' });
        const totalUsers = await User.countDocuments();
        const reporters = await User.countDocuments({ role: 'Reporter' });
        const totalCaseStudies = await CaseStudy.countDocuments();

        const pendingArticles = await News.find({ status: 'Pending' }).limit(5);
        const popularNews = await News.find({ status: 'Published' }).sort({ views: -1 }).limit(5);

        res.status(200).json({
            stats: [
                { label: 'Total News', value: totalNews, change: '+0%', icon: 'Newspaper', bg: 'bg-blue-100', color: 'text-blue-600' },
                { label: 'Pending News', value: pendingNewsCount, change: '+0', icon: 'Clock', bg: 'bg-orange-100', color: 'text-orange-600' },
                { label: 'Published News', value: publishedNews, change: '+0', icon: 'CheckCircle2', bg: 'bg-green-100', color: 'text-green-600' },
                { label: 'Reported News', value: reportedNews, change: '+0', icon: 'AlertCircle', bg: 'bg-red-100', color: 'text-red-600' },
                { label: 'Total Users', value: totalUsers, change: '+0%', icon: 'Users', bg: 'bg-blue-100', color: 'text-blue-600' },
                { label: 'Reporters', value: reporters, change: '+0', icon: 'UserCheck', bg: 'bg-purple-100', color: 'text-purple-600' },
                { label: 'Case Studies', value: totalCaseStudies, change: '+0', icon: 'BookOpen', bg: 'bg-indigo-100', color: 'text-indigo-600' }
            ],
            pendingNews: pendingArticles,
            popularNews
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
