import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ["View", "Like", "Share", "Comment", "Save", "Create", "Update", "Delete", "Join", "Follow", "Search"]
    },
    targetModel: {
        type: String,
        required: true,
        enum: ["News", "Post", "Event", "CaseStudy", "Community", "User"]
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'targetModel'
    },
    details: {
        type: String, // Optional description
        default: ""
    },
    reactionType: {
        type: String, // Like, Love, Angry, etc.
        default: ""
    },
    duration: {
        type: Number, // Time spent in seconds
        default: 0
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("ActivityLog", activityLogSchema);
