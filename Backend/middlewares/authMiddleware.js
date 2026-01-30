import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Community from "../models/Community.js";

export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "Access Denied: No token" });
    }

    if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Invalid token format" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("JWT Error:", error.message);
        return res.status(500).json({ message: "server error" });
    }
};

export const authorizeAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
        next();
    } else {
        return res.status(403).json({ message: "Access Denied: Admins Only" });
    }
};


export const protect = async (req, res, next) => {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({ message: "Not authorized, no token" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = await User.findById(decoded.id).select("-password");

        if (!req.user) {
            return res.status(401).json({ message: "User not found" });
        }

        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired, please login again" });
        }

        return res.status(401).json({ message: "Invalid token" });
    }
};


export const canPostInCommunity = async (req, res, next) => {
  const { communityId } = req.body;
  const userId = req.user.id;

  const community = await Community.findById(communityId);

  if (!community) {
    return res.status(404).json({ message: "Community not found" });
  }

  if (community.status !== "Active") {
    return res.status(403).json({ message: "Community not active" });
  }

  const isCreator = community.creator.toString() === userId;
  const isAuthorized = community.authorizedPersons.includes(userId);

  if (!isCreator && !isAuthorized) {
    return res.status(403).json({ message: "Not authorized to post" });
  }

  next();
};



