import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import News from './models/News.js';
import Community from './models/Community.js';
import Post from './models/Post.js';
import Event from './models/Event.js';
import ModerationReport from './models/ModerationReport.js';
import ActivityLog from './models/ActivityLog.js';

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for seeding...");

        // Clear existing data
        await User.deleteMany({ role: { $ne: 'Admin' } }); // Keep admins for login
        await News.deleteMany({});
        await Community.deleteMany({});
        await Post.deleteMany({});
        await Event.deleteMany({});
        await ModerationReport.deleteMany({});
        await ActivityLog.deleteMany({});

        const hashedPassword = await bcrypt.hash('Password123!', 10);

        // =================USERS=================
        const dbUsers = await User.insertMany([
            {
                customId: 'REP-0001',
                fullName: 'Sarah Connor',
                email: 'sarah@reporter.com',
                password: hashedPassword,
                role: 'Reporter',
                status: 'Active',
                bio: 'Experienced local news reporter covering social issues.',
                articlesCount: 15,
                address: 'Los Angeles, CA',
                position: 'Senior Reporter',
                interests: ['Social', 'Law', 'Politics'],
                preferredLanguage: 'English',
                themePreference: 'dark',
                lastLogin: new Date(),
                loginCount: 45
            },
            {
                customId: 'REP-0002',
                fullName: 'John Doe',
                email: 'john@reporter.com',
                password: hashedPassword,
                role: 'Reporter',
                status: 'Pending',
                bio: 'Tech enthusiast looking to cover gadget launches.',
                articlesCount: 0,
                address: 'New York, NY',
                position: 'Freelance Journalist',
                interests: ['Technology', 'Gadgets'],
                preferredLanguage: 'Hindi'
            },
            {
                fullName: 'Alice Johnson',
                email: 'alice@user.com',
                password: hashedPassword,
                role: 'User',
                status: 'Active',
                address: 'Chicago, IL',
                interests: ['Local', 'Sports'],
                lastLogin: new Date(Date.now() - 86400000),
                loginCount: 12
            },
            {
                fullName: 'Bob Smith',
                email: 'bob@user.com',
                password: hashedPassword,
                role: 'User',
                status: 'Active',
                address: 'Miami, FL',
                interests: ['Business', 'Health'],
                loginCount: 5
            }
        ]);

        const sarahId = dbUsers[0]._id;
        const aliceId = dbUsers[2]._id;
        const bobId = dbUsers[3]._id;

        console.log("Users seeded.");

        // =================NEWS=================
        // Spread dates over the last 10 days for "Traffic Trends"
        const dates = Array.from({ length: 10 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d;
        });

        const dbNews = await News.insertMany([
            {
                title: 'New Community Library Opens',
                content: 'The city has officially opened its largest library wing to date.',
                author: sarahId,
                category: 'Local',
                status: 'Published',
                views: 1250,
                likes: 450,
                shares: 120,
                date: dates[0] // Today
            },
            {
                title: 'Tech Merger Shakes Market',
                content: 'Two of the biggest tech giants have announced a surprise merger.',
                author: sarahId,
                category: 'Business',
                status: 'Pending', // Pending item
                views: 0,
                likes: 0,
                shares: 0,
                date: dates[1]
            },
            {
                title: 'Local Sports Final Tonight',
                content: 'The regional football finals are set to kick off tonight.',
                author: sarahId,
                category: 'Sports',
                status: 'Published',
                views: 3400,
                likes: 890,
                shares: 450,
                date: dates[2]
            },
            {
                title: 'Healthy Living Workshop',
                content: 'Learn how to eat better and live longer.',
                author: sarahId,
                category: 'Health',
                status: 'Published',
                views: 500,
                likes: 120,
                shares: 30,
                date: dates[4]
            },
            {
                title: 'Election Results Announced',
                content: 'The final count is in for the local council elections.',
                author: sarahId,
                category: 'Politics',
                status: 'Published',
                views: 5000,
                likes: 1200,
                shares: 800,
                date: dates[6]
            },
            {
                title: 'Rejected Draft',
                content: 'This was not good enough.',
                author: sarahId,
                category: 'Lifestyle',
                status: 'Rejected',
                views: 10,
                date: dates[8]
            }
        ]);

        console.log("News seeded.");

        // =================COMMUNITIES=================
        const communities = await Community.insertMany([
            {
                name: 'Tech Enthusiasts',
                description: 'Coding and Gadgets.',
                type: 'Single',
                creator: sarahId,
                status: 'Active',
                membersCount: 125,
                members: [sarahId, aliceId, bobId]
            },
            {
                name: 'Local Farmers',
                description: 'Fresh produce news.',
                type: 'Single',
                creator: aliceId,
                status: 'Active',
                membersCount: 340,
                members: [aliceId, bobId]
            }
        ]);

        console.log("Communities seeded.");

        // =================ACTIVITY LOGS=================
        // Bulk create logs for "Engagement Trends" (Views/Likes over time)
        const logs = [];

        // Generate logs for the last 10 days to cover different timeframes
        const targetNews = dbNews; // Use all seeded news

        for (let i = 0; i < 10; i++) {
            const day = new Date();
            day.setDate(day.getDate() - i);

            // For each news item, generate random interactions for this day
            targetNews.forEach(newsItem => {
                // 1. Views (High volume)
                const viewsCount = Math.floor(Math.random() * 50) + 20;
                for (let v = 0; v < viewsCount; v++) {
                    logs.push({
                        user: dbUsers[Math.floor(Math.random() * dbUsers.length)]._id, // Random user
                        action: 'View',
                        targetModel: 'News',
                        targetId: newsItem._id,
                        timestamp: day,
                        duration: Math.floor(Math.random() * 300)
                    });
                }

                // 2. Likes (Medium volume)
                const likesCount = Math.floor(Math.random() * 25) + 5;
                for (let l = 0; l < likesCount; l++) {
                    logs.push({
                        user: dbUsers[Math.floor(Math.random() * dbUsers.length)]._id,
                        action: 'Like',
                        targetModel: 'News',
                        targetId: newsItem._id,
                        timestamp: day,
                        reactionType: 'Love'
                    });
                }

                // 3. Comments (Low volume)
                const commentsCount = Math.floor(Math.random() * 10) + 1;
                for (let c = 0; c < commentsCount; c++) {
                    logs.push({
                        user: dbUsers[Math.floor(Math.random() * dbUsers.length)]._id,
                        action: 'Comment',
                        targetModel: 'News',
                        targetId: newsItem._id,
                        timestamp: day,
                        details: "Great article!"
                    });
                }

                // 4. Shares (Low volume)
                const sharesCount = Math.floor(Math.random() * 8) + 0;
                for (let s = 0; s < sharesCount; s++) {
                    logs.push({
                        user: dbUsers[Math.floor(Math.random() * dbUsers.length)]._id,
                        action: 'Share',
                        targetModel: 'News',
                        targetId: newsItem._id,
                        timestamp: day
                    });
                }
            });
        }

        await ActivityLog.insertMany(logs);
        console.log(`Activity Logs seeded: ${logs.length} entries.`);

        // =================MODERATION=================
        await ModerationReport.insertMany([
            {
                type: 'Spam',
                targetContent: 'Fake news comment',
                reporter: 'alice@user.com',
                status: 'Pending',
                severity: 'Low'
            }
        ]);

        console.log("Seeding completed successfully!");
        process.exit();
    } catch (error) {
        console.error("Seeding error:", error);
        process.exit(1);
    }
};

seedData();
