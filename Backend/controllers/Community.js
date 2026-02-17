import Community from "../models/Community.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { logActivity } from "./Activity.js";
import mongoose from "mongoose";
import { sendOTPEmail } from "../utils/sendEmail.js";
import cloudinary from "../utils/cloudinary.js"; // ← import your cloudinary config
import fs from "fs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const isOTPExpired = (expiryDate) => new Date() > new Date(expiryDate);

/**
 * Blocked public / free email domains.
 * Enforced ONLY for Single-creator communities.
 */
const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'passport.com',
  'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'ymail.com',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'aim.com',
  'protonmail.com', 'proton.me',
  'zoho.com',
  'mail.com', 'email.com', 'usa.com', 'myself.com',
  'inbox.com',
  'yandex.com', 'yandex.ru',
  'gmx.com', 'gmx.net',
  'tutanota.com', 'tuta.com',
  'fastmail.com',
  'rediffmail.com',
  'rocketmail.com',
]);

const isCorporateEmail = (email) => {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1]?.trim().toLowerCase();
  return domain ? !PUBLIC_EMAIL_DOMAINS.has(domain) : false;
};

/**
 * Upload a local file (from multer) to Cloudinary and return the secure URL.
 * Deletes the temp file from disk afterward.
 */
const uploadToCloudinary = async (filePath, folder = 'communities') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 800, height: 800, crop: 'limit', quality: 'auto:good' },
      ],
    });
    return result.secure_url;
  } finally {
    // Always clean up the temp file from disk
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

// ─── In-memory session store (replaced by DB/Redis in production) ─────────────
const pendingCommunities = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 – Initiate Community Creation
// ─────────────────────────────────────────────────────────────────────────────
export const initiateCommunityCreation = async (req, res) => {
  try {
    const creatorId = req.user.id;

    // When the request is multipart/form-data, authorizedPersons arrives as a
    // JSON string; parse it back to an array.
    let {
      name,
      description,
      type,
      Categories,
      creatorEmail,
      authorizedPersons = '[]',
    } = req.body;

    // Normalise Categories (may be JSON string from FormData)
    if (typeof Categories === 'string') {
      try { Categories = JSON.parse(Categories); } catch { Categories = []; }
    }
    if (typeof authorizedPersons === 'string') {
      try { authorizedPersons = JSON.parse(authorizedPersons); } catch { authorizedPersons = []; }
    }

    // ── Basic validation ───────────────────────────────────────────────────
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Community name is required" });
    }
    if (!type || !['Single', 'Multi'].includes(type)) {
      return res.status(400).json({ message: "Invalid community type. Must be 'Single' or 'Multi'" });
    }
    if (!creatorEmail || !creatorEmail.includes('@')) {
      return res.status(400).json({ message: "Valid creator email is required" });
    }

    // ── Single-creator: enforce corporate / domain email ───────────────────
    if (type === 'Single') {
      if (!isCorporateEmail(creatorEmail.trim())) {
        return res.status(400).json({
          message:
            "Single-creator communities require a corporate or organisation email address. " +
            "Personal email providers (Gmail, Outlook, Yahoo, iCloud, etc.) are not accepted. " +
            "Please use your company email (e.g. you@yourcompany.com).",
        });
      }
    }

    if (type === 'Multi' && (!authorizedPersons || authorizedPersons.length < 1)) {
      return res.status(400).json({
        message: "Multi-User community requires at least 1 additional authorized user",
      });
    }

    // ── Check name uniqueness ──────────────────────────────────────────────
    const existing = await Community.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: "Community name already exists" });
    }

    // ── Upload image to Cloudinary (if provided) ───────────────────────────
    let imageUrl = '';
    if (req.file) {
      console.log(`📷 Uploading community image: ${req.file.originalname}`);
      try {
        imageUrl = await uploadToCloudinary(req.file.path, 'communities');
        console.log(`✅ Image uploaded: ${imageUrl}`);
      } catch (uploadErr) {
        console.error('❌ Cloudinary upload failed:', uploadErr.message);
        return res.status(500).json({ message: "Image upload failed. Please try again." });
      }
    }

    // ── Validate authorized persons (Multi only) ───────────────────────────
    const normalizedCreatorEmail = creatorEmail.trim().toLowerCase();
    const normalizedAuthorizedEmails = [];

    if (type === 'Multi') {
      for (const email of authorizedPersons) {
        if (!email || !email.includes('@')) {
          return res.status(400).json({ message: "All authorized person emails must be valid" });
        }
        const normalizedEmail = email.trim().toLowerCase();

        if (normalizedEmail === normalizedCreatorEmail) {
          console.log(`⚠️ Skipping ${normalizedEmail} – creator is automatically authorized`);
          continue;
        }
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
          return res.status(400).json({
            message: `User with email ${email} not found. All authorized persons must be registered users.`
          });
        }

        normalizedAuthorizedEmails.push({
          email: normalizedEmail,
          userId: user._id.toString(),
          verified: false,
          otp: null,
          otpExpires: null,
        });
      }

      if (normalizedAuthorizedEmails.length < 1) {
        return res.status(400).json({
          message: "Multi-User community requires at least 1 additional authorized user (besides the creator)",
        });
      }
    }

    // ── Store pending data in memory ───────────────────────────────────────
    const tempId = `temp_${Date.now()}_${creatorId}`;

    pendingCommunities.set(tempId, {
      name: name.trim(),
      description: description || '',
      type,
      Categories: Categories || [],
      image: imageUrl,          // ← Cloudinary URL (or empty string)
      creatorId,
      creatorEmail: normalizedCreatorEmail,
      creatorVerified: false,
      creatorOtp: null,
      creatorOtpExpires: null,
      authorizedPersons: normalizedAuthorizedEmails,
      createdAt: new Date(),
    });

    // Auto-cleanup after 30 minutes
    setTimeout(() => pendingCommunities.delete(tempId), 30 * 60 * 1000);

    console.log(`✅ Community data collected & validated: ${name}`);
    console.log(`📝 Creator: ${normalizedCreatorEmail}`);
    console.log(`📝 Authorized: ${normalizedAuthorizedEmails.map(a => a.email).join(', ')}`);
    if (imageUrl) console.log(`🖼️ Image: ${imageUrl}`);

    return res.status(200).json({
      success: true,
      message: "Community data validated. Ready for step-by-step verification.",
      tempId,
      imageUrl: imageUrl || null,
      verificationFlow: {
        creator: normalizedCreatorEmail,
        authorizedUsers: normalizedAuthorizedEmails.map(a => a.email),
        totalSteps: type === 'Multi' ? 1 + normalizedAuthorizedEmails.length : 1,
      },
    });
  } catch (error) {
    console.error('❌ Initiate Community Creation Error:', error);
    return res.status(500).json({ message: "Failed to initiate community creation", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 – Send OTP to a specific email
// ─────────────────────────────────────────────────────────────────────────────
export const sendVerificationOTP = async (req, res) => {
  try {
    const { tempId, email } = req.body;
    const creatorId = req.user.id;

    if (!tempId || !email) {
      return res.status(400).json({ message: "Temporary ID and email are required" });
    }

    const pendingData = pendingCommunities.get(tempId);
    if (!pendingData) {
      return res.status(404).json({ message: "Verification session expired or not found. Please start over." });
    }
    if (pendingData.creatorId !== creatorId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isCreator = normalizedEmail === pendingData.creatorEmail;
    const authorizedUser = pendingData.authorizedPersons.find(ap => ap.email === normalizedEmail);

    if (!isCreator && !authorizedUser) {
      return res.status(400).json({ message: "Email not associated with this community" });
    }
    if (isCreator && pendingData.creatorVerified) {
      return res.status(400).json({ message: "This email is already verified" });
    }
    if (!isCreator) {
      const idx = pendingData.authorizedPersons.findIndex(ap => ap.email === normalizedEmail);
      if (pendingData.authorizedPersons[idx].verified) {
        return res.status(400).json({ message: "This email is already verified" });
      }
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    if (isCreator) {
      pendingData.creatorOtp = otp;
      pendingData.creatorOtpExpires = otpExpires;
    } else {
      const idx = pendingData.authorizedPersons.findIndex(ap => ap.email === normalizedEmail);
      pendingData.authorizedPersons[idx].otp = otp;
      pendingData.authorizedPersons[idx].otpExpires = otpExpires;
    }

    pendingCommunities.set(tempId, pendingData);

    try {
      await sendOTPEmail({
        email: normalizedEmail,
        otp,
        purpose: isCreator ? "Verify Your Email - Community Creator" : "Verify Your Email - Authorized User",
        communityName: pendingData.name,
      });

      return res.status(200).json({
        success: true,
        message: "Verification code sent to email",
        email: normalizedEmail,
        expiresIn: "10 minutes",
      });
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
      if (process.env.NODE_ENV === 'development') {
        return res.status(200).json({
          success: true,
          message: "[DEV MODE] OTP generated (check server logs)",
          email: normalizedEmail,
          otp,
          expiresIn: "10 minutes",
        });
      }
      throw emailError;
    }
  } catch (error) {
    console.error('❌ Send Verification OTP Error:', error);
    return res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 – Verify OTP for a specific email
// ─────────────────────────────────────────────────────────────────────────────
export const verifyEmailStep = async (req, res) => {
  try {
    const { tempId, email, otp } = req.body;
    const creatorId = req.user.id;

    if (!tempId || !email || !otp) {
      return res.status(400).json({ message: "Temporary ID, email, and OTP are required" });
    }

    const pendingData = pendingCommunities.get(tempId);
    if (!pendingData) {
      return res.status(404).json({ message: "Verification session expired or not found. Please start over." });
    }
    if (pendingData.creatorId !== creatorId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isCreator = normalizedEmail === pendingData.creatorEmail;

    if (isCreator) {
      if (!pendingData.creatorOtp) {
        return res.status(400).json({ message: "No OTP sent to this email yet. Please request OTP first." });
      }
      if (pendingData.creatorOtp !== otp.trim()) {
        return res.status(400).json({ message: "Invalid OTP" });
      }
      if (isOTPExpired(pendingData.creatorOtpExpires)) {
        return res.status(400).json({ message: "OTP expired. Please request a new code." });
      }
      pendingData.creatorVerified = true;
      pendingData.creatorOtp = null;
      pendingData.creatorOtpExpires = null;
    } else {
      const idx = pendingData.authorizedPersons.findIndex(ap => ap.email === normalizedEmail);
      if (idx === -1) {
        return res.status(400).json({ message: "Email not associated with this community" });
      }
      const ap = pendingData.authorizedPersons[idx];
      if (!ap.otp) {
        return res.status(400).json({ message: "No OTP sent to this email yet. Please request OTP first." });
      }
      if (ap.otp !== otp.trim()) {
        return res.status(400).json({ message: "Invalid OTP" });
      }
      if (isOTPExpired(ap.otpExpires)) {
        return res.status(400).json({ message: "OTP expired. Please request a new code." });
      }
      pendingData.authorizedPersons[idx].verified = true;
      pendingData.authorizedPersons[idx].otp = null;
      pendingData.authorizedPersons[idx].otpExpires = null;
    }

    pendingCommunities.set(tempId, pendingData);
    console.log(`✅ Email verified: ${normalizedEmail}`);

    const verifiedCount = (pendingData.creatorVerified ? 1 : 0) + pendingData.authorizedPersons.filter(ap => ap.verified).length;
    const totalEmails = 1 + pendingData.authorizedPersons.length;
    const allVerified = verifiedCount === totalEmails;

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      email: normalizedEmail,
      allVerified,
      verifiedCount,
      totalEmails,
      nextStep: allVerified ? "Ready to create community" : "Verify next email",
    });
  } catch (error) {
    console.error('❌ Verify Email Step Error:', error);
    return res.status(500).json({ message: "Failed to verify email", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 – Finalize (create the community after all emails verified)
// ─────────────────────────────────────────────────────────────────────────────
export const finalizeCommunityCreation = async (req, res) => {
  try {
    const { tempId } = req.body;
    const creatorId = req.user.id;

    if (!tempId) {
      return res.status(400).json({ message: "Temporary ID is required" });
    }

    const pendingData = pendingCommunities.get(tempId);
    if (!pendingData) {
      return res.status(404).json({ message: "Verification session expired or not found. Please start over." });
    }
    if (pendingData.creatorId !== creatorId) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    if (!pendingData.creatorVerified) {
      return res.status(400).json({ message: "Creator email not verified yet" });
    }

    const unverifiedUsers = pendingData.authorizedPersons.filter(ap => !ap.verified);
    if (unverifiedUsers.length > 0) {
      return res.status(400).json({
        message: `${unverifiedUsers.length} authorized user(s) not verified yet`,
        unverifiedEmails: unverifiedUsers.map(u => u.email),
      });
    }

    // All verified – create the community
    const authorizedUserIds = pendingData.authorizedPersons.map(ap => new mongoose.Types.ObjectId(ap.userId));

    const newCommunity = await Community.create({
      name: pendingData.name,
      description: pendingData.description,
      type: pendingData.type,
      Categories: pendingData.Categories,
      image: pendingData.image,           // ← Cloudinary URL stored here
      creator: creatorId,
      members: [creatorId],
      membersCount: 1,
      domainEmail: pendingData.creatorEmail,
      isEmailVerified: true,
      authorizedPersons: authorizedUserIds,
      status: "Active",
      approvalCount: authorizedUserIds.length,
    });

    pendingCommunities.delete(tempId);

    console.log(`✅ Community created: ${newCommunity._id} | Image: ${pendingData.image || 'none'}`);

    return res.status(201).json({
      success: true,
      message: "Community created successfully! All emails verified.",
      community: newCommunity,
    });
  } catch (error) {
    console.error('❌ Finalize Community Creation Error:', error);
    return res.status(500).json({ message: "Failed to create community", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET – Verification status
// ─────────────────────────────────────────────────────────────────────────────
export const getVerificationStatus = async (req, res) => {
  try {
    const { tempId } = req.params;
    const creatorId = req.user.id;

    const pendingData = pendingCommunities.get(tempId);
    if (!pendingData) {
      return res.status(404).json({ message: "Verification session not found" });
    }
    if (pendingData.creatorId !== creatorId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const verifiedCount = (pendingData.creatorVerified ? 1 : 0) + pendingData.authorizedPersons.filter(ap => ap.verified).length;
    const totalEmails = 1 + pendingData.authorizedPersons.length;

    return res.status(200).json({
      success: true,
      creator: { email: pendingData.creatorEmail, verified: pendingData.creatorVerified },
      authorizedUsers: pendingData.authorizedPersons.map(ap => ({ email: ap.email, verified: ap.verified })),
      allVerified: verifiedCount === totalEmails,
      verifiedCount,
      totalEmails,
    });
  } catch (error) {
    console.error('❌ Get Verification Status Error:', error);
    return res.status(500).json({ message: "Failed to get status", error: error.message });
  }
};

/* ================= EXISTING FUNCTIONS (unchanged) ================= */

export const getAllCommunities = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const userId = new mongoose.Types.ObjectId(req.user._id);
    const role = req.user.role;
    const userInterests = req.user.interests || [];
    const joinedCommunities = req.user.joinedCommunities || [];

    let filter = {};
    if (role !== "Admin") {
      filter = {
        $and: [
          { creator: { $ne: userId } },
          { members: { $ne: userId } },
          { authorizedPersons: { $ne: userId } },
          { _id: { $nin: joinedCommunities } },
        ],
      };
    }

    let communities = await Community.find(filter).populate("creator", "fullName email").lean();

    if (userInterests.length > 0) {
      communities.sort((a, b) => {
        const aScore = a.Categories?.filter(cat => userInterests.includes(cat)).length || 0;
        const bScore = b.Categories?.filter(cat => userInterests.includes(cat)).length || 0;
        return bScore - aScore;
      });
    }

    return res.status(200).json(communities);
  } catch (error) {
    console.error("Get Communities Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getCommunityById = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id)
      .populate('creator', 'fullName')
      .populate('members', 'fullName profilePicture')
      .populate('authorizedPersons', 'fullName');

    if (!community) return res.status(404).json({ message: "Community not found" });
    return res.status(200).json(community);
  } catch (error) {
    console.error("Get Community By Id Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, type, image, status } = req.body;

    const community = await Community.findById(id);
    if (!community) return res.status(404).json({ message: "Community not found" });

    if (name) community.name = name;
    if (description) community.description = description;
    if (type) community.type = type;
    if (image) community.image = image;
    if (status) community.status = status;

    // If a new image file was uploaded during update
    if (req.file) {
      try {
        const newImageUrl = await uploadToCloudinary(req.file.path, 'communities');
        community.image = newImageUrl;
      } catch (uploadErr) {
        console.error('❌ Image upload on update failed:', uploadErr.message);
      }
    }

    await community.save();
    return res.status(200).json(community);
  } catch (error) {
    console.error("Update Community Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteCommunity = async (req, res) => {
  try {
    const community = await Community.findByIdAndDelete(req.params.id);
    if (!community) return res.status(404).json({ message: "Community not found" });
    return res.status(200).json({ message: "Community deleted successfully" });
  } catch (error) {
    console.error("Delete Community Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const joinCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.body.userId;
    if (!userId) return res.status(400).json({ message: "User ID is required" });

    const community = await Community.findById(id);
    if (!community) return res.status(404).json({ message: "Community not found" });

    if (community.members.some(m => m.toString() === userId)) {
      return res.status(400).json({ message: "Already a member" });
    }
    if (community.joinRequests.some(r => r.toString() === userId)) {
      return res.status(400).json({ message: "Request already sent" });
    }

    community.joinRequests.push(userId);
    await community.save();

    if (req.user) {
      await logActivity(req.user.id, "Join Request", "Community", id, `Sent join request to ${community.name}`);
    }

    return res.status(200).json({ message: "Join request sent successfully" });
  } catch (error) {
    console.error("Join Community Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const approveJoinRequest = async (req, res) => {
  try {
    const { communityId, userId } = req.body;
    const community = await Community.findById(communityId);
    if (!community) return res.status(404).json({ message: "Community not found" });

    community.joinRequests = community.joinRequests.filter(id => id.toString() !== userId);
    if (!community.members.some(id => id.toString() === userId)) {
      community.members.push(userId);
      community.membersCount += 1;
    }
    await community.save();

    await User.findByIdAndUpdate(userId, { $addToSet: { joinedCommunities: communityId } }, { new: true });
    return res.status(200).json({ message: "User approved successfully" });
  } catch (error) {
    console.error("Approve Join Request Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const community = await Community.findById(id);
    if (!community) return res.status(404).json({ message: "Community not found" });

    if (!community.members.includes(userId)) {
      return res.status(400).json({ message: "User is not a member" });
    }

    community.members = community.members.filter(m => m.toString() !== userId);
    community.membersCount = Math.max(0, community.membersCount - 1);
    await community.save();

    await User.findByIdAndUpdate(userId, { $pull: { joinedCommunities: id } });
    return res.status(200).json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Remove Member Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const createPost = async (req, res) => {
  try {
    const { communityId, content, type, image, userId, authorName, eventData } = req.body;
    const authorId = req.user?.id || userId;
    const actualAuthorName = req.user?.fullName || authorName || "Anonymous User";

    if (!authorId) return res.status(400).json({ message: "Author ID is required" });

    const community = await Community.findById(communityId);
    if (!community) return res.status(404).json({ message: "Community not found" });

    const isCreator = community.creator.toString() === authorId;
    const isAuthorized = (community.authorizedPersons || []).map(id => id.toString()).includes(authorId);
    if (!isCreator && !isAuthorized) {
      return res.status(403).json({ message: "Only community creator and authorized persons can create posts" });
    }
    if (!content) return res.status(400).json({ message: "Post content is required" });

    // Upload post image to Cloudinary if present
    let postImageUrl = image || '';
    if (req.file) {
      try {
        postImageUrl = await uploadToCloudinary(req.file.path, 'posts');
      } catch (uploadErr) {
        console.error('Post image upload failed:', uploadErr.message);
      }
    }

    const newPost = new Post({
      author: authorId,
      authorName: actualAuthorName,
      community: communityId,
      content,
      type: type || "Public",
      image: postImageUrl,
      eventDetails: type === "Event" ? eventData : undefined,
    });

    await newPost.save();
    return res.status(201).json(newPost);
  } catch (error) {
    console.error("Create Post Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getMyAuthorizedCommunities = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const communities = await Community.find({
      $or: [{ creator: userId }, { authorizedPersons: { $in: [userId] } }],
    }).sort({ createdAt: -1 });

    return res.status(200).json(communities);
  } catch (error) {
    console.error("Get My Authorized Communities Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getCommunityPosts = async (req, res) => {
  try {
    const posts = await Post.find({ community: req.params.communityId }).sort({ createdAt: -1 });
    return res.status(200).json(posts);
  } catch (error) {
    console.error("Get Community Posts Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'fullName')
      .populate('community', 'name image')
      .sort({ createdAt: -1 });
    return res.status(200).json(posts);
  } catch (error) {
    console.error("Get All Posts Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const followCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.body.userId;
    if (!userId) return res.status(400).json({ message: "User ID is required" });

    const community = await Community.findById(id);
    if (!community) return res.status(404).json({ message: "Community not found" });

    if (community.followers.includes(userId)) return res.status(400).json({ message: "Already following" });

    community.followers.push(userId);
    community.followersCount += 1;
    await community.save();

    await User.findByIdAndUpdate(userId, { $addToSet: { followingCommunities: id } });

    if (req.user) {
      await logActivity(req.user.id, "Follow", "Community", id, `Followed community: ${community.name}`);
    }

    return res.status(200).json({ message: "Followed successfully" });
  } catch (error) {
    console.error("Follow Community Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
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

    await User.findByIdAndUpdate(userId, { $pull: { followingCommunities: id } });
    return res.status(200).json({ message: "Unfollowed successfully" });
  } catch (error) {
    console.error("Unfollow Community Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const rejectJoinRequest = async (req, res) => {
  try {
    const { communityId, userId } = req.body;
    const adminId = req.user?.id || req.body.adminId;
    if (!adminId) return res.status(400).json({ message: "Admin ID is required" });

    const community = await Community.findById(communityId);
    if (!community) return res.status(404).json({ message: "Community not found" });

    const isAuthorized = community.creator.toString() === adminId ||
      community.authorizedPersons.includes(adminId);
    if (!isAuthorized) return res.status(403).json({ message: "Not authorized" });

    community.joinRequests = community.joinRequests.filter(id => id.toString() !== userId);
    await community.save();

    return res.status(200).json({ message: "Request rejected" });
  } catch (error) {
    console.error("Reject Join Request Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ── Deprecated stubs ──────────────────────────────────────────────────────────
export const verifyAndCreateCommunity = async (req, res) => {
  console.warn('⚠️ verifyAndCreateCommunity is deprecated.');
  return res.status(400).json({ message: "This endpoint is deprecated. Use the new flow: initiate → sendOTP → verify → finalize" });
};

export const resendCreatorOTP = async (req, res) => {
  console.warn('⚠️ resendCreatorOTP is deprecated.');
  return res.status(400).json({ message: "This endpoint is deprecated. Use sendVerificationOTP instead" });
};

export const verifyAuthorizedOTP = async (req, res) => {
  console.warn('⚠️ verifyAuthorizedOTP is deprecated.');
  return res.status(400).json({ message: "This endpoint is deprecated. Use verifyEmailStep instead" });
};