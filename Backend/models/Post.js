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
            type: mongoose.Schema.Types.ObjectId,
            ref: "Community",
            required: true
        },
        content: {
            type: String,
            required: true
        },
        image: { type: String, default: "" },

        type: {
            type: String,
            enum: ["Public", "Member", "Event"],
            default: "Public"
        },

        // If type is Event, link to Event model
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event"
        },

        // Event Details (if type is Event)
        eventDetails: {
            eventType: { type: String, default: "" },
            charge: { type: Number, default: 0 },
            showContact: { type: Boolean, default: false },
            contactApproved: { type: Boolean, default: false },
            eventDate: { type: Date }
        },

        likes: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        views: { type: Number, default: 0 },

        // Comments Array
        comments: [{
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            userName: { type: String },
            text: { type: String, required: true },
            createdAt: { type: Date, default: Date.now }
        }],

        // Removed isFollowed/isJoined as these are user-relative states, not post properties.
        // Can be computed on fetch.
    },
    { timestamps: true }
);

export default mongoose.model("Post", postSchema);
