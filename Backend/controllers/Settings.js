import Settings from "../models/Settings.js";

export const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
            await settings.save();
        }
        res.status(200).json(settings);
    } catch (error) {
        console.error("Get Settings Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const updateSettings = async (req, res) => {
    try {
        const { payoutPerView, payoutPerLike, payoutPerShare, eventPublicCharge, eventMemberCharge } = req.body;

        // Find existing or create new
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings(req.body);
        } else {
            if (payoutPerView !== undefined) settings.payoutPerView = payoutPerView;
            if (payoutPerLike !== undefined) settings.payoutPerLike = payoutPerLike;
            if (payoutPerShare !== undefined) settings.payoutPerShare = payoutPerShare;
            if (eventPublicCharge !== undefined) settings.eventPublicCharge = eventPublicCharge;
            if (eventMemberCharge !== undefined) settings.eventMemberCharge = eventMemberCharge;
        }

        await settings.save();
        res.status(200).json(settings);
    } catch (error) {
        console.error("Update Settings Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
