import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { Resend } from "resend";

async function testEmail() {
  console.log("🔍 Testing Resend Email Configuration\n");

  // Check if API key is loaded
  const apiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  console.log("Environment Variables:");
  console.log(`- RESEND_API_KEY: ${apiKey ? `${apiKey.substring(0, 10)}...` : "❌ NOT SET"}`);
  console.log(`- EMAIL_FROM: ${emailFrom || "❌ NOT SET"}`);
  console.log(`- NEXT_PUBLIC_APP_URL: ${appUrl || "❌ NOT SET"}\n`);

  if (!apiKey) {
    console.error("❌ RESEND_API_KEY is not set in .env.local");
    process.exit(1);
  }

  if (!emailFrom) {
    console.error("❌ EMAIL_FROM is not set in .env.local");
    process.exit(1);
  }

  try {
    console.log("📧 Initializing Resend client...");
    const resend = new Resend(apiKey);

    console.log("📤 Sending test email...\n");
    const result = await resend.emails.send({
      from: emailFrom,
      to: "bryce@digitaldirections.io", // Replace with your email
      subject: "Test Email from Digital Directions Portal",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ Email Configuration Test</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin-top: 0;">Hi there,</p>
            <p>If you're seeing this, your Resend email configuration is working correctly! 🎉</p>
            <p>This test was sent from your Digital Directions Portal.</p>
            <ul style="color: #6b7280; font-size: 14px;">
              <li>API Key: Configured ✓</li>
              <li>Email Sender: ${emailFrom} ✓</li>
              <li>Email Service: Resend ✓</li>
            </ul>
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
            Digital Directions • HiBob Implementation Specialists
          </p>
        </body>
        </html>
      `,
    });

    console.log("✅ Email sent successfully!");
    console.log("\nResponse from Resend:");
    console.log(JSON.stringify(result, null, 2));
    console.log("\n💡 Check your inbox at bryce@digitaldirections.io");
    console.log("   (Also check spam/junk folder if you don't see it)");
  } catch (error: any) {
    console.error("\n❌ Failed to send test email");
    console.error("\nError details:");
    console.error(error);

    if (error.message?.includes("API key")) {
      console.error("\n💡 This looks like an API key issue. Verify:");
      console.error("   1. Your API key is correct in .env.local");
      console.error("   2. Your Resend account is active");
      console.error("   3. You're using a valid API key (starts with 're_')");
    } else if (error.message?.includes("domain")) {
      console.error("\n💡 This looks like a domain issue. Note:");
      console.error("   - The default 'onboarding@resend.dev' domain has limitations");
      console.error("   - You may need to verify a custom domain in Resend");
      console.error("   - Check: https://resend.com/domains");
    }

    process.exit(1);
  }

  process.exit(0);
}

testEmail();
