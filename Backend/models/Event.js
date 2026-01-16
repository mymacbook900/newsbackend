import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: { type: String, default: "" },
        organizer: {
            type: String, // Name of organizer or Community Name
            required: true
        },
        organizerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User" // Or Community? Usually user or community creator checks
        },
        community: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Community"
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
            enum: ["Upcoming", "Past", "Cancelled"],
            default: "Upcoming"
        },
        type: {
            type: String,
            enum: ["Community", "Reporter"],
            required: true
        },
        // Paid Event details
        isPaid: { type: Boolean, default: false },
        price: { type: Number, default: 0 },
        currency: { type: String, default: "INR" },

        contactDetails: {
            email: { type: String, default: "" },
            phone: { type: String, default: "" },
            isVisible: { type: Boolean, default: false } // Requires approval to show
        },

        attendees: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }]
    },
    { timestamps: true }
);

export default mongoose.model("Event", eventSchema);
