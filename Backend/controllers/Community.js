import Community from "../models/Community.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { logActivity } from "./Activity.js";

/* ================= COMMUNITY MANAGMENT ================= */

export const createCommunity = async (req, res) => {
    try {
        const { name, description, type, image, creatorId } = req.body;
        const actualCreatorId = req.user?.id || req.user?._id || creatorId;

        // Validate required fields
        if (!name) return res.status(400).json({ message: "Community name is required" });
        if (!actualCreatorId) return res.status(400).json({ message: "Creator ID is required" });

        // Check for duplicate name
        const existing = await Community.findOne({ name });
        if (existing) {
            return res.status(400).json({ message: "Community name already exists" });
        }

        // Validate Creator
        let user;
        try {
            user = await User.findById(actualCreatorId);
        } catch (e) {
            return res.status(400).json({ message: "Invalid Creator ID format" });
        }

        if (!user) {
            return res.status(404).json({ message: "Creator user not found" });
        }

        const newCommunity = new Community({
            name,
            description,
            type,
            image,
            creator: actualCreatorId,
            members: [actualCreatorId],
            membersCount: 1,
            authorizedPersons: [],
            status: type === "Single" ? "Pending" : "Pending"
        });

        await newCommunity.save();

        // Update User
        await User.findByIdAndUpdate(actualCreatorId, {
            $push: { joinedCommunities: newCommunity._id }
        });

        res.status(201).json(newCommunity);
    } catch (error) {
        console.error("Create Community Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getAllCommunities = async (req, res) => {
    try {
        const communities = await Community.find()
            .populate('creator', 'fullName email')
            .sort({ createdAt: -1 });
        res.status(200).json(communities);
    } catch (error) {
        console.error("Get Communities Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getCommunityById = async (req, res) => {
    try {
        const community = await Community.findById(req.params.id)
            .populate('creator', 'fullName')
            .populate('members', 'fullName profilePicture')
            .populate('authorizedPersons', 'fullName');

        if (!community) return res.status(404).json({ message: "Community not found" });
        res.status(200).json(community);
    } catch (error) {
        console.error("Get Community By Id Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const updateCommunity = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, type, image, status } = req.body;

        const community = await Community.findById(id);
        if (!community) return res.status(404).json({ message: "Community not found" });

        // Update fields if provided
        if (name) community.name = name;
        if (description) community.description = description;
        if (type) community.type = type;
        if (image) community.image = image;
        if (status) community.status = status;

        await community.save();
        res.status(200).json(community);
    } catch (error) {
        console.error("Update Community Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const deleteCommunity = async (req, res) => {
    try {
        const { id } = req.params;
        const community = await Community.findByIdAndDelete(id);

        if (!community) {
            return res.status(404).json({ message: "Community not found" });
        }
        res.status(200).json({ message: "Community deleted successfully" });
    } catch (error) {
        console.error("Get Community Posts Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const joinCommunity = async (req, res) => {
    try {
        const { id } = req.params; // Community ID
        const userId = req.user?.id || req.body.userId;

        if (!userId) return res.status(400).json({ message: "User ID is required" });

        const community = await Community.findById(id);
        if (!community) return res.status(404).json({ message: "Community not found" });

        // Check if already member
        if (community.members.includes(userId)) {
            return res.status(400).json({ message: "Already a member" });
        }

        // Logic check: Single vs Multi (Verification?) - For now, auto-join for simplified flow
        // Or Request based? BRD: "To become member, user must send join request... approved by creator/auth person"

        if (community.joinRequests.includes(userId)) {
            return res.status(400).json({ message: "Request already sent" });
        }

        community.joinRequests.push(userId);
        await community.save();

        if (req.user) {
            await logActivity(req.user.id, "Join", "Community", id, `Sent join request to: ${community.name}`);
        }

        res.status(200).json({ message: "Join request sent" });
    } catch (error) {
        console.error("Get Community Posts Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const approveJoinRequest = async (req, res) => {
    try {
        const { communityId, userId } = req.body;
        // Verify requester is Creator or Auth Person (Middleware usually does this or check here)
        // Assuming req.user is Creator/Auth

        const community = await Community.findById(communityId);
        if (!community) return res.status(404).json({ message: "Community not found" });

        // Remove from requests
        community.joinRequests = community.joinRequests.filter(id => id.toString() !== userId);

        // Add to members
        if (!community.members.includes(userId)) {
            community.members.push(userId);
            community.membersCount += 1;
        }

        await community.save();

        // Update User
        await User.findByIdAndUpdate(userId, {
            $push: { joinedCommunities: communityId }
        });

        res.status(200).json({ message: "User approved" });
    } catch (error) {
        console.error("Get Community Posts Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const removeMember = async (req, res) => {
    try {
        const { id, userId } = req.params; // Community ID and User ID to remove

        const community = await Community.findById(id);
        if (!community) return res.status(404).json({ message: "Community not found" });

        // Remove from members list
        if (community.members.includes(userId)) {
            community.members = community.members.filter(m => m.toString() !== userId);
            community.membersCount = Math.max(0, community.membersCount - 1);
            await community.save();

            // Update User
            await User.findByIdAndUpdate(userId, {
                $pull: { joinedCommunities: id }
            });

            return res.status(200).json({ message: "Member removed successfully" });
        } else {
            return res.status(400).json({ message: "User is not a member" });
        }
    } catch (error) {
        console.error("Remove Member Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/* ================= POST MANAGEMENT ================= */

export const createPost = async (req, res) => {
    try {
        console.log("Create Post Payload:", req.body); // DEBUG
        const { communityId, content, type, image, userId, authorName, eventData } = req.body; // Added eventData
        const authorId = req.user?.id || userId;
        const actualAuthorName = req.user?.fullName || authorName || "Anonymous User";

        if (!authorId) {
            console.error("Create Post Error: Missing Author ID");
            return res.status(400).json({ message: "Author ID is required" });
        }

        const community = await Community.findById(communityId);
        if (!community) {
            console.error(`Create Post Error: Community ${communityId} not found`);
            return res.status(404).json({ message: "Community not found" });
        }

        // Permission Check: Only Creator or Auth Persons
        const isAuthorized = community.creator.toString() === authorId || community.authorizedPersons.includes(authorId);

        if (!isAuthorized) {
            console.error(`Create Post Error: User ${authorId} not authorized for Community ${communityId}`);
            return res.status(403).json({ message: "Only authorized persons can post in this community" });
        }

        // Validate Content
        if (!content) {
            return res.status(400).json({ message: "Post content is required" });
        }

        const newPost = new Post({
            author: authorId,
            authorName: actualAuthorName,
            community: communityId,
            content,
            type: type || "Public", // Public, Member, Event
            image: req.file ? `/uploads/${req.file.filename}` : image,
            eventDetails: (type === 'Event' && eventData) ? eventData : undefined
        });

        if (type === 'Event' && eventData) {
            console.log("Processing Event Data:", eventData);
        }

        await newPost.save();

        if (authorId) {
            await logActivity(authorId, "Create", "Post", newPost._id, `Created a new post in: ${community.name}`);
        }

        console.log("Post Created Successfully:", newPost._id);
        res.status(201).json(newPost);
    } catch (error) {
        console.error("Create Post Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getCommunityPosts = async (req, res) => {
    try {
        const { communityId } = req.params;
        const posts = await Post.find({ community: communityId }).sort({ createdAt: -1 });
        res.status(200).json(posts);
    } catch (error) {
        console.error("Get Community Posts Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find()
            .populate('author', 'fullName')
            .populate('community', 'name image')
            .sort({ createdAt: -1 });
        res.status(200).json(posts);
    } catch (error) {
        console.error("Get Community Posts Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/* ================= EMAIL VERIFICATION (SINGLE CREATOR) ================= */
export const sendEmailVerification = async (req, res) => {
    try {
        const { communityId, domainEmail } = req.body;
        const community = await Community.findById(communityId);

        if (!community) return res.status(404).json({ message: "Community not found" });
        if (req.user && community.creator.toString() !== req.user.id) {
            return res.status(403).json({ message: "Only creator can verify email" });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        community.domainEmail = domainEmail;
        community.emailOTP = otp;
        community.emailOTPExpires = otpExpires;
        await community.save();

        // Send email (use existing sendEmail function)
        // await sendEmail(domainEmail, "Community Email Verification", `Your OTP is: ${otp}`);

        res.status(200).json({ message: "OTP sent to email", otp }); // Remove otp in production
    } catch (error) {
        console.error("Send Email Verification Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const verifyDomainEmail = async (req, res) => {
    try {
        const { communityId, otp } = req.body;
        const community = await Community.findById(communityId);

        if (!community) return res.status(404).json({ message: "Community not found" });
        if (community.emailOTP !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }
        if (new Date() > community.emailOTPExpires) {
            return res.status(400).json({ message: "OTP expired" });
        }

        community.isEmailVerified = true;
        community.status = "Active";
        community.emailOTP = null;
        community.emailOTPExpires = null;
        await community.save();

        res.status(200).json({ message: "Email verified, community activated", community });
    } catch (error) {
        console.error("Get Community Posts Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/* ================= AUTHORIZED PERSONS (MULTI-USER) ================= */
export const inviteAuthorizedPerson = async (req, res) => {
    try {
        const { id } = req.params; // Community ID
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const community = await Community.findById(id);
        if (!community) return res.status(404).json({ message: "Community not found" });

        // Auth Check fallback
        const creatorId = req.user?.id || community.creator.toString();
        if (community.creator.toString() !== creatorId) {
            return res.status(403).json({ message: "Only creator can invite" });
        }

        // Find user by email (Optional)
        const user = await User.findOne({ email });

        // Check if already invited or authorized (if user exists)
        if (user) {
            const alreadyAuthorized = community.authorizedPersons.includes(user._id);
            if (alreadyAuthorized) {
                return res.status(400).json({ message: "User already authorized" });
            }

            const pendingIndex = community.pendingAuthorizedPersons.findIndex(p => p.userId?.toString() === user._id.toString());

            if (pendingIndex !== -1) {
                // Update existing invitation (Resend OTP)
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

                community.pendingAuthorizedPersons[pendingIndex].otp = otp;
                community.pendingAuthorizedPersons[pendingIndex].otpExpires = otpExpires;
                await community.save();
                return res.status(200).json({ message: "OTP resent successfully", otp });
            }
        } else {
            // Check by email for non-registered users
            const pendingIndex = community.pendingAuthorizedPersons.findIndex(p => p.email === email);
            if (pendingIndex !== -1) {
                // Update existing invitation (Resend OTP)
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

                community.pendingAuthorizedPersons[pendingIndex].otp = otp;
                community.pendingAuthorizedPersons[pendingIndex].otpExpires = otpExpires;
                await community.save();
                return res.status(200).json({ message: "OTP resent successfully", otp });
            }
        }

        // Generate OTP for new invitation
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        community.pendingAuthorizedPersons.push({
            userId: user ? user._id : undefined,
            email,
            otp,
            otpExpires
        });
        await community.save();

        res.status(200).json({ message: "Invitation sent successfully", otp }); // Remove otp in production
    } catch (error) {
        console.error("Invite Authorized Person Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const approveAuthorizedInvite = async (req, res) => {
    try {
        const { communityId, otp, userId } = req.body;
        const actualUserId = req.user?.id || userId;
        const community = await Community.findById(communityId);

        if (!community) return res.status(404).json({ message: "Community not found" });

        // Find pending invitation
        const invitation = community.pendingAuthorizedPersons.find(
            p => p.userId.toString() === actualUserId && p.otp === otp
        );

        if (!invitation) {
            return res.status(400).json({ message: "Invalid OTP or invitation not found" });
        }
        if (new Date() > invitation.otpExpires) {
            return res.status(400).json({ message: "OTP expired" });
        }

        // Move to authorized persons
        community.authorizedPersons.push(actualUserId);
        community.pendingAuthorizedPersons = community.pendingAuthorizedPersons.filter(
            p => p.userId.toString() !== actualUserId
        );
        community.approvalCount += 1;

        // Activate if minimum 2 approvals
        if (community.approvalCount >= 2) {
            community.status = "Active";
        }

        await community.save();

        res.status(200).json({
            message: "Authorization approved",
            community,
            isActive: community.status === "Active"
        });
    } catch (error) {
        console.error("Get Community Posts Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/* ================= FOLLOW/UNFOLLOW ================= */
export const followCommunity = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id || req.body.userId;

        if (!userId) return res.status(400).json({ message: "User ID is required" });

        const community = await Community.findById(id);

        if (!community) return res.status(404).json({ message: "Community not found" });
        if (community.followers.includes(userId)) {
            return res.status(400).json({ message: "Already following" });
        }

        community.followers.push(userId);
        community.followersCount += 1;
        await community.save();

        // Update user
        await User.findByIdAndUpdate(userId, {
            $push: { followingCommunities: id }
        });

        await user.save(); // Not strictly necessary if only one update, but follows pattern

        if (req.user) {
            await logActivity(req.user.id, "Follow", "Community", id, `Followed community: ${community.name}`);
        }

        res.status(200).json({ message: "Followed successfully" });
    } catch (error) {
        console.error("Get Community Posts Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const unfollowCommunity = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id || req.body.userId;

        if (!userId) return res.status(400).json({ message: "User ID is required" });

        const community = await Community.findById(id);

        if (!community) return res.status(404).json({ message: "Community not found" });

        community.followers = community.followers.filter(f => f.toString() !== userId);
        community.followersCount = Math.max(0, community.followersCount - 1);
        await community.save();

        // Update user
        await User.findByIdAndUpdate(userId, {
            $pull: { followingCommunities: id }
        });

        res.status(200).json({ message: "Unfollowed successfully" });
    } catch (error) {
        console.error("Get Community Posts Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/* ================= JOIN REQUEST MANAGEMENT ================= */
export const rejectJoinRequest = async (req, res) => {
    try {
        const { communityId, userId } = req.body;
        const adminId = req.user?.id || req.body.adminId;

        if (!adminId) return res.status(400).json({ message: "Admin ID is required" });

        const community = await Community.findById(communityId);
        if (!community) return res.status(404).json({ message: "Community not found" });

        // Verify requester is Creator or Auth Person
        const isAuthorized = community.creator.toString() === adminId ||
            community.authorizedPersons.includes(adminId);
        if (!isAuthorized) {
            return res.status(403).json({ message: "Not authorized" });
        }

        community.joinRequests = community.joinRequests.filter(id => id.toString() !== userId);
        await community.save();

        res.status(200).json({ message: "Request rejected" });
    } catch (error) {
        console.error("Get Community Posts Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
