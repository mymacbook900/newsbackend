import mongoose from "mongoose";

const communitySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        description: { type: String, default: "" },
        image: { type: String, default: "" }, // Banner/Logo
        Categories: [{ type: String }], // Community Topics
        type: {
            type: String,
            enum: ["Single", "Multi"], // Single Creator vs Multi-User
            default: "Single"
        },

        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // For Multi-User Communities
        authorizedPersons: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],

        // Members and Followers
        members: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        followers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],

        joinRequests: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],

        status: {
            type: String,
            enum: ["Active", "Pending", "Hidden", "Dissolved"],
            default: "Active"
        },

        membersCount: { type: Number, default: 0 },
        followersCount: { type: Number, default: 0 },

        // Email Verification (Single Creator)
        domainEmail: { type: String, default: "" },
        emailOTP: { type: String, default: null },
        emailOTPExpires: { type: Date, default: null },
        isEmailVerified: { type: Boolean, default: false },

        // Multi-User Approval
        pendingAuthorizedPersons: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            email: { type: String },
            otp: { type: String },
            otpExpires: { type: Date },
            invitedAt: { type: Date, default: Date.now }
        }],
        approvalCount: { type: Number, default: 0 }
    },
    { timestamps: true }
);

export default mongoose.model("Community", communitySchema);
