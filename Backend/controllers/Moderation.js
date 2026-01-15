import ModerationReport from "../models/ModerationReport.js";

export const getReports = async (req, res) => {
    try {
        const reports = await ModerationReport.find().sort({ createdAt: -1 });
        res.status(200).json(reports);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const updateReportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const report = await ModerationReport.findByIdAndUpdate(id, { status }, { new: true });
        res.status(200).json(report);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const createReport = async (req, res) => {
    try {
        const report = new ModerationReport(req.body);
        await report.save();
        res.status(201).json(report);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
