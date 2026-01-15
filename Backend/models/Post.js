import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
    {
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        authorName: {
            type: String,
            required: true
        },
        community: {
            type: String,
            default: "Global"
        },
        content: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ["Public", "Follow", "Join"],
            default: "Public"
        },
        likes: {
            type: Number,
            default: 0
        },
        comments: {
            type: Number,
            default: 0
        },
        isFollowed: {
            type: Boolean,
            default: false
        },
        isJoined: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

export default mongoose.model("Post", postSchema);
