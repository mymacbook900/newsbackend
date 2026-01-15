import News from '../models/News.js';
import User from '../models/User.js';
import Community from '../models/Community.js';
import Post from '../models/Post.js';

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
        // Engagement Trends (Area Chart) - Similar to wave but maybe for comments/likes
        const postStats = await Post.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%m-%d", date: "$createdAt" } },
                    posts: { $sum: 1 },
                    likes: { $sum: "$likes" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const engagementTrends = postStats.map(s => ({
            name: s._id,
            posts: s.posts,
            likes: s.likes
        }));

        res.status(200).json({
            engagementTrends: engagementTrends.length > 0 ? engagementTrends : [{ name: 'Empty', posts: 0, likes: 0 }],
            categoryDistribution: await News.aggregate([{ $group: { _id: "$category", value: { $sum: 1 } } }])
                .then(res => res.map(r => ({ name: r._id, value: r.value })))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
