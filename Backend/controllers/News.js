import News from "../models/News.js";

export const createNews = async (req, res) => {
    try {
        const news = new News(req.body);
        await news.save();
        res.status(201).json(news);
    } catch (error) {
        console.error("Create News Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getAllNews = async (req, res) => {
    try {
        const news = await News.find().sort({ createdAt: -1 });
        res.status(200).json(news);
    } catch (error) {
        console.error("Get News Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const updateNewsStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const news = await News.findByIdAndUpdate(id, { status }, { new: true });
        if (!news) return res.status(404).json({ message: "News not found" });
        res.status(200).json(news);
    } catch (error) {
        console.error("Update News Status Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

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
