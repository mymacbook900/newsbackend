import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// console.log("Mail User:", process.env.MAIL_USER);
// console.log("Mail Pass set:", !!process.env.MAIL_PASS);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

export const sendEmail = async (options) => {
  const mailOptions = {
    from: `"News Portal" <${process.env.MAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  await transporter.sendMail(mailOptions);
};

export default transporter;