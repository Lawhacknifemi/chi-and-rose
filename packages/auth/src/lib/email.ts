
import { env } from "@chi-and-rose/env/server";
import nodemailer from "nodemailer";

// Mock transport for development
const mockTransport = nodemailer.createTransport({
    streamTransport: true,
    newline: "unix",
    buffer: true,
});

// Production transport (if Resend/SMTP is configured)
// const prodTransport = ...

const transporter = env.RESEND_API_KEY
    ? nodemailer.createTransport({
        host: "smtp.resend.com",
        secure: true,
        port: 465,
        auth: {
            user: "resend",
            pass: env.RESEND_API_KEY,
        },
    })
    : mockTransport;

type SendEmailProps = {
    to: string;
    subject: string;
    text: string;
};

export async function sendEmail({ to, subject, text }: SendEmailProps) {
    const info = await transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject,
        text,
    });

    if (!env.RESEND_API_KEY) {
        console.log("📨 [MOCK EMAIL SENT] 📨");
        console.log("To:", to);
        console.log("Subject:", subject);
        console.log("Body:", text);
        console.log("-----------------------");
    }

    return info;
}
