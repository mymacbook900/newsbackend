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
        // Author can be a registered User (Reporter) or Admin
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        // For external news or when specific author name is needed (e.g. "Agency Name")
        authorName: {
            type: String,
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
            enum: ["Pending", "Published", "Rejected"], // Published = Verified
            default: "Pending"
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        isExternal: {
            type: Boolean,
            default: false
        },
        externalSource: {
            type: String,
            default: ""
        },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        likes: { type: Number, default: 0 },
        views: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        image: { type: String, default: "" },
        date: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

export default mongoose.model("News", newsSchema);
