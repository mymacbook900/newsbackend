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
        image: { type: String, default: "" }, 
        Categories: [{ type: String }], 
        type: {
            type: String,
            enum: ["Single", "Multi"], 
            default: "Single"
        },

        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        authorizedPersons: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],

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
