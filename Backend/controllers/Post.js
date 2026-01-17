import Post from "../models/Post.js";
import Community from "../models/Community.js";
import { logActivity } from "./Activity.js";

/* ================= POST INTERACTIONS ================= */

export const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findByIdAndDelete(id);

        if (!post) return res.status(404).json({ message: "Post not found" });
        res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        console.error("Delete Post Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const likePost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findByIdAndUpdate(
            id,
            { $inc: { likes: 1 } },
            { new: true }
        );

        if (req.user) {
            await logActivity(req.user.id, "Like", "Post", id, `Liked a post`);
        }
        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const commentOnPost = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        const userId = req.user?.id || req.body.userId;
        const userName = req.user?.fullName || req.body.userName || "Anonymous";

        if (!userId) return res.status(400).json({ message: "User ID is required" });

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        post.comments.push({
            user: userId,
            userName,
            text
        });
        await post.save();

        if (userId) {
            await logActivity(userId, "Comment", "Post", id, `Commented on a post: "${text.substring(0, 20)}..."`);
        }

        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const sharePost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findByIdAndUpdate(
            id,
            { $inc: { shares: 1 } },
            { new: true }
        );

        if (req.user) {
            await logActivity(req.user.id, "Share", "Post", id, `Shared a post`);
        }
        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

/* ================= EVENT CONTACT VIEW ================= */

export const requestContactView = async (req, res) => {
    try {
        const { id } = req.params; // Post ID
        const post = await Post.findById(id);

        if (!post) return res.status(404).json({ message: "Post not found" });
        if (post.type !== "Event") {
            return res.status(400).json({ message: "Not an event post" });
        }

        post.eventDetails.showContact = true;
        post.eventDetails.contactApproved = false; // Pending approval
        await post.save();

        res.status(200).json({ message: "Contact view request sent" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const approveContactView = async (req, res) => {
    try {
        const { id } = req.params; // Post ID
        const post = await Post.findById(id).populate('community');

        if (!post) return res.status(404).json({ message: "Post not found" });

        const community = post.community;
        const userId = req.user?.id || req.body.userId;

        if (!userId) return res.status(400).json({ message: "User ID is required" });

        const isAuthorized = community.creator.toString() === userId ||
            community.authorizedPersons.includes(userId);

        if (!isAuthorized) {
            return res.status(403).json({ message: "Not authorized" });
        }

        post.eventDetails.contactApproved = true;
        await post.save();

        res.status(200).json({ message: "Contact view approved", post });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

/* ================= FILTERED POSTS (BY USER ROLE) ================= */

export const getFilteredPosts = async (req, res) => {
    try {
        const { id } = req.params; // Community ID
        const userId = req.user?.id || req.query.userId || req.body.userId;

        const community = await Community.findById(id);
        if (!community) return res.status(404).json({ message: "Community not found" });

        const isMember = community.members.includes(userId);
        const isFollower = community.followers.includes(userId);

        let query = { community: id };

        if (isMember) {
            // Members can see all posts
            query = { community: id };
        } else if (isFollower) {
            // Followers can only see Public and Event posts
            query = { community: id, type: { $in: ["Public", "Event"] } };
        } else {
            // Non-followers can only see Public posts
            query = { community: id, type: "Public" };
        }

        const posts = await Post.find(query)
            .populate('author', 'fullName profilePicture')
            .sort({ createdAt: -1 });

        res.status(200).json(posts);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteComment = async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const post = await Post.findById(id);

        if (!post) return res.status(404).json({ message: "Post not found" });

        post.comments = post.comments.filter(c => c._id.toString() !== commentId);
        await post.save();

        res.status(200).json(post);
    } catch (error) {
        console.error("Delete Comment Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
