import mongoose from "mongoose";

const newsSchema = new mongoose.Schema(
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
        author: {
            type: String,
            required: true,
            default: "Admin"
        },
        category: {
            type: String,
            required: true,
            enum: ["Local", "Business", "Lifestyle", "Health", "Sports", "Technology", "World", "Politics", "Entertainment"],
            default: "Local"
        },
        status: {
            type: String,
            enum: ["Pending", "Published", "Rejected"],
            default: "Pending"
        },
        views: {
            type: Number,
            default: 0
        },
        likes: {
            type: Number,
            default: 0
        },
        shares: {
            type: Number,
            default: 0
        },
        image: {
            type: String,
            default: ""
        },
        date: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

export default mongoose.model("News", newsSchema);
