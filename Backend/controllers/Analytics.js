import News from '../models/News.js';
import User from '../models/User.js';
import Community from '../models/Community.js';
import Post from '../models/Post.js';
import ActivityLog from '../models/ActivityLog.js';

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
