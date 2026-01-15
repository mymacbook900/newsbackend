import mongoose from "mongoose";

const moderationReportSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true
        },
        targetContent: {
            type: String,
            required: true
        },
        reporter: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ["Pending", "Investigating", "Resolved", "Dismissed"],
            default: "Pending"
        },
        severity: {
            type: String,
            enum: ["Low", "Medium", "High"],
            default: "Low"
        }
    },
    { timestamps: true }
);

export default mongoose.model("ModerationReport", moderationReportSchema);
