import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import userRoutes from "./routers/User.js";
import newsRoutes from "./routers/News.js";
import communityRoutes from "./routers/Community.js";
import eventRoutes from "./routers/Event.js";
import moderationRoutes from "./routers/Moderation.js";
import activityRoutes from "./routers/Activity.js";
import analyticsRoutes from "./routers/Analytics.js";

import caseStudyRoutes from "./routers/caseStudyRouter.js";
import settingsRoutes from "./routers/settingsRouter.js";
import reporterRoutes from "./routers/Reporter.js";

dotenv.config();


const app = express();
const allowedOrigins = process.env.FRONTEND_URL.split(",");

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("CORS not allowed"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options("*", cors());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));


connectDB();

app.use("/api/users", userRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/communities", communityRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/moderation", moderationRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/casestudies", caseStudyRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/reporter", reporterRoutes);

app.use((err, req, res, next) => {
    if (err.name === 'CastError') {
        console.error("Cast Error: Invalid ID format:", err.value, "for path:", err.path);
        return res.status(400).json({ message: "Invalid ID format", path: err.path, value: err.value });
    }
    console.error("Global Error Handler:", err.stack);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || "Internal Server Error", debug: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});