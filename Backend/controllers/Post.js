import Post from "../models/Post.js";
import Community from "../models/Community.js";
import Event from "../models/Event.js";
import { logActivity } from "./Activity.js";

/* ================= CREATE POST ================= */

export const createPost = async (req, res) => {
    try {
        const { communityId, content, image, type, eventDetails } = req.body;
        const userId = req.user?.id || req.body.userId;
        const authorName = req.user?.fullName || req.body.authorName;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        if (!communityId) {
            return res.status(400).json({ message: "Community ID is required" });
        }

        // Check if community exists
        const community = await Community.findById(communityId);
        if (!community) {
            return res.status(404).json({ message: "Community not found" });
        }

        // Check authorization
        const isCreator = community.creator.toString() === userId;
        const isAuthorizedPerson = community.authorizedPersons?.some(
            person => person.toString() === userId
        );
        const isMember = community.members?.some(
            member => member._id?.toString() === userId || member.toString() === userId
        );

        // Authorization logic:
        // - Creator and Authorized persons can create any type of post
        // - Members can only create Public posts
        if (!isCreator && !isAuthorizedPerson && !isMember) {
            return res.status(403).json({ 
                message: "You must be a member to create posts in this community" 
            });
        }

        if (!isCreator && !isAuthorizedPerson && (type === "Member" || type === "Event")) {
            return res.status(403).json({ 
                message: "Only authorized persons can create Member-only or Event posts" 
            });
        }

        // Create the post
        const newPost = new Post({
            author: userId,
            authorName,
            community: communityId,
            content,
            image: image || "",
            type: type || "Public",
            eventDetails: type === "Event" ? eventDetails : undefined
        });

        await newPost.save();

        // Log activity
        await logActivity(
            userId, 
            "Create", 
            "Post", 
            newPost._id, 
            `Created a ${type} post in community: ${community.name}`
        );

        // Populate the post before returning
        const populatedPost = await Post.findById(newPost._id)
            .populate('author', 'fullName profilePicture')
            .populate('community', 'name image');

        res.status(201).json({
            message: "Post created successfully",
            post: populatedPost,
            isAuthorized: isCreator || isAuthorizedPerson
        });
    } catch (error) {
        console.error("Create Post Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/* ================= CREATE EVENT POST ================= */

export const createEventPost = async (req, res) => {
    try {
        const { 
            communityId, 
            content, 
            image, 
            eventTitle,
            eventDescription,
            eventDate,
            eventLocation,
            eventCategory,
            isPaid,
            price,
            contactEmail,
            contactPhone
        } = req.body;

        const userId = req.user?.id || req.body.userId;
        const authorName = req.user?.fullName || req.body.authorName;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        // Check authorization
        const community = await Community.findById(communityId);
        if (!community) {
            return res.status(404).json({ message: "Community not found" });
        }

        const isCreator = community.creator.toString() === userId;
        const isAuthorizedPerson = community.authorizedPersons?.some(
            person => person.toString() === userId
        );

        if (!isCreator && !isAuthorizedPerson) {
            return res.status(403).json({ 
                message: "Only authorized persons can create events" 
            });
        }

        // Create the event first
        const newEvent = new Event({
            title: eventTitle,
            description: eventDescription,
            organizer: authorName,
            organizerId: userId,
            community: communityId,
            date: eventDate,
            location: eventLocation,
            category: eventCategory,
            type: "Community",
            isPaid: isPaid || false,
            price: price || 0,
            contactDetails: {
                email: contactEmail || "",
                phone: contactPhone || "",
                isVisible: false // Requires approval
            }
        });

        await newEvent.save();

        // Create the post linked to the event
        const newPost = new Post({
            author: userId,
            authorName,
            community: communityId,
            content,
            image: image || "",
            type: "Event",
            event: newEvent._id,
            eventDetails: {
                eventType: eventCategory,
                charge: isPaid ? price : 0,
                showContact: false,
                contactApproved: false,
                eventDate: eventDate
            }
        });

        await newPost.save();

        // Log activity
        await logActivity(
            userId, 
            "Create", 
            "Event", 
            newEvent._id, 
            `Created event: ${eventTitle}`
        );

        const populatedPost = await Post.findById(newPost._id)
            .populate('author', 'fullName profilePicture')
            .populate('community', 'name image')
            .populate('event');

        res.status(201).json({
            message: "Event created successfully",
            post: populatedPost,
            event: newEvent
        });
    } catch (error) {
        console.error("Create Event Post Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/* ================= GET COMMUNITY POSTS (FILTERED BY USER ROLE) ================= */

export const getCommunityPosts = async (req, res) => {
    try {
        const { communityId } = req.params;
        const userId = req.user?.id || req.query.userId || req.body.userId;

        if (!communityId) {
            return res.status(400).json({ message: "Community ID is required" });
        }

        const community = await Community.findById(communityId);
        if (!community) {
            return res.status(404).json({ message: "Community not found" });
        }

        // Determine user's role in the community
        const isCreator = userId && community.creator.toString() === userId;
        const isAuthorizedPerson = userId && community.authorizedPersons?.some(
            person => person.toString() === userId
        );
        const isMember = userId && community.members?.some(
            member => member._id?.toString() === userId || member.toString() === userId
        );
        const isFollower = userId && community.followers?.includes(userId);

        let query = { community: communityId };

        // Filter posts based on user role
        if (isCreator || isAuthorizedPerson || isMember) {
            // Members can see all posts (Public, Member, Event)
            query = { community: communityId };
        } else if (isFollower) {
            // Followers can only see Public and Event posts
            query = { community: communityId, type: { $in: ["Public", "Event"] } };
        } else {
            // Non-members/non-followers can only see Public posts
            query = { community: communityId, type: "Public" };
        }

        const posts = await Post.find(query)
            .populate('author', 'fullName profilePicture')
            .populate('community', 'name image')
            .populate('event')
            .sort({ createdAt: -1 });

        res.status(200).json({
            posts,
            userRole: {
                isCreator,
                isAuthorizedPerson,
                isMember,
                isFollower,
                canCreatePost: isMember || isAuthorizedPerson || isCreator,
                canCreateEvent: isAuthorizedPerson || isCreator,
                canCreateMemberPost: isAuthorizedPerson || isCreator
            }
        });
    } catch (error) {
        console.error("Get Community Posts Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/* ================= CHECK USER AUTHORIZATION ================= */

export const checkUserAuthorization = async (req, res) => {
    try {
        const { communityId } = req.params;
        const userId = req.user?.id || req.query.userId || req.body.userId;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const community = await Community.findById(communityId);
        if (!community) {
            return res.status(404).json({ message: "Community not found" });
        }

        const isCreator = community.creator.toString() === userId;
        const isAuthorizedPerson = community.authorizedPersons?.some(
            person => person.toString() === userId
        );
        const isMember = community.members?.some(
            member => member._id?.toString() === userId || member.toString() === userId
        );
        const isFollower = community.followers?.includes(userId);

        res.status(200).json({
            isCreator,
            isAuthorizedPerson,
            isMember,
            isFollower,
            canCreatePost: isMember || isAuthorizedPerson || isCreator,
            canCreateEvent: isAuthorizedPerson || isCreator,
            canCreateMemberPost: isAuthorizedPerson || isCreator,
            canViewMemberPosts: isMember || isAuthorizedPerson || isCreator
        });
    } catch (error) {
        console.error("Check Authorization Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/* ================= POST INTERACTIONS ================= */

export const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { content, image } = req.body;
        const userId = req.user?.id || req.body.userId;

        const post = await Post.findById(id).populate('community');
        if (!post) return res.status(404).json({ message: "Post not found" });

        // Check if user is authorized to update
        const isAuthor = post.author.toString() === userId;
        const isCreator = post.community.creator.toString() === userId;
        const isAuthorizedPerson = post.community.authorizedPersons?.some(
            person => person.toString() === userId
        );

        if (!isAuthor && !isCreator && !isAuthorizedPerson) {
            return res.status(403).json({ message: "Not authorized to update this post" });
        }

        if (content) post.content = content;
        if (image !== undefined) post.image = image;

        await post.save();
        res.status(200).json({ message: "Post updated successfully", post });
    } catch (error) {
        console.error("Update Post Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id || req.body.userId;

        const post = await Post.findById(id).populate('community');
        if (!post) return res.status(404).json({ message: "Post not found" });

        // Check if user is authorized to delete
        const isAuthor = post.author.toString() === userId;
        const isCreator = post.community.creator.toString() === userId;
        const isAuthorizedPerson = post.community.authorizedPersons?.some(
            person => person.toString() === userId
        );

        if (!isAuthor && !isCreator && !isAuthorizedPerson) {
            return res.status(403).json({ message: "Not authorized to delete this post" });
        }

        await Post.findByIdAndDelete(id);
        res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        console.error("Delete Post Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const likePost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findByIdAndUpdate(
            id,
            { $inc: { likes: 1 } },
            { new: true }
        );

        if (req.user) {
            await logActivity(req.user.id, "Like", "Post", id, `Liked a post`);
        }
        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const commentOnPost = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        const userId = req.user?.id || req.body.userId;
        const userName = req.user?.fullName || req.body.userName || "Anonymous";

        if (!userId) return res.status(400).json({ message: "User ID is required" });

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        post.comments.push({
            user: userId,
            userName,
            text
        });
        await post.save();

        if (userId) {
            await logActivity(userId, "Comment", "Post", id, `Commented on a post: "${text.substring(0, 20)}..."`);
        }

        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const sharePost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findByIdAndUpdate(
            id,
            { $inc: { shares: 1 } },
            { new: true }
        );

        if (req.user) {
            await logActivity(req.user.id, "Share", "Post", id, `Shared a post`);
        }
        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteComment = async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const post = await Post.findById(id);

        if (!post) return res.status(404).json({ message: "Post not found" });

        post.comments = post.comments.filter(c => c._id.toString() !== commentId);
        await post.save();

        res.status(200).json(post);
    } catch (error) {
        console.error("Delete Comment Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/* ================= EVENT CONTACT VIEW ================= */

export const requestContactView = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findById(id);

        if (!post) return res.status(404).json({ message: "Post not found" });
        if (post.type !== "Event") {
            return res.status(400).json({ message: "Not an event post" });
        }

        post.eventDetails.showContact = true;
        post.eventDetails.contactApproved = false;
        await post.save();

        res.status(200).json({ message: "Contact view request sent" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const approveContactView = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findById(id).populate('community');

        if (!post) return res.status(404).json({ message: "Post not found" });

        const community = post.community;
        const userId = req.user?.id || req.body.userId;

        if (!userId) return res.status(400).json({ message: "User ID is required" });

        const isAuthorized = community.creator.toString() === userId ||
            community.authorizedPersons.includes(userId);

        if (!isAuthorized) {
            return res.status(403).json({ message: "Not authorized" });
        }

        post.eventDetails.contactApproved = true;
        await post.save();

        res.status(200).json({ message: "Contact view approved", post });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};