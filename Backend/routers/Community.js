import express from "express";
import {
    createCommunity,
    getAllCommunities,
    getCommunityById,
    deleteCommunity,
    createPost,
    getAllPosts,
    getCommunityPosts,
    joinCommunity,
    approveJoinRequest,
    sendEmailVerification,
    verifyDomainEmail,
    inviteAuthorizedPerson,
    approveAuthorizedInvite,
    followCommunity,
    unfollowCommunity,
    rejectJoinRequest
} from "../controllers/Community.js";
import {
    likePost,
    commentOnPost,
    sharePost,
    requestContactView,
    approveContactView,
    getFilteredPosts
} from "../controllers/Post.js";
import { authenticate, authorizeAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Communities
router.get("/", getAllCommunities);
router.get("/:id", getCommunityById);

router.post("/", createCommunity); // TEMPORARY: Made public for testing
router.delete("/:id", deleteCommunity); // TEMPORARY: Made public for testing

// Email Verification (Single Creator)
router.post('/verify-email/send', sendEmailVerification); // TEMPORARY: Made public
router.post('/verify-email/confirm', verifyDomainEmail); // TEMPORARY: Made public

// Authorized Persons (Multi-User)
router.post('/:id/invite-authorized', inviteAuthorizedPerson); // TEMPORARY: Made public
router.post('/authorized/approve', approveAuthorizedInvite); // TEMPORARY: Made public

// Follow/Unfollow
router.post('/:id/follow', followCommunity); // TEMPORARY: Made public
router.delete('/:id/follow', unfollowCommunity); // TEMPORARY: Made public

// Join Requests
router.post("/:id/join", joinCommunity); // TEMPORARY: Made public
router.post("/request/approve", approveJoinRequest); // TEMPORARY: Made public
router.post('/request/reject', rejectJoinRequest); // TEMPORARY: Made public

// Posts
router.post("/posts", createPost); // TEMPORARY: Made public
router.get("/posts", getAllPosts); // Get all posts (global feed)
router.get("/:communityId/posts", getCommunityPosts); // Get posts for specific community
router.get('/:id/posts/filtered', getFilteredPosts); // TEMPORARY: Made public

// Post Interactions
router.patch('/posts/:id/like', likePost); // TEMPORARY: Made public
router.post('/posts/:id/comment', commentOnPost); // TEMPORARY: Made public
router.patch('/posts/:id/share', sharePost); // TEMPORARY: Made public

// Event Contact
router.post('/posts/:id/request-contact', requestContactView); // TEMPORARY: Made public
router.patch('/posts/:id/approve-contact', approveContactView); // TEMPORARY: Made public

export default router;
