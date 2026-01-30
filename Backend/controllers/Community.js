import Community from "../models/Community.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { logActivity } from "./Activity.js";
import mongoose from "mongoose";
import { sendEmail } from "../utils/sendEmail.js";

/* ================= COMMUNITY MANAGMENT ================= */

export const createCommunity = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      Categories,
      image,
      authorizedPersons = []
    } = req.body;

    const creatorId = req.user.id;

    if (!name) {
      return res.status(400).json({ message: "Community name required" });
    }

    const existing = await Community.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Community already exists" });
    }

    const newCommunity = await Community.create({
      name,
      description,
      type,
      Categories,
      image,
      creator: creatorId,
      members: [creatorId],
      membersCount: 1,
      status: type === "Multi" ? "Pending" : "Active"
    });

    // 🔥 SEND OTP TO AUTHORIZED PERSONS
    if (type === "Multi" && authorizedPersons.length > 0) {
      for (const email of authorizedPersons) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000;

        newCommunity.pendingAuthorizedPersons.push({
          email,
          otp,
          otpExpires
        });

        await sendEmail({
          email,
          subject: "Community Authorization OTP",
          message: `
            <h3>You are invited to join community: ${name}</h3>
            <h1>${otp}</h1>
            <p>OTP valid for 10 minutes</p>
          `
        });
      }
      await newCommunity.save();
    }

    res.status(201).json(newCommunity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


export const getAllCommunities = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);
    const role = req.user.role;
    const userInterests = req.user.interests || [];
    const joinedCommunities = req.user.joinedCommunities || [];

    let filter = {};

    // 👑 ADMIN → no filter
    if (role !== "Admin") {
      filter = {
        $and: [
          { creator: { $ne: userId } },
          { members: { $ne: userId } },
          { authorizedPersons: { $ne: userId } },
          { _id: { $nin: joinedCommunities } }
        ]
      };
    }

    let communities = await Community.find(filter)
      .populate("creator", "fullName email")
      .lean(); // 🔑 needed for JS sorting

    // ⭐ Interest based priority
    if (userInterests.length > 0) {
      communities.sort((a, b) => {
        const aScore = a.Categories?.filter(cat =>
          userInterests.includes(cat)
        ).length || 0;

        const bScore = b.Categories?.filter(cat =>
          userInterests.includes(cat)
        ).length || 0;

        return bScore - aScore; // high match first
      });
    }

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
    const { id } = req.params; // communityId
    const userId = req.user?.id || req.body.userId;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    // Already member check
    if (community.members.some(m => m.toString() === userId)) {
      return res.status(400).json({ message: "Already a member" });
    }

    // Already requested
    if (community.joinRequests.some(r => r.toString() === userId)) {
      return res.status(400).json({ message: "Request already sent" });
    }

    // ✅ Add join request
    community.joinRequests.push(userId);
    await community.save();

    if (req.user) {
      await logActivity(
        req.user.id,
        "Join Request",
        "Community",
        id,
        `Sent join request to ${community.name}`
      );
    }

    res.status(200).json({ message: "Join request sent successfully" });
  } catch (error) {
    console.error("Join Community Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const approveJoinRequest = async (req, res) => {
  try {
    const { communityId, userId } = req.body;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    // Remove from joinRequests
    community.joinRequests = community.joinRequests.filter(
      id => id.toString() !== userId
    );

    // Add member safely
    if (!community.members.some(id => id.toString() === userId)) {
      community.members.push(userId);
      community.membersCount += 1;
    }

    await community.save();

    // ✅ IMPORTANT FIX: prevent duplicate joined communities
    await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: { joinedCommunities: communityId }
      },
      { new: true }
    );

    res.status(200).json({ message: "User approved successfully" });
  } catch (error) {
    console.error("Approve Join Request Error:", error);
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
    const { communityId, content, type, image, userId, authorName, eventData } = req.body;

    const authorId = req.user?.id || userId;
    const actualAuthorName = req.user?.fullName || authorName || "Anonymous User";

    if (!authorId) {
      return res.status(400).json({ message: "Author ID is required" });
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    // ✅ FIXED permission check
    const isCreator = community.creator.toString() === authorId;
    const isAuthorized = (community.authorizedPersons || [])
      .map(id => id.toString())
      .includes(authorId);

    if (!isCreator && !isAuthorized) {
      return res.status(403).json({
        message: "You don't have permission to create post in this community"
      });
    }

    if (!content) {
      return res.status(400).json({ message: "Post content is required" });
    }

    const newPost = new Post({
      author: authorId,
      authorName: actualAuthorName,
      community: communityId,
      content,
      type: type || "Public",
      image: req.file ? `/uploads/${req.file.filename}` : image,
      eventDetails: type === "Event" ? eventData : undefined
    });

    await newPost.save();

    res.status(201).json(newPost);
  } catch (error) {
    console.error("Create Post Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// Get all communities where user is creator or authorized
export const getMyAuthorizedCommunities = async (req, res) => {
  try {
    // 🔐 Auth check
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);

    // 🔎 Find creator OR authorized person
    const communities = await Community.find({
      $or: [
        { creator: userId },
        { authorizedPersons: { $in: [userId] } }
      ]
    }).sort({ createdAt: -1 });

    // 🟢 Debug (remove later)
    console.log("User ID:", userId);
    console.log("Communities found:", communities.length);

    return res.status(200).json(communities);
  } catch (error) {
    console.error("Get My Authorized Communities Error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
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

export const verifyAuthorizedOTP = async (req, res) => {
  try {
    const { communityId, otp } = req.body;
    const userId = req.user.id;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    const invitation = community.pendingAuthorizedPersons.find(
      p => p.otp === otp
    );

    if (!invitation) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (Date.now() > invitation.otpExpires) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // ✅ Add user as authorized
    if (!community.authorizedPersons.includes(userId)) {
      community.authorizedPersons.push(userId);
    }

    // ✅ Remove pending OTP
    community.pendingAuthorizedPersons =
      community.pendingAuthorizedPersons.filter(p => p.otp !== otp);

    // ✅ Activate community if minimum 2 approvals
    community.approvalCount += 1;
    if (community.approvalCount >= 2) {
      community.status = "Active";
    }

    await community.save();

    res.json({
      message: "OTP verified successfully",
      isAuthorized: true,
      communityStatus: community.status
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= EMAIL VERIFICATION (SINGLE CREATOR) ================= */
export const sendEmailVerification = async (req, res) => {
  try {
    const { communityId, domainEmail } = req.body;

    if (!communityId || !domainEmail) {
      return res.status(400).json({ message: "communityId and domainEmail required" });
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (community.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only creator can verify email" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    community.domainEmail = domainEmail;
    community.emailOTP = otp;
    community.emailOTPExpires = otpExpires;
    await community.save();

    await sendEmail({
      email: domainEmail,
      subject: "Community Email Verification",
      message: `
                <h2>Email Verification</h2>
                <p>Your OTP is:</p>
                <h1>${otp}</h1>
                <p>Valid for 10 minutes</p>
            `
    });

    res.status(200).json({ message: "OTP sent to email successfully" });

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
    // Find pending invitation (Check by OTP which should be unique enough within community, or combined with ID)
    const invitation = community.pendingAuthorizedPersons.find(
      p => p.otp === otp && (  // Match OTP
        (userId && p.userId?.toString() === userId) || // Match UserID if provided
        (req.user?.id && p.userId?.toString() === req.user.id) || // Match Requester ID
        (!p.userId) // Or match if invite has no user ID (email only)
      )
    );

    if (!invitation) {
      return res.status(400).json({ message: "Invalid OTP or invitation not found" });
    }
    if (new Date() > invitation.otpExpires) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // Determine the ID to add (User ID from invite or passed ID)
    const userToAdd = invitation.userId || (userId ? userId : req.user?.id);

    if (!userToAdd) {
      return res.status(400).json({ message: "No valid User ID associated with this invitation. Ensure user is registered." });
    }

    // Move to authorized persons
    if (!community.authorizedPersons.includes(userToAdd)) {
      community.authorizedPersons.push(userToAdd);
    }

    community.pendingAuthorizedPersons = community.pendingAuthorizedPersons.filter(
      p => p._id.toString() !== invitation._id.toString()
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

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    if (community.followers.includes(userId)) {
      return res.status(400).json({ message: "Already following" });
    }

    // ✅ Follow
    community.followers.push(userId);
    community.followersCount += 1;
    await community.save();

    // ✅ Update user
    await User.findByIdAndUpdate(userId, {
      $addToSet: { followingCommunities: id }
    });

    if (req.user) {
      await logActivity(
        req.user.id,
        "Follow",
        "Community",
        id,
        `Followed community: ${community.name}`
      );
    }

    res.status(200).json({ message: "Followed successfully" });
  } catch (error) {
    console.error("Follow Community Error:", error);
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
