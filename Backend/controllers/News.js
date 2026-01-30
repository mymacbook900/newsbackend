import News from "../models/News.js";
import User from "../models/User.js";
import Settings from "../models/Settings.js";
import { logActivity } from "./Activity.js";
import multer from 'multer';

/* ================= CREATE NEWS ================= */
export const createNews = async (req, res) => {
    try {
        // 1️⃣ Authorization check
        if (!req.user || !['Admin', 'Reporter'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // 2️⃣ Extract fields from form-data
        const { title, content, category, image, isExternal, externalSource } = req.body;

        // 3️⃣ Validate required fields
        const errors = [];
        if (!title || title.trim() === '') errors.push('Title is required');
        if (!content || content.trim() === '') errors.push('Content is required');
        if (!category || category.trim() === '') errors.push('Category is required');

        if (errors.length > 0) {
            return res.status(400).json({ message: 'Validation failed', errors });
        }

        // 5️⃣ Set status & verification
        let status = 'Pending';
        let isVerified = false;
        if (req.user.role === 'Admin') {
            status = 'Published';
            isVerified = true;
        }

        // 6️⃣ Create news document
        const news = await News.create({
            title: title.trim(),
            content: content.trim(),
            category: category.trim(),
            image: req.file ? `/uploads/${req.file.filename}` : image,
            author: req.user._id,
            authorName: req.user.fullName,
            status,
            isVerified,
            isExternal: isExternal === 'true', // convert string to boolean
            externalSource: externalSource || ''
        });

        // 7️⃣ Increment reporter's article count
        if (req.user.role === 'Reporter') {
            await User.findByIdAndUpdate(req.user._id, {
                $inc: { articlesCount: 1 }
            });
        }

        // 8️⃣ Respond success
        res.status(201).json({
            message: 'News created successfully',
            news
        });
    } catch (error) {
        console.error('Create News Error:', error);

        // Multer file upload errors
        if (error instanceof multer.MulterError) {
            return res.status(400).json({ message: error.message });
        }

        // Mongoose validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation failed',
                errors: error.errors
            });
        }

        res.status(500).json({ message: 'Server error' });
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

/* ================= GET USER WISE NEWS ================= */
export const getUserWiseNews = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        let userId;

        // Reporter → apni news
        if (req.user.role === "Reporter") {
            userId = req.user._id;
        }
        // Admin → kisi bhi reporter ki news
        else if (req.user.role === "Admin") {
            userId = req.params.userId; // 👈 params se lo
        }

        const news = await News.find({ author: userId })
            .sort({ createdAt: -1 });

        res.status(200).json(news);
    } catch (error) {
        console.error("User Wise News Error:", error);
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

        // Update Reporter Earnings
        if (news.author && news.status === "Published") {
            const settings = await Settings.findOne();
            const EARNING_PER_VIEW = settings?.payoutPerView || 0;

            if (EARNING_PER_VIEW > 0) {
                await User.findByIdAndUpdate(news.author, {
                    $inc: { "earnings.currentBalance": EARNING_PER_VIEW, "earnings.totalEarned": EARNING_PER_VIEW }
                });
            }
        }

        if (req.user) {
            await logActivity(req.user.id, "View", "News", id, `Viewed news: ${news.title}`);
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
        const userId = req.user._id;
        const { id } = req.params;

        const news = await News.findById(id);
        if (!news) {
            return res.status(404).json({ message: "News not found" });
        }

        const alreadyLiked = news.likedBy.some(
            (uid) => uid.toString() === userId.toString()
        );

        if (alreadyLiked) {
            //  DISLIKE
            news.likedBy = news.likedBy.filter(
                (uid) => uid.toString() !== userId.toString()
            );
            news.likes -= 1;
        } else {
            //  LIKE
            news.likedBy.push(userId);
            news.likes += 1;
        }

        await news.save();

        res.status(200).json({
            message: alreadyLiked ? "News disliked" : "News liked",
            likes: news.likes
        });

    } catch (error) {
        console.error("Like Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};



/* ================= VIEW NEWS ================= */
export const viewNews = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const news = await News.findById(id);
        if (!news) {
            return res.status(404).json({ message: "News not found" });
        }

        const alreadyViewed = news.viewedBy.some(uId=> uId.toString() === userId.toString());

        if (!alreadyViewed) {
            news.viewedBy.push(userId);
            news.views += 1;
            await news.save();
        }

        res.status(200).json({
            message: alreadyViewed ? "News already viewed" : "News viewed",
            views: news.views
        });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};


/* ================= SHARE NEWS ================= */
export const shareNews = async (req, res) => {
    try {
        const { id } = req.params;
        const news = await News.findByIdAndUpdate(id, { $inc: { shares: 1 } }, { new: true });

        if (news && news.author && news.status === "Published") {
            const settings = await Settings.findOne();
            const EARNING_PER_SHARE = settings?.payoutPerShare || 0;

            if (EARNING_PER_SHARE > 0) {
                await User.findByIdAndUpdate(news.author, {
                    $inc: { "earnings.currentBalance": EARNING_PER_SHARE, "earnings.totalEarned": EARNING_PER_SHARE }
                });
            }
        }
        if (req.user) {
            await logActivity(req.user.id, "Share", "News", id, `Shared news: ${news.title}`);
        }
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

/* ================= DELETE OWN NEWS (Reporter) ================= */
export const deleteOwnNews = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "Reporter") {
            return res.status(403).json({ message: "Only reporters can delete their news" });
        }

        const { id } = req.params;

        const news = await News.findOne({
            _id: id,
            author: req.user._id // 🔐 ownership check
        });

        if (!news) {
            return res.status(404).json({
                message: "News not found or you are not allowed to delete it"
            });
        }

        await news.deleteOne();

        res.status(200).json({
            message: "Your news deleted successfully"
        });
    } catch (error) {
        console.error("Delete Own News Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

