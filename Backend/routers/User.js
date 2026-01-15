import express from 'express';
import { deleteUser, registerUser, loginUser, getUsers, updateUserStatus, getUserById, forgotPassword, resetPassword, verifyOTP, getReporters, verifyReporter } from "../controllers/User.js";

const router = express.Router();


router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/', getUsers);
router.put('/status/:id', updateUserStatus);
router.get('/:id', getUserById);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);
router.get('/role/reporters', getReporters);
router.put('/verify-reporter/:id', verifyReporter);
router.delete('/:id', deleteUser);

export default router;