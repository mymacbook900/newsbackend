import express from 'express';
import {
    deleteUser,
    registerUser,
    loginUser,
    getUsers,
    updateUserStatus,
    updateUser,
    getUserById,
    forgotPassword,
    resetPassword,
    verifyOTP,
    getReporters,
    verifyReporter,
    applyForReporter,
    saveContent,
    getSavedContent
} from "../controllers/User.js";
import { authenticate, authorizeAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);
router.get('/role/reporters', getReporters); // Maybe public to see list of reporters? Or protected. Keeping public for now or verify in controller.
router.get('/', getUsers); // TEMPORARY: Made public for testing

// Protected (User)
router.get('/me/saved', authenticate, getSavedContent);
router.post('/me/saved', authenticate, saveContent);
router.get('/:id', getUserById); // Can be public profile or protected
router.put('/:id', updateUser); // TEMPORARY: Made public for testing
router.put('/verify-reporter/:id', verifyReporter); // TEMPORARY: Made public for testing
router.put('/status/:id', updateUserStatus); // TEMPORARY: Made public for testing
router.post('/apply-reporter', applyForReporter); // TEMPORARY: Made public for testing

// Admin
router.delete('/:id', authenticate, authorizeAdmin, deleteUser);

export default router;