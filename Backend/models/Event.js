import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        organizer: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            required: true
        },
        location: {
            type: String,
            required: true
        },
        category: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ["Upcoming", "Past"],
            default: "Upcoming"
        },
        type: {
            type: String,
            enum: ["Community", "Reporter"],
            required: true
        }
    },
    { timestamps: true }
);

export default mongoose.model("Event", eventSchema);
