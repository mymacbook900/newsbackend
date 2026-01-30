import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../middlewares/nodeMailer.js";
import { logActivity } from "./Activity.js";
import extractNameAndDOB from "../utils/compareImages.js";
import { log } from "console";


/* ================= REGISTER (UPDATED) ================= */
export const registerUser = async (req, res) => {
  try {
    const { email, password, fullName, role = 'User', ...rest } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      fullName,
      password: hashedPassword,
      role,
      ...rest
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully", customId: newUser });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= LOGIN ================= */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({ token, user });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= GET USERS ================= */
export const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const query = role ? { role } : {};
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    console.error("Get Users Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= UPDATE USER ================= */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, role, address, profilePicture, email, interests, ...rest } = req.body; // Added profilePicture

    const updateData = { fullName, phone, role, address, email, interests, ...rest };

    if (profilePicture) {
      updateData.profilePicture = profilePicture;
    }

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!user)
      return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Update User Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= UPDATE STATUS ================= */
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, phone } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { status, phone },
      { new: true }
    );

    if (!user)
      return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Status updated", user });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= GET USER BY ID ================= */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate('savedContent.item')
      .populate('joinedCommunities', 'name icon membersCount description');
    if (!user)
      return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= FORGET PASSWORD (OTP) ================= */

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in user document (hashed)
    user.resetOTP = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    user.resetOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    const message = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Password Reset OTP</h2>
        <p>You requested a password reset. Use the OTP below to proceed:</p>
        <div style="background: #f4f4f4; padding: 10px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; color: #007bff;">
          ${otp}
        </div>
        <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
        <p>Thank you,<br>News Portal Team</p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: "Your Password Reset OTP",
        message
      });

      res.status(200).json({
        message: "OTP sent to email"
      });
    } catch (error) {
      user.resetOTP = undefined;
      user.resetOTPExpires = undefined;
      await user.save();

      console.error("Email sending failed:", error);
      return res.status(500).json({ message: "Email could not be sent" });
    }
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= VERIFY OTP ================= */

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const hashedOTP = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const user = await User.findOne({
      email,
      resetOTP: hashedOTP,
      resetOTPExpires: { $gt: Date.now() }
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= RESET PASSWORD (OTP) ================= */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, password } = req.body;
    const finalPassword = newPassword || password;

    if (!finalPassword) {
      return res.status(400).json({ message: "Password is required" });
    }

    const hashedOTP = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const user = await User.findOne({
      email,
      resetOTP: hashedOTP,
      resetOTPExpires: { $gt: Date.now() }
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    user.password = await bcrypt.hash(finalPassword, 10);
    user.resetOTP = undefined;
    user.resetOTPExpires = undefined;

    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= Delete User ================= */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user)
      return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= REPORTERS ================= */
export const getReporters = async (req, res) => {
  try {
    const reporters = await User.find({
      $or: [
        { role: "Reporter" },
        { "documents.verificationStatus": { $in: ["Pending", "Verified", "Rejected"] } }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json(reporters);
  } catch (error) {
    console.error("Get Reporters Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const verifyReporter = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body; // status: "Verified" | "Rejected"

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const aadhaarName = user.documents?.extractedAadhaarName;
    const panName = user.documents?.extractedPanName;

    // 🔐 Safety check before verification
    if (status === "Verified") {
      if (!aadhaarName || !panName) {
        return res.status(400).json({
          message: "OCR data missing. Cannot verify reporter."
        });
      }

      const isNameMatch =
        aadhaarName.trim().toLowerCase() ===
        panName.trim().toLowerCase();

      if (!isNameMatch) {
        user.documents.verificationStatus = "Rejected";
        user.role = "User";

        await user.save();

        return res.status(400).json({
          message: "Aadhaar and PAN name do not match. Reporter rejected.",
          aadhaarName,
          panName
        });
      }

      // ✅ Name matched → approve reporter
      user.documents.verificationStatus = "Verified";
      user.role = "Reporter";
      user.status = "Active";
    }

    // ❌ Manual rejection by Admin
    if (status === "Rejected") {
      user.documents.verificationStatus = "Rejected";
      user.role = "User";
      user.status = "Inactive";
    }

    if (note) {
      user.documents.note = note; // optional admin remark
    }

    await user.save();

    res.status(200).json({
      message: "Reporter verification updated successfully",
      user
    });

  } catch (error) {
    console.error("Verify Reporter Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= REPORTER APPLICATION (NEW) ================= */
export const applyForReporter = async (req, res) => {
  try {
    // ✅ FIX 1: correct user id
    const userId = req.user._id;

    const {
      aadhaarNumber,
      aadhaarName,
      aadhaarDOB,
      panNumber,
      panName,
      panDOB
    } = req.body;

    console.log("Apply Reporter Body:", req.body);

    // ✅ Validation
    if (
      !aadhaarNumber ||
      !aadhaarName ||
      !aadhaarDOB ||
      !panNumber ||
      !panName ||
      !panDOB
    ) {
      return res.status(400).json({
        message: "All Aadhaar and PAN details are required"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ FIX 2: Safe normalize function
    const clean = (str = "") =>
      String(str).replace(/\s+/g, "").toLowerCase();

    const isNameMatch =
      clean(aadhaarName) === clean(panName);

    // ✅ FIX 3: Normalize DOB comparison
    const isDOBMatch =
      new Date(aadhaarDOB).toISOString().slice(0, 10) ===
      new Date(panDOB).toISOString().slice(0, 10);

    // ❌ If mismatch → reject
    if (!isNameMatch || !isDOBMatch) {
      user.documents = {
        aadhaarNumber,
        aadhaarName,
        aadhaarDOB,
        panNumber,
        panName,
        panDOB,
        verificationStatus: "Rejected"
      };

      user.status = "Rejected";

      await user.save();

      return res.status(400).json({
        message: "Aadhaar and PAN details do not match. Application rejected."
      });
    }

    // ✅ If matched → Pending
    user.documents = {
      aadhaarNumber,
      aadhaarName,
      aadhaarDOB,
      panNumber,
      panName,
      panDOB,
      verificationStatus: "Pending"
    };

    user.status = "Pending";

    await user.save();

    return res.status(200).json({
      message: "Reporter application submitted successfully",
      status: "Pending for Admin Verification"
    });

  } catch (error) {
    console.error("Apply Reporter Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ================= SAVED CONTENT (NEW) ================= */
export const saveContent = async (req, res) => {
  try {
    const userId = req.user.id; // always from auth
    const { itemId, itemModel } = req.body;

    if (!itemId || !itemModel) {
      return res.status(400).json({ message: "itemId and itemModel are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const exists = user.savedContent.find(
      s => s.item.toString() === itemId && s.itemModel === itemModel
    );

    // UNSAVE
    if (exists) {
      user.savedContent = user.savedContent.filter(
        s => !(s.item.toString() === itemId && s.itemModel === itemModel)
      );
      await user.save();

      return res.status(200).json({
        message: "Content unsaved",
        saved: false
      });
    }

    // SAVE
    user.savedContent.push({ item: itemId, itemModel });
    await user.save();

    await logActivity(
      userId,
      "Save",
      itemModel,
      itemId,
      `Saved ${itemModel}`
    );

    res.status(200).json({
      message: "Content saved",
      saved: true
    });

  } catch (error) {
    console.error("Save Content Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const getSavedContent = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .populate("savedContent.item");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      count: user.savedContent.length,
      savedContent: user.savedContent
    });
  } catch (error) {
    console.error("Get Saved Content Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



