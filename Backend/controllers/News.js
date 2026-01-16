import News from "../models/News.js";
import User from "../models/User.js";

/* ================= CREATE NEWS ================= */
export const createNews = async (req, res) => {
    try {
        const { title, content, category, image, isExternal, externalSource } = req.body;

        // Default values
        let status = "Pending";
        let authorId = req.user ? req.user.id : null;
        let authorForNews = req.user ? req.user.fullName : "Admin";

        // Admin auto-publishes
        if (req.user && req.user.role === "Admin") {
            status = "Published"; // Verified
        }

        const newsData = {
            title,
            content,
            category,
            image,
            author: authorId,
            authorName: authorForNews,
            status,
            isVerified: status === "Published",
            isExternal,
            externalSource
        };

        const news = new News(newsData);
        await news.save();

        // Increment article count for reporter
        if (authorId) {
            await User.findByIdAndUpdate(authorId, { $inc: { articlesCount: 1 } });
        }

        res.status(201).json(news);
    } catch (error) {
        console.error("Create News Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/* ================= GET NEWS (With Filters) ================= */
export const getAllNews = async (req, res) => {
    try {
        const { status, category, u, limit } = req.query;
        let query = {};

        if (status && status !== "All") query.status = status;
        if (category && category !== "All") query.category = category;

        // If 'u' param provided (userId), filter by author
        if (u) {
            query.author = u;
        }

        const news = await News.find(query)
            .sort({ createdAt: -1 })
            .limit(limit ? parseInt(limit) : 0);

        res.status(200).json(news);
    } catch (error) {
        console.error("Get News Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/* ================= READ ONE NEWS ================= */
export const getNewsById = async (req, res) => {
    try {
        const { id } = req.params;

        // Increment View Logic
        const news = await News.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true });

        if (!news) return res.status(404).json({ message: "News not found" });

        // Update Reporter Earnings (One-time or approximated here)
        // Ideally this should be throttled or handled properly
        if (news.author && news.status === "Published") {
            // Example rate: 0.1 per view (Get from Settings in future)
            const EARNING_PER_VIEW = 0.1;
            await User.findByIdAndUpdate(news.author, {
                $inc: { "earnings.currentBalance": EARNING_PER_VIEW, "earnings.totalEarned": EARNING_PER_VIEW }
            });
        }

        res.status(200).json(news);
    } catch (error) {
        console.error("Get News By ID Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/* ================= UPDATE STATUS ================= */
export const updateNewsStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // Published, Rejected

        const updateData = { status };
        if (status === "Published") {
            updateData.isVerified = true;
        }

        const news = await News.findByIdAndUpdate(id, updateData, { new: true });
        if (!news) return res.status(404).json({ message: "News not found" });

        res.status(200).json(news);
    } catch (error) {
        console.error("Update News Status Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/* ================= LIKE NEWS ================= */
export const likeNews = async (req, res) => {
    try {
        const { id } = req.params;
        const news = await News.findByIdAndUpdate(id, { $inc: { likes: 1 } }, { new: true });

        if (news && news.author && news.status === "Published") {
            const EARNING_PER_LIKE = 0.5;
            await User.findByIdAndUpdate(news.author, {
                $inc: { "earnings.currentBalance": EARNING_PER_LIKE, "earnings.totalEarned": EARNING_PER_LIKE }
            });
        }
        res.status(200).json(news);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

/* ================= SHARE NEWS ================= */
export const shareNews = async (req, res) => {
    try {
        const { id } = req.params;
        const news = await News.findByIdAndUpdate(id, { $inc: { shares: 1 } }, { new: true });
        res.status(200).json(news);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

/* ================= DELETE ================= */
export const deleteNews = async (req, res) => {
    try {
        const { id } = req.params;
        const news = await News.findByIdAndDelete(id);
        if (!news) return res.status(404).json({ message: "News not found" });
        res.status(200).json({ message: "News deleted successfully" });
    } catch (error) {
        console.error("Delete News Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
