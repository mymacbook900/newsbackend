import Community from "../models/Community.js";
import Post from "../models/Post.js";

// Community Controllers
export const createCommunity = async (req, res) => {
    try {
        const community = new Community(req.body);
        await community.save();
        res.status(201).json(community);
    } catch (error) {
        console.error("Create Community Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getAllCommunities = async (req, res) => {
    try {
        const communities = await Community.find()
            .populate('members', 'fullName role email')
            .sort({ createdAt: -1 });
        res.status(200).json(communities);
    } catch (error) {
        console.error("Get Communities Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteCommunity = async (req, res) => {
    try {
        const { id } = req.params;
        await Community.findByIdAndDelete(id);
        res.status(200).json({ message: "Community deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// Post Controllers
export const createPost = async (req, res) => {
    try {
        const post = new Post(req.body);
        await post.save();
        res.status(201).json(post);
    } catch (error) {
        console.error("Create Post Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.status(200).json(posts);
    } catch (error) {
        console.error("Get Posts Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
