import express from "express";
import {
    createCommunity,
    getAllCommunities,
    deleteCommunity,
    createPost,
    getAllPosts
} from "../controllers/Community.js";

const router = express.Router();

// Communities
router.post("/", createCommunity);
router.get("/", getAllCommunities);
router.delete("/:id", deleteCommunity);

// Posts
router.post("/posts", createPost);
router.get("/posts", getAllPosts);

export default router;
