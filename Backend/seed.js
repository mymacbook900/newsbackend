import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import News from './models/News.js';
import Community from './models/Community.js';
import Post from './models/Post.js';
import Event from './models/Event.js';
import ModerationReport from './models/ModerationReport.js';

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

        const hashedPassword = await bcrypt.hash('Password123!', 10);

        // 1. Users & Reporters
        const users = await User.insertMany([
            {
                fullName: 'Sarah Connor',
                email: 'sarah@reporter.com',
                password: hashedPassword,
                role: 'Reporter',
                status: 'Active',
                bio: 'Experienced local news reporter covering social issues.',
                articlesCount: 15,
                address: 'Los Angeles, CA',
                position: 'Senior Reporter'
            },
            {
                fullName: 'John Doe',
                email: 'john@reporter.com',
                password: hashedPassword,
                role: 'Reporter',
                status: 'Pending',
                bio: 'Tech enthusiast looking to cover gadget launches.',
                articlesCount: 0,
                address: 'New York, NY',
                position: 'Freelance Journalist'
            },
            {
                fullName: 'Alice Johnson',
                email: 'alice@user.com',
                password: hashedPassword,
                role: 'User',
                status: 'Active',
                address: 'Chicago, IL'
            }
        ]);

        console.log("Users seeded.");

        // 2. News
        await News.insertMany([
            {
                title: 'New Community Library Opens',
                content: 'The city has officially opened its largest library wing to date, offering over 50,000 new books.',
                author: 'Sarah Connor',
                category: 'Local',
                status: 'Published'
            },
            {
                title: 'Tech Merger Shakes Market',
                content: 'Two of the biggest tech giants have announced a surprise merger, causing stock prices to soar.',
                author: 'Admin',
                category: 'Business',
                status: 'Pending'
            },
            {
                title: 'Local Sports Final Tonight',
                content: 'The regional football finals are set to kick off tonight at 8 PM at the City Stadium.',
                author: 'Sarah Connor',
                category: 'Sports',
                status: 'Published'
            }
        ]);

        console.log("News seeded.");

        // 3. Communities
        const communities = await Community.insertMany([
            {
                name: 'Tech Enthusiasts',
                description: 'A place for everyone who loves gadgets and coding.',
                type: 'Public',
                status: 'Active',
                membersCount: 1250
            },
            {
                name: 'Local Farmers Market',
                description: 'Connecting local growers with the community.',
                type: 'Public',
                status: 'Active',
                membersCount: 340
            },
            {
                name: 'Press Circle',
                description: 'Private community for verified journalists.',
                type: 'Private',
                status: 'Active',
                membersCount: 45
            }
        ]);

        console.log("Communities seeded.");

        // 4. Posts
        await Post.insertMany([
            {
                author: users[0]._id,
                authorName: 'Sarah Connor',
                community: 'Tech Enthusiasts',
                content: 'Just tried the new M3 chip, it is incredibly fast!',
                type: 'Public',
                likes: 45,
                comments: 12
            },
            {
                author: users[2]._id,
                authorName: 'Alice Johnson',
                community: 'Local Farmers Market',
                content: 'The organic apples are hitting the stalls tomorrow morning!',
                type: 'Public',
                likes: 23,
                comments: 5
            }
        ]);

        console.log("Posts seeded.");

        // 5. Events
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

        // 6. Moderation Reports
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
        console.log("Seeding completed successfully!");
        process.exit();
    } catch (error) {
        console.error("Seeding error:", error);
        process.exit(1);
    }
};

seedData();
