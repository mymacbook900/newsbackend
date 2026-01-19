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
        await User.deleteMany({ role: { $ne: 'Admin' } }); // Keep admins if any
        await News.deleteMany({});
        await Community.deleteMany({});
        await Post.deleteMany({});
        await Event.deleteMany({});
        await ModerationReport.deleteMany({});
        await ActivityLog.deleteMany({});

        const hashedPassword = await bcrypt.hash('Password123!', 10);

        // 1. Users & Reporters
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
                loginCount: 45,
                notificationPreferences: { breakingNews: true, categoryNotifications: true }
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
                preferredLanguage: 'Hindi',
                themePreference: 'light',
                failedLoginAttempts: 2,
                passwordResetHistory: [new Date('2026-01-10'), new Date('2026-01-15')]
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
                loginCount: 12,
                joinedCommunities: [],
                followingCommunities: []
            }
        ]);

        const sarahId = dbUsers[0]._id;
        const aliceId = dbUsers[2]._id;

        console.log("Users seeded.");

        // 2. News
        const dbNews = await News.insertMany([
            {
                title: 'New Community Library Opens',
                content: 'The city has officially opened its largest library wing to date, offering over 50,000 new books.',
                author: sarahId,
                category: 'Local',
                status: 'Published',
                views: 1250,
                likes: 450,
                shares: 120
            },
            {
                title: 'Tech Merger Shakes Market',
                content: 'Two of the biggest tech giants have announced a surprise merger, causing stock prices to soar.',
                author: sarahId,
                category: 'Business',
                status: 'Pending',
                views: 0,
                likes: 0,
                shares: 0
            },
            {
                title: 'Local Sports Final Tonight',
                content: 'The regional football finals are set to kick off tonight at 8 PM at the City Stadium.',
                author: sarahId,
                category: 'Sports',
                status: 'Published',
                views: 3400,
                likes: 890,
                shares: 450
            },
            {
                title: 'Rejected News Item',
                content: 'This draft was rejected by moderation.',
                author: sarahId,
                category: 'Lifestyle',
                status: 'Rejected',
                views: 12,
                likes: 1,
                shares: 0
            },
            {
                title: 'Pending Scoop',
                content: 'Something big is coming...',
                author: sarahId,
                category: 'Technology',
                status: 'Pending',
                views: 0,
                likes: 0,
                shares: 0
            }
        ]);

        console.log("News seeded.");

        // 3. Activity Logs (Real interaction data)
        await ActivityLog.insertMany([
            // Alice viewing Sarah's news
            { user: aliceId, action: 'View', targetModel: 'News', targetId: dbNews[0]._id, details: 'Viewed Community Library news', duration: 120 },
            { user: aliceId, action: 'View', targetModel: 'News', targetId: dbNews[2]._id, details: 'Viewed Local Sports news', duration: 300 },

            // Alice liking and sharing Sarah's news
            { user: aliceId, action: 'Like', targetModel: 'News', targetId: dbNews[0]._id, details: 'Liked Library update', reactionType: 'Love' },
            { user: aliceId, action: 'Like', targetModel: 'News', targetId: dbNews[2]._id, details: 'Liked Sports final', reactionType: 'Love' },
            { user: aliceId, action: 'Share', targetModel: 'News', targetId: dbNews[0]._id, details: 'Shared to Facebook' },

            // Alice search behavior
            { user: aliceId, action: 'Search', targetModel: 'News', targetId: aliceId, details: 'latest technology news' },
            { user: aliceId, action: 'Search', targetModel: 'News', targetId: aliceId, details: 'farmers market timing' },

            // Alice commenting on Sarah's news
            { user: aliceId, action: 'Comment', targetModel: 'News', targetId: dbNews[0]._id, details: 'Great initiative! We need more books.' },
            { user: aliceId, action: 'Comment', targetModel: 'News', targetId: dbNews[2]._id, details: 'Excited for the game tonight!' },

            // Sarah viewing her own news
            { user: sarahId, action: 'View', targetModel: 'News', targetId: dbNews[0]._id, details: 'Author checking own post', duration: 45 }
        ]);

        console.log("Activity logs seeded.");

        // 4. Communities
        const communities = await Community.insertMany([
            {
                name: 'Tech Enthusiasts',
                description: 'A place for everyone who loves gadgets and coding.',
                type: 'Single',
                creator: sarahId,
                status: 'Active',
                membersCount: 1250
            },
            {
                name: 'Local Farmers Market',
                description: 'Connecting local growers with the community.',
                type: 'Single',
                creator: aliceId,
                status: 'Active',
                membersCount: 340
            },
            {
                name: 'Press Circle',
                description: 'Private community for verified journalists.',
                type: 'Multi',
                creator: sarahId,
                status: 'Active',
                membersCount: 45
            }
        ]);

        console.log("Communities seeded.");

        // 5. Posts
        await Post.insertMany([
            {
                author: sarahId,
                authorName: 'Sarah Connor',
                community: communities[0]._id, // Use ObjectId from seeded communities
                content: 'Just tried the new M3 chip, it is incredibly fast!',
                type: 'Public',
                likes: 45,
                comments: [
                    { user: aliceId, userName: 'Alice Johnson', text: 'Looks promising!' }
                ] // Change from number to array of objects
            },
            {
                author: aliceId,
                authorName: 'Alice Johnson',
                community: communities[1]._id, // Use ObjectId from seeded communities
                content: 'The organic apples are hitting the stalls tomorrow morning!',
                type: 'Public',
                likes: 23,
                comments: [
                    { user: sarahId, userName: 'Sarah Connor', text: 'Great! I will visit.' }
                ] // Change from number to array of objects
            }
        ]);

        console.log("Posts seeded.");

        // 6. Events
        await Event.insertMany([
            {
                title: 'Annual Tech Meetup',
                organizer: 'Tech Enthusiasts',
                date: new Date('2026-02-15'),
                location: 'Convention Center',
                category: 'Meeting',
                status: 'Upcoming',
                type: 'Community'
            },
            {
                title: 'Press Freedom Forum',
                organizer: 'Sarah Connor',
                date: new Date('2026-03-10'),
                location: 'Grand Hall',
                category: 'Workshop',
                status: 'Upcoming',
                type: 'Reporter'
            },
            {
                title: 'Grand Bhandara',
                organizer: 'Local Community',
                date: new Date('2026-01-20'),
                location: 'City Temple',
                category: 'Cultural',
                status: 'Upcoming',
                type: 'Community'
            }
        ]);

        console.log("Events seeded.");

        // 7. Moderation Reports
        await ModerationReport.insertMany([
            {
                type: 'Spam',
                targetContent: 'Comment #1234: Buy cheap watches now!',
                reporter: 'alice_unfiltered',
                status: 'Pending',
                severity: 'Low'
            },
            {
                type: 'Harassment',
                targetContent: 'User: Trolls_R_Us',
                reporter: 'bob_the_builder',
                status: 'Investigating',
                severity: 'High'
            }
        ]);

        console.log("Moderation reports seeded.");

        // 8. Update users with seeded community IDs
        await User.findByIdAndUpdate(sarahId, {
            joinedCommunities: [communities[0]._id, communities[2]._id],
            followingCommunities: [communities[1]._id]
        });
        await User.findByIdAndUpdate(aliceId, {
            joinedCommunities: [communities[1]._id],
            followingCommunities: [communities[0]._id, communities[2]._id]
        });

        console.log("User Community relationships updated.");
        console.log("Seeding completed successfully!");
        process.exit();
    } catch (error) {
        console.error("Seeding error:", error);
        process.exit(1);
    }
};

seedData();
