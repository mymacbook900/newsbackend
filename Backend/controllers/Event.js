import Event from "../models/Event.js";
import { logActivity } from "./Activity.js";

export const createEvent = async (req, res) => {
    try {
        const event = new Event(req.body);
        await event.save();

        if (req.user || req.body.organizerId) {
            await logActivity(req.user?.id || req.body.organizerId, "Create", "Event", event._id, `Created event: ${event.title}`);
        }

        res.status(201).json(event);
    } catch (error) {
        console.error("Create Event Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getEvents = async (req, res) => {
    try {
        const { type } = req.query; // Filter by type if provided
        const query = type ? { type } : {};
        const events = await Event.find(query).sort({ date: 1 });
        res.status(200).json(events);
    } catch (error) {
        console.error("Get Events Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
