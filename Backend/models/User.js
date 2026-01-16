import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: [true, "Email field is not provided"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"]
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, "Phone number must be 10 digits"]
    },
    profilePicture: { type: String, default: "" },
    headline: { type: String, default: "" },
    position: { type: String, default: "" },
    education: { type: String, default: "" },
    experience: { type: String, default: "" },
    address: { type: String, default: "" },
    bio: { type: String, default: "" },
    articlesCount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["Pending", "Active", "Inactive", "Banned", "Rejected"],
      default: "Pending"
    },

    // Reporter Specific Fields
    documents: {
      aadhaar: { type: String, default: "" },
      pan: { type: String, default: "" },
      verificationStatus: {
        type: String,
        enum: ["Not Applied", "Pending", "Verified", "Rejected"],
        default: "Not Applied"
      }
    },

    earnings: {
      currentBalance: { type: Number, default: 0 },
      totalEarned: { type: Number, default: 0 }
    },

    role: {
      type: String,
      enum: ["Admin", "Reporter", "User"],
      default: "User"
    },

    // Community Management
    joinedCommunities: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community"
    }],
    followingCommunities: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community"
    }],

    // Saved Content (Polymorphic-like)
    savedContent: [{
      item: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'savedContent.itemModel' },
      itemModel: { type: String, required: true, enum: ['News', 'Post', 'Event', 'CaseStudy'] },
      savedAt: { type: Date, default: Date.now }
    }],

    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    resetOTP: { type: String, default: null },
    resetOTPExpires: { type: Date, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
