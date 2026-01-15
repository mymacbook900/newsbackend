import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true
    },
    user: {
        type: String,
        required: true
    },
    details: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
