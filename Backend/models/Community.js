import mongoose from "mongoose";

const communitySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        description: {
            type: String,
            default: ""
        },
        type: {
            type: String,
            enum: ["Public", "Private"],
            default: "Public"
        },
        status: {
            type: String,
            enum: ["Active", "Hidden", "Dissolved"],
            default: "Active"
        },
        members: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        membersCount: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

export default mongoose.model("Community", communitySchema);
