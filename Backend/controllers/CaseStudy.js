import CaseStudy from "../models/CaseStudy.js";
import { logActivity } from "./Activity.js";

export const createCaseStudy = async (req, res) => {
    try {
        const { title, content, image, author } = req.body;
        // console.log(req.body);

        const caseStudy = new CaseStudy({ title, content, image, author });
        await caseStudy.save();
        res.status(201).json(caseStudy);
    } catch (error) {
        console.error("Create Case Study Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getCaseStudies = async (req, res) => {
    try {
        const caseStudies = await CaseStudy.find().populate("author", "fullName profilePicture").sort({ date: -1 });
        res.status(200).json(caseStudies);
    } catch (error) {
        console.error("Get Case Studies Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getCaseStudyById = async (req, res) => {
    try {
        const { id } = req.params;
        const caseStudy = await CaseStudy.findById(id).populate("author", "fullName profilePicture");
        if (!caseStudy) return res.status(404).json({ message: "Case Study not found" });

        if (req.user) {
            await logActivity(req.user.id, "View", "CaseStudy", id, `Viewed case study: ${caseStudy.title}`);
        }

        res.status(200).json(caseStudy);
    } catch (error) {
        console.error("Get Case Study By ID Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteCaseStudy = async (req, res) => {
    try {
        const { id } = req.params;
        const caseStudy = await CaseStudy.findByIdAndDelete(id);
        if (!caseStudy) return res.status(404).json({ message: "Case Study not found" });
        res.status(200).json({ message: "Case Study deleted successfully" });
    } catch (error) {
        console.error("Delete Case Study Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
