import express from "express";
import {
  // New step-by-step flow
  initiateCommunityCreation,
  sendVerificationOTP,
  verifyEmailStep,
  finalizeCommunityCreation,
  getVerificationStatus,
  // Existing functions
  getAllCommunities,
  getCommunityById,
  deleteCommunity,
  createPost,
  getAllPosts,
  getCommunityPosts,
  joinCommunity,
  approveJoinRequest,
  followCommunity,
  unfollowCommunity,
  rejectJoinRequest,
  updateCommunity,
  removeMember,
  getMyAuthorizedCommunities,
  // Deprecated (kept for backward compatibility)
  verifyAndCreateCommunity,
  resendCreatorOTP,
  verifyAuthorizedOTP,
} from "../controllers/Community.js";
import {
  likePost,
  commentOnPost,
  sharePost,
  requestContactView,
  approveContactView,
  // getFilteredPosts,
  deletePost,
  deleteComment,
} from "../controllers/Post.js";
import {
  authenticate,
  authorizeAdmin,
  canPostInCommunity,
  protect,
} from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.post("/initiate", protect, upload.single("image"), initiateCommunityCreation);

router.post("/send-verification-otp", protect, sendVerificationOTP);

router.post("/verify-email-step", protect, verifyEmailStep);

router.post("/finalize", protect, finalizeCommunityCreation);

router.get("/verification-status/:tempId", protect, getVerificationStatus);

router.post("/verify-and-create", protect, verifyAndCreateCommunity);
router.post("/resend-creator-otp", protect, resendCreatorOTP);
router.post("/authorized/verify", protect, verifyAuthorizedOTP);

router.get("/", protect, getAllCommunities);
router.get("/:id", getCommunityById);
router.put("/:id", upload.single("image"), updateCommunity);
router.delete("/:id", deleteCommunity);

router.post("/:id/follow", followCommunity);
router.delete("/:id/unfollow", unfollowCommunity);

router.post("/:id/join", joinCommunity);
router.post("/request/approve", approveJoinRequest);
router.post("/request/reject", rejectJoinRequest);
router.delete("/:id/members/:userId", removeMember);

router.post("/posts", protect, upload.single("image"), canPostInCommunity, createPost);
router.get("/my/authorized", protect, getMyAuthorizedCommunities);
router.delete("/posts/:id", deletePost);
router.get("/posts", getAllPosts);
router.get("/:communityId/posts", getCommunityPosts);
// router.get("/:id/posts/filtered", getFilteredPosts);

router.patch("/posts/:id/like", likePost);
router.post("/posts/:id/comment", commentOnPost);
router.delete("/posts/:id/comments/:commentId", deleteComment);
router.patch("/posts/:id/share", sharePost);

router.post("/posts/:id/request-contact", requestContactView);
router.patch("/posts/:id/approve-contact", approveContactView);

export default router;