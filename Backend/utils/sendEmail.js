// utils/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

export const sendEmail = async ({ email, subject, message }) => {
  await transporter.sendMail({
    from: `"News Portal" <${process.env.MAIL_USER}>`,
    to: email,
    subject,
    html: message
  });
};

export default transporter;
