import CaseStudy from "../models/CaseStudy.js";

/* ================= CREATE ================= */
export const createCaseStudy = async (req, res) => {
  try {
    const { title, content, image } = req.body;

    const caseStudy = await CaseStudy.create({
      title,
      content,
      image,
      author: req.user.id
    });

    res.status(201).json(caseStudy);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= GET ALL ================= */
export const getCaseStudies = async (req, res) => {
  try {
    const data = await CaseStudy.find()
      .populate("author", "fullName profilePicture")
      .sort({ createdAt: -1 })
      .lean();

    const formatted = data.map(item => ({
      ...item,
      likesCount: item.likes?.length || 0,
      sharesCount: item.shares?.length || 0,
      commentsCount: item.comments?.length || 0,
      viewsCount: item.views || 0
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= GET BY ID (VIEW +1) ================= */
export const getCaseStudyById = async (req, res) => {
  try {
    const caseStudy = await CaseStudy.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate("author", "fullName profilePicture")
      .populate("comments.user", "fullName profilePicture");

    if (!caseStudy) {
      return res.status(404).json({ message: "CaseStudy not found" });
    }

    res.json(caseStudy);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= DELETE ================= */
export const deleteCaseStudy = async (req, res) => {
  try {
    const caseStudy = await CaseStudy.findById(req.params.id);

    if (!caseStudy) {
      return res.status(404).json({ message: "CaseStudy not found" });
    }

    // ✅ Allow Admin OR Author
    if (
      caseStudy.author.toString() !== req.user.id &&
      req.user.role !== "Admin"
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await caseStudy.deleteOne();
    res.json({ message: "CaseStudy deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= LIKE / DISLIKE ================= */
export const toggleLikeCaseStudy = async (req, res) => {
  try {
    const caseStudy = await CaseStudy.findById(req.params.id);
    if (!caseStudy) {
      return res.status(404).json({ message: "CaseStudy not found" });
    }

    const userId = req.user.id;
    const index = caseStudy.likes.indexOf(userId);

    if (index === -1) {
      caseStudy.likes.push(userId); // LIKE
    } else {
      caseStudy.likes.splice(index, 1); // DISLIKE
    }

    await caseStudy.save();

    res.json({
      liked: index === -1,
      totalLikes: caseStudy.likes.length
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= SHARE ================= */
export const shareCaseStudy = async (req, res) => {
  try {
    const caseStudy = await CaseStudy.findById(req.params.id);
    if (!caseStudy) {
      return res.status(404).json({ message: "CaseStudy not found" });
    }

    if (!caseStudy.shares.includes(req.user.id)) {
      caseStudy.shares.push(req.user.id);
      await caseStudy.save();
    }

    res.json({ totalShares: caseStudy.shares.length });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= VIEW COUNT ================= */
export const incrementViewCount = async (req, res) => {
  try {
    const caseStudy = await CaseStudy.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!caseStudy) {
      return res.status(404).json({ message: "CaseStudy not found" });
    }

    res.json({ totalViews: caseStudy.views });
  }
  catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
 

/* ================= COMMENT ================= */
export const addComment = async (req, res) => {
  try {
    const { text } = req.body;

    const caseStudy = await CaseStudy.findById(req.params.id);
    if (!caseStudy) {
      return res.status(404).json({ message: "CaseStudy not found" });
    }

    caseStudy.comments.push({
      user: req.user.id,
      text
    });

    await caseStudy.save();
    res.status(201).json(caseStudy.comments);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= USER ACTIVITY ================= */
export const getMyLikedCaseStudies = async (req, res) => {
  const data = await CaseStudy.find({ likes: req.user.id });
  res.json(data);
};

export const getMySharedCaseStudies = async (req, res) => {
  const data = await CaseStudy.find({ shares: req.user.id });
  res.json(data);
};

export const getMyCommentedCaseStudies = async (req, res) => {
  const data = await CaseStudy.find({ "comments.user": req.user.id });
  res.json(data);
};
