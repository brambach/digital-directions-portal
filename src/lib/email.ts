import { Resend } from "resend";

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const EMAIL_FROM = process.env.EMAIL_FROM || "Digital Directions <notifications@digitaldirections.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface EmailResult {
  success: boolean;
  error?: string;
}

// Status Update Email (when project status changes)
export async function sendStatusUpdateEmail(params: {
  to: string;
  recipientName: string;
  projectName: string;
  projectId: string;
  oldStatus: string;
  newStatus: string;
}): Promise<EmailResult> {
  if (!resend) {
    console.log("Resend not configured, skipping email");
    return { success: false, error: "Email not configured" };
  }

  const statusLabels: Record<string, string> = {
    planning: "Planning",
    in_progress: "In Progress",
    review: "In Review",
    completed: "Completed",
    on_hold: "On Hold",
  };

  const oldStatusLabel = statusLabels[params.oldStatus] || params.oldStatus;
  const newStatusLabel = statusLabels[params.newStatus] || params.newStatus;

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject: `Project Update: ${params.projectName} is now ${newStatusLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Project Status Updated</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin-top: 0;">Hi ${params.recipientName},</p>
            <p>Your project <strong>${params.projectName}</strong> has been updated.</p>

            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Status changed from</p>
              <p style="margin: 8px 0;">
                <span style="background: #f3f4f6; color: #374151; padding: 4px 12px; border-radius: 20px; font-weight: 500;">${oldStatusLabel}</span>
                <span style="margin: 0 8px;">→</span>
                <span style="background: #8B5CF6; color: white; padding: 4px 12px; border-radius: 20px; font-weight: 500;">${newStatusLabel}</span>
              </p>
            </div>

            <p>
              <a href="${APP_URL}/dashboard/client/projects/${params.projectId}" style="display: inline-block; background: #8B5CF6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">View Project</a>
            </p>

            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              If you have any questions, simply reply to this email or log in to the portal to send us a message.
            </p>
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
            Digital Directions • HR Consulting & Implementation
          </p>
        </body>
        </html>
      `,
    });

    // Check if Resend returned an error
    if (result.error) {
      console.error("Resend API error:", result.error);
      return {
        success: false,
        error: result.error.message || String(result.error)
      };
    }

    console.log(`Status update email sent to ${params.to}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending status update email:", error);
    return { success: false, error: String(error) };
  }
}

// Ticket Response Email (when admin responds to ticket)
export async function sendTicketResponseEmail(params: {
  to: string;
  recipientName: string;
  ticketTitle: string;
  ticketId: string;
  responderName: string;
  responsePreview: string;
}): Promise<EmailResult> {
  if (!resend) {
    console.log("Resend not configured, skipping email");
    return { success: false, error: "Email not configured" };
  }

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject: `New Response: ${params.ticketTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Response to Your Ticket</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin-top: 0;">Hi ${params.recipientName},</p>
            <p><strong>${params.responderName}</strong> from Digital Directions has responded to your ticket:</p>

            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 12px 0; font-weight: 600; color: #374151;">${params.ticketTitle}</p>
              <div style="color: #6b7280; font-size: 14px; white-space: pre-wrap;">${params.responsePreview.substring(0, 300)}${params.responsePreview.length > 300 ? "..." : ""}</div>
            </div>

            <p>
              <a href="${APP_URL}/dashboard/client/tickets/${params.ticketId}" style="display: inline-block; background: #8B5CF6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">View Full Response</a>
            </p>

            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              Reply to this ticket directly in the portal to continue the conversation.
            </p>
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
            Digital Directions • HR Consulting & Implementation
          </p>
        </body>
        </html>
      `,
    });

    // Check if Resend returned an error
    if (result.error) {
      console.error("Resend API error:", result.error);
      return {
        success: false,
        error: result.error.message || String(result.error)
      };
    }

    console.log(`Ticket response email sent to ${params.to}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending ticket response email:", error);
    return { success: false, error: String(error) };
  }
}

