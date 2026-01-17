import User from "../models/User.js";
import News from "../models/News.js";
import mongoose from "mongoose";

/* ================= GET MY NEWS (For Reporting Hub) ================= */
export const getMyNews = async (req, res) => {
    try {
        const userId = req.user.id;
        const news = await News.find({ author: new mongoose.Types.ObjectId(userId) }).sort({ createdAt: -1 });
        res.status(200).json(news);
    } catch (error) {
        console.error("Get My News Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/* ================= GET EARNINGS STATS ================= */
export const getEarningsStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select("earnings fullName email");

        if (!user) return res.status(404).json({ message: "User not found" });

        const earnings = {
            currentBalance: user.earnings?.currentBalance || 0,
            totalEarned: user.earnings?.totalEarned || 0
        };

        res.status(200).json(earnings);
    } catch (error) {
        console.error("Get Earnings Stats Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
