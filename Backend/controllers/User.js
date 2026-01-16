import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../middlewares/nodeMailer.js";
import ActivityLog from "../models/ActivityLog.js"; // Optional import if using direct log, or use controller helper if possible

/* ================= REGISTER ================= */
export const registerUser = async (req, res) => {
  try {
    const { email, password, ...rest } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      password: hashedPassword,
      ...rest // rest includes profilePicture, phone, address etc.
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Register Error:", error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
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
    const users = await User.find(query).select("-password").sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= UPDATE USER ================= */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, role, address, profilePicture, email } = req.body; // Added profilePicture

    const updateData = { fullName, phone, role, address, email };

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
    const { status, note } = req.body; // status: "Verified" or "Rejected"

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (status === "Verified") {
      user.documents.verificationStatus = "Verified";
      user.role = "Reporter"; // Upgrade role
      user.status = "Active";
    } else if (status === "Rejected") {
      user.documents.verificationStatus = "Rejected";
      // Optional: Reset role or keep as User
      user.role = "User";
    }

    await user.save();
    res.status(200).json({ message: "Reporter status updated", user });
  } catch (error) {
    console.error("Verify Reporter Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= REPORTER APPLICATION (NEW) ================= */
export const applyForReporter = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId; // Allow userId in body for testing
    const { aadhaar, pan } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.documents = {
      aadhaar,
      pan,
      verificationStatus: "Pending"
    };

    await user.save();
    res.status(200).json({ message: "Application submitted successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= SAVED CONTENT (NEW) ================= */
export const saveContent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId, itemModel } = req.body; // e.g., "News", "Post"

    const user = await User.findById(userId);

    const exists = user.savedContent.find(s => s.item.toString() === itemId);

    if (exists) {
      user.savedContent = user.savedContent.filter(s => s.item.toString() !== itemId);
      await user.save();
      return res.status(200).json({ message: "Content unsaved", saved: false });
    } else {
      user.savedContent.push({ item: itemId, itemModel });
      await user.save();
      return res.status(200).json({ message: "Content saved", saved: true });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getSavedContent = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate('savedContent.item');
    res.status(200).json(user.savedContent);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