// Ticket Resolved Email
export async function sendTicketResolvedEmail(params: {
  to: string;
  recipientName: string;
  ticketTitle: string;
  ticketId: string;
  resolution: string;
}): Promise<EmailResult> {
  if (!resend) {
    console.log("Resend not configured, skipping email");
    return { success: false, error: "Email not configured" };
  }

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject: `Ticket Resolved: ${params.ticketTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Your Ticket Has Been Resolved</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin-top: 0;">Hi ${params.recipientName},</p>
            <p>Great news! Your support ticket has been resolved.</p>

            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 12px 0; font-weight: 600; color: #374151;">${params.ticketTitle}</p>
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Resolution:</p>
              <div style="color: #374151; font-size: 14px; white-space: pre-wrap;">${params.resolution}</div>
            </div>

            <p>
              <a href="${APP_URL}/dashboard/client/tickets/${params.ticketId}" style="display: inline-block; background: #10B981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">View Ticket</a>
            </p>

            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              If you have any follow-up questions, feel free to create a new ticket.
            </p>
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
            Digital Directions • HR Consulting & Implementation
          </p>
        </body>
        </html>
      `,
    });

    // Check if Resend returned an error
    if (result.error) {
      console.error("Resend API error:", result.error);
      return {
        success: false,
        error: result.error.message || String(result.error)
      };
    }

    console.log(`Ticket resolved email sent to ${params.to}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending ticket resolved email:", error);
    return { success: false, error: String(error) };
  }
}

// New File Email
export async function sendNewFileEmail(params: {
  to: string;
  recipientName: string;
  projectName: string;
  projectId: string;
  fileName: string;
  uploaderName: string;
}): Promise<EmailResult> {
  if (!resend) {
    console.log("Resend not configured, skipping email");
    return { success: false, error: "Email not configured" };
  }

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject: `New File: ${params.fileName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New File Added</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin-top: 0;">Hi ${params.recipientName},</p>
            <p><strong>${params.uploaderName}</strong> has uploaded a new file to your project.</p>

            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Project: <strong>${params.projectName}</strong></p>
              <p style="margin: 0; font-size: 16px;">
                <span style="margin-right: 8px;">📎</span>
                <strong>${params.fileName}</strong>
              </p>
            </div>

            <p>
              <a href="${APP_URL}/dashboard/client/projects/${params.projectId}" style="display: inline-block; background: #8B5CF6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">Download File</a>
            </p>
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
            Digital Directions • HR Consulting & Implementation
          </p>
        </body>
        </html>
      `,
    });

    // Check if Resend returned an error
    if (result.error) {
      console.error("Resend API error:", result.error);
      return {
        success: false,
        error: result.error.message || String(result.error)
      };
    }

    console.log(`New file email sent to ${params.to}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending new file email:", error);
    return { success: false, error: String(error) };
  }
}

// Invite Email (for team members and clients)
export async function sendInviteEmail(params: {
  to: string;
  token: string;
  role: "admin" | "client";
  inviterName: string;
  clientName?: string;
}): Promise<EmailResult> {
  if (!resend) {
    console.log("Resend not configured, skipping email");
    return { success: false, error: "Email not configured" };
  }

  const inviteUrl = `${APP_URL}/invite/${params.token}`;
  const roleLabel = params.role === "admin" ? "Team Member" : "Client Portal User";

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject: params.role === "admin"
        ? "You've been invited to join Digital Directions"
        : `Welcome to the Digital Directions Portal${params.clientName ? ` - ${params.clientName}` : ""}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin-top: 0;">Hi there,</p>
            <p><strong>${params.inviterName}</strong> has invited you to join Digital Directions${params.clientName ? ` for <strong>${params.clientName}</strong>` : " as a team member"}.</p>

            ${params.role === "client"
              ? `<p>You'll have access to your projects, files, and support tickets all in one place.</p>`
              : `<p>You'll be able to manage clients, projects, and provide support through our portal.</p>`
            }

            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">Role: <strong>${roleLabel}</strong></p>
              <p style="margin: 0 0 16px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background: #8B5CF6; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 500; font-size: 16px;">Accept Invite & Sign Up</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">This invitation expires in 7 days</p>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
            Digital Directions • HR Consulting & Implementation
          </p>
        </body>
        </html>
      `,
    });

    // Check if Resend returned an error
    if (result.error) {
      console.error("Resend API error:", result.error);
      return {
        success: false,
        error: result.error.message || String(result.error)
      };
    }

    console.log(`Invite email sent successfully to ${params.to}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending invite email:", error);
    return { success: false, error: String(error) };
  }
}
