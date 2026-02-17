import express from "express";
import {
    createPost,
    createEventPost,
    getCommunityPosts,
    checkUserAuthorization,
    deletePost,
    likePost,
    commentOnPost,
    sharePost,
    deleteComment,
    requestContactView,
    approveContactView
} from "../controllers/Post.js";

const router = express.Router();

// Create posts
router.post("/create", createPost);
router.post("/create-event", createEventPost);

// Get posts
router.get("/community/:communityId", getCommunityPosts);

// Check authorization
router.get("/check-authorization/:communityId", checkUserAuthorization);

// Post interactions
router.delete("/:id", deletePost);
router.post("/:id/like", likePost);
router.post("/:id/comment", commentOnPost);
router.post("/:id/share", sharePost);
router.delete("/:id/comment/:commentId", deleteComment);

// Event contact requests
router.post("/:id/request-contact", requestContactView);
router.post("/:id/approve-contact", approveContactView);

export default router;