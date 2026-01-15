import mongoose from "mongoose";

const caseStudySchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        content: {
            type: String,
            required: true
        },
        image: {
            type: String,
            default: ""
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        likes: {
            type: Number,
            default: 0
        },
        saves: {
            type: Number,
            default: 0
        },
        views: {
            type: Number,
            default: 0
        },
        date: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

export default mongoose.model("CaseStudy", caseStudySchema);
