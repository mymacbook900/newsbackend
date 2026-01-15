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

dotenv.config();


const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});