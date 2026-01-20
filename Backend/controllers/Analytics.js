import News from '../models/News.js';
import User from '../models/User.js';
import Community from '../models/Community.js';
import Post from '../models/Post.js';
import ActivityLog from '../models/ActivityLog.js';
import mongoose from 'mongoose';

export const getDashboardAnalytics = async (req, res) => {
    try {
        // 1. News Distribution by Category (Bar Chart)
        const categoryStats = await News.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);
        const barData = categoryStats.map(s => ({ name: s._id, val: s.count }));

        // 2. Category Split (Pie Chart)
        const pieData = categoryStats.map(s => ({ name: s._id, value: s.count }));

        // 3. Traffic Trends (Wave/Area Chart) - Mocking time series for now but based on News creation dates
        const newsByDate = await News.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    val: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        const waveData = newsByDate.map(d => ({ name: d._id, val: d.val }));

        // 4. Engagement Depth (Scatter/Dot) - Mocking based on Post counts vs Member counts
        const communityEngagement = await Community.aggregate([
            {
                $project: {
                    x: "$membersCount",
                    y: { $size: { $ifNull: ["$members", []] } } // Just a sample ratio
                }
            }
        ]);

        res.status(200).json({
            wave: waveData.length > 0 ? waveData : [{ name: 'Today', val: 0 }],
            bar: barData,
            pie: pieData,
            dot: communityEngagement
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getReportsAnalytics = async (req, res) => {
    try {
        // 1. Engagement Trends (Last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailyStats = await ActivityLog.aggregate([
            { $match: { timestamp: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%m-%d", date: "$timestamp" } },
                    views: { $sum: { $cond: [{ $eq: ["$action", "View"] }, 1, 0] } },
                    likes: { $sum: { $cond: [{ $eq: ["$action", "Like"] }, 1, 0] } },
                    comments: { $sum: { $cond: [{ $eq: ["$action", "Comment"] }, 1, 0] } },
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const engagementTrends = dailyStats.map(s => ({
            name: s._id,
            views: s.views,
            likes: s.likes,
            comments: s.comments
        }));

        // 2. Metrics by Type (Bar Chart)
        const typeMetrics = await ActivityLog.aggregate([
            {
                $group: {
                    _id: "$targetModel",
                    views: { $sum: { $cond: [{ $eq: ["$action", "View"] }, 1, 0] } },
                    likes: { $sum: { $cond: [{ $eq: ["$action", "Like"] }, 1, 0] } },
                    shares: { $sum: { $cond: [{ $eq: ["$action", "Share"] }, 1, 0] } },
                    comments: { $sum: { $cond: [{ $eq: ["$action", "Comment"] }, 1, 0] } },
                    saves: { $sum: { $cond: [{ $eq: ["$action", "Save"] }, 1, 0] } },
                }
            }
        ]);

        // 3. Summary Totals
        const totals = await ActivityLog.aggregate([
            {
                $group: {
                    _id: null,
                    totalViews: { $sum: { $cond: [{ $eq: ["$action", "View"] }, 1, 0] } },
                    totalLikes: { $sum: { $cond: [{ $eq: ["$action", "Like"] }, 1, 0] } },
                    totalShares: { $sum: { $cond: [{ $eq: ["$action", "Share"] }, 1, 0] } },
                    totalComments: { $sum: { $cond: [{ $eq: ["$action", "Comment"] }, 1, 0] } },
                    totalSaves: { $sum: { $cond: [{ $eq: ["$action", "Save"] }, 1, 0] } },
                }
            }
        ]);

        res.status(200).json({
            engagementTrends: engagementTrends.length > 0 ? engagementTrends : [{ name: 'Today', views: 0, likes: 0, comments: 0 }],
            typeMetrics: typeMetrics.map(t => ({
                name: t._id,
                Views: t.views,
                Likes: t.likes,
                Shares: t.shares,
                Comments: t.comments,
                Saves: t.saves
            })),
            totals: totals[0] || { totalViews: 0, totalLikes: 0, totalShares: 0, totalComments: 0, totalSaves: 0 }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUserAnalytics = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).populate('joinedCommunities').populate('followingCommunities');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 1. User Engagement (Actions by this user)
        const userActivity = await ActivityLog.aggregate([
            { $match: { user: user._id } },
            {
                $group: {
                    _id: "$action",
                    count: { $sum: 1 },
                    totalDuration: { $sum: "$duration" }
                }
            }
        ]);

        const engagementData = {
            View: 0, Like: 0, Share: 0, Comment: 0, Save: 0, Search: 0, totalTimeSpent: 0
        };
        userActivity.forEach(item => {
            if (engagementData.hasOwnProperty(item._id)) {
                engagementData[item._id] = item.count;
            }
            if (item._id === 'View') {
                engagementData.totalTimeSpent = item.totalDuration;
            }
        });

        // 2. Category-wise Reading (Top categories viewed)
        const categoryStats = await ActivityLog.aggregate([
            { $match: { user: user._id, action: "View", targetModel: "News" } },
            {
                $lookup: {
                    from: "news",
                    localField: "targetId",
                    foreignField: "_id",
                    as: "newsItem"
                }
            },
            { $unwind: "$newsItem" },
            {
                $group: {
                    _id: "$newsItem.category",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const formattedCategoryStats = categoryStats.map(c => ({ category: c._id, count: c.count }));

        // 3. Reaction Breakdown
        const reactionStats = await ActivityLog.aggregate([
            { $match: { user: user._id, action: "Like" } },
            {
                $group: {
                    _id: "$reactionType",
                    count: { $sum: 1 }
                }
            }
        ]);
        const formattedReactions = reactionStats.map(r => ({ type: r._id || 'Like', count: r.count }));

        // 4. Search History
        const searchHistory = await ActivityLog.find({ user: user._id, action: "Search" })
            .sort({ timestamp: -1 })
            .limit(10)
            .select("details timestamp");

        // 5. Author Performance (Only if user is a Reporter)
        let authorPerformance = null;
        let reporterStats = null;

        const authoredNews = await News.find({ author: user._id });
        if (authoredNews.length > 0 || user.role === 'Reporter') {
            const newsIds = authoredNews.map(n => n._id);

            // Reporter Stats (By status)
            const stats = await News.aggregate([
                { $match: { author: user._id } },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                }
            ]);

            reporterStats = {
                Total: authoredNews.length,
                Published: 0,
                Pending: 0,
                Rejected: 0
            };
            stats.forEach(s => {
                if (reporterStats.hasOwnProperty(s._id)) {
                    reporterStats[s._id] = s.count;
                }
            });

            // Author Engagement (Actions on News authored by this user)
            const authorEngagement = await ActivityLog.aggregate([
                { $match: { targetId: { $in: newsIds }, targetModel: 'News', user: { $ne: user._id } } },
                {
                    $group: {
                        _id: "$action",
                        count: { $sum: 1 }
                    }
                }
            ]);

            authorPerformance = {
                Views: 0, Likes: 0, Shares: 0, Comments: 0,
                authoredNewsDetails: []
            };

            const commentStats = await ActivityLog.aggregate([
                { $match: { targetId: { $in: newsIds }, targetModel: 'News', action: 'Comment' } },
                { $group: { _id: "$targetId", count: { $sum: 1 } } }
            ]);

            const commentMap = {};
            commentStats.forEach(c => commentMap[c._id.toString()] = c.count);

            authorPerformance.authoredNewsDetails = authoredNews.map(n => ({
                id: n._id,
                title: n.title,
                category: n.category,
                status: n.status,
                views: n.views || 0,
                likes: n.likes || 0,
                shares: n.shares || 0,
                comments: commentMap[n._id.toString()] || 0,
                createdAt: n.createdAt
            }));

            authorEngagement.forEach(item => {
                if (item._id === 'View') authorPerformance.Views = item.count;
                if (item._id === 'Like') authorPerformance.Likes = item.count;
                if (item._id === 'Share') authorPerformance.Shares = item.count;
                if (item._id === 'Comment') authorPerformance.Comments = item.count;
            });
        }

        res.status(200).json({
            user,
            engagement: engagementData,
            categoryStats: formattedCategoryStats,
            reactionStats: formattedReactions,
            searchHistory,
            reporterStats,
            authorPerformance
        });
    } catch (error) {
        console.error("Get User Analytics Error:", error);
        res.status(500).json({ message: error.message });
    }
};


export const getNewsAnalytics = async (req, res) => {
    try {
        const { id } = req.params;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailyStats = await ActivityLog.aggregate([
            {
                $match: {
                    targetId: new mongoose.Types.ObjectId(id),
                    timestamp: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    views: { $sum: { $cond: [{ $eq: ["$action", "View"] }, 1, 0] } },
                    likes: { $sum: { $cond: [{ $eq: ["$action", "Like"] }, 1, 0] } },
                    shares: { $sum: { $cond: [{ $eq: ["$action", "Share"] }, 1, 0] } },
                    comments: { $sum: { $cond: [{ $eq: ["$action", "Comment"] }, 1, 0] } },
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Generate last 7 days array to ensure continuous graph
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7Days.push(d.toISOString().split('T')[0]);
        }

        const statsMap = {};
        dailyStats.forEach(s => {
            statsMap[s._id] = s;
        });

        const formattedStats = last7Days.map(date => {
            const dayData = statsMap[date] || { views: 0, likes: 0, shares: 0, comments: 0 };
            return {
                name: date,
                views: dayData.views || 0,
                likes: dayData.likes || 0,
                shares: dayData.shares || 0,
                comments: dayData.comments || 0
            };
        });

        res.status(200).json(formattedStats);
    } catch (error) {
        console.error("Get News Analytics Error:", error);
        res.status(500).json({ message: error.message });
    }
};
