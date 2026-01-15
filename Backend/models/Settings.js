import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
    {
        payoutPerView: {
            type: Number,
            default: 0
        },
        payoutPerLike: {
            type: Number,
            default: 0
        },
        payoutPerShare: {
            type: Number,
            default: 0
        },
        eventPublicCharge: {
            type: Number,
            default: 0
        },
        eventMemberCharge: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

// We only need one settings document, so we can check this at controller level
export default mongoose.model("Settings", settingsSchema);
