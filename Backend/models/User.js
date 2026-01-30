import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    customId: { type: String, unique: true },
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
  aadhaarNumber: { type: String, default: "" },
  aadhaarName: { type: String, default: "" },
  aadhaarDOB: { type: String, default: "" },

  panNumber: { type: String, default: "" },
  panName: { type: String, default: "" },
  panDOB: { type: String, default: "" },

  verificationStatus: {
    type: String,
    enum: [
      "Not Applied",
      "Pending",
      "Verified",
      "Rejected",
      "Document Verification Failed"
    ],
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

    // User Preferences & Interests
    interests: [{ type: String }],
    preferredLanguage: { type: String, default: "Hindi" },
    themePreference: { type: String, enum: ["light", "dark"], default: "light" },

    // Security & Login Logs
    lastLogin: { type: Date },
    loginCount: { type: Number, default: 0 },
    failedLoginAttempts: { type: Number, default: 0 },
    passwordResetHistory: [{ type: Date }],
    notificationPreferences: {
      breakingNews: { type: Boolean, default: true },
      categoryNotifications: { type: Boolean, default: true }
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
    savedContent: [
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "savedContent.itemModel"
    },
    itemModel: {
      type: String,
      required: true,
      enum: ["News", "Post", "Event", "CaseStudy"]
    },
    savedAt: { type: Date, default: Date.now }
  }
],
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    resetOTP: { type: String, default: null },
    resetOTPExpires: { type: Date, default: null }
  },
  { timestamps: true }
);

// AUTO-GENERATE CUSTOM ID
userSchema.pre('save', async function (next) {
  if (this.isNew && !this.customId) {
    const prefix = this.role === 'Admin' ? 'ADM' :
      this.role === 'Reporter' ? 'REP' : 'USR';

    // Count existing users with same role
    const count = await mongoose.model('User').countDocuments({ role: this.role });

    // Generate ID: ADM-01, REP-0001, USR-0001
    const padding = this.role === 'Admin' ? 2 : 4;
    this.customId = `${prefix}-${String(count + 1).padStart(padding, '0')}`;
  }
  next();
});

export default mongoose.model("User", userSchema);

