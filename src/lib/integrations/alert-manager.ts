/**
 * Integration Alert Manager
 * Handles alert triggering, sending, and tracking for integration monitors
 */

import { db } from "@/lib/db";
import {
  integrationMonitors,
  integrationAlerts,
  userNotifications,
  users,
  clients,
} from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface IntegrationMonitor {
  id: string;
  clientId: string;
  serviceName: string;
  serviceType: string;
  currentStatus: string;
  lastErrorMessage: string | null;
  alertEnabled: boolean;
  alertChannels: string | null;
  alertThresholdMinutes: number;
  lastAlertSentAt: Date | null;
  lastCheckedAt: Date | null;
}

/**
 * Check if alerts should be sent for a monitor based on status change
 */
export async function checkAndSendAlerts(
  monitor: IntegrationMonitor,
  newStatus: string
): Promise<void> {
  try {
    // Don't alert if alerting disabled
    if (!monitor.alertEnabled) {
      return;
    }

    // Check if status changed from healthy/degraded to down
    const isNewDowntime =
      (monitor.currentStatus === "healthy" || monitor.currentStatus === "degraded") &&
      newStatus === "down";

    // Check if status changed from down to healthy (recovery)
    const isRecovery = monitor.currentStatus === "down" && newStatus === "healthy";

    // Calculate downtime duration for threshold check
    if (isNewDowntime) {
      // Check if been down long enough (using threshold)
      const thresholdMs = monitor.alertThresholdMinutes * 60 * 1000;

      // Check if we should wait before alerting (anti-flapping)
      // Only alert if last alert was null or was sent more than threshold ago
      if (
        !monitor.lastAlertSentAt ||
        Date.now() - new Date(monitor.lastAlertSentAt).getTime() > thresholdMs
      ) {
        await sendAlert(monitor, "down", "critical");
      }
    } else if (isRecovery) {
      // Always send recovery alerts immediately
      await sendAlert(monitor, "recovered", "info");
    }
  } catch (error) {
    console.error("Error checking and sending alerts:", error);
  }
}

/**
 * Send an alert through configured channels
 */
async function sendAlert(
  monitor: IntegrationMonitor,
  alertType: "down" | "degraded" | "recovered",
  severity: "critical" | "warning" | "info"
): Promise<void> {
  const channels = monitor.alertChannels
    ? JSON.parse(monitor.alertChannels)
    : ["email", "in_app"];

  const alertMessage = generateAlertMessage(monitor, alertType);

  try {
    // Send email alert
    if (channels.includes("email")) {
      await sendEmailAlert(monitor, alertType, alertMessage);
    }

    // Create in-app notification
    if (channels.includes("in_app")) {
      await createInAppNotification(monitor, alertType, alertMessage);
    }

    // Log alert to database
    await db.insert(integrationAlerts).values({
      monitorId: monitor.id,
      alertType,
      severity,
      message: alertMessage,
      errorDetails: monitor.lastErrorMessage,
      channels: JSON.stringify(channels),
    });

    // Update lastAlertSentAt
    await db
      .update(integrationMonitors)
      .set({ lastAlertSentAt: new Date() })
      .where(eq(integrationMonitors.id, monitor.id));
  } catch (error) {
    console.error("Error sending alert:", error);
  }
}

/**
 * Generate alert message based on alert type
 */
function generateAlertMessage(
  monitor: IntegrationMonitor,
  alertType: "down" | "degraded" | "recovered"
): string {
  switch (alertType) {
    case "down":
      return `Integration "${monitor.serviceName}" (${monitor.serviceType}) is currently down. ${
        monitor.lastErrorMessage || "No error details available."
      }`;
    case "degraded":
      return `Integration "${monitor.serviceName}" (${monitor.serviceType}) is experiencing degraded performance. ${
        monitor.lastErrorMessage || "No error details available."
      }`;
    case "recovered":
      return `Integration "${monitor.serviceName}" (${monitor.serviceType}) has recovered and is now operational.`;
    default:
      return `Integration "${monitor.serviceName}" (${monitor.serviceType}) status changed.`;
  }
}

/**
 * Send email alert via Resend
 */
async function sendEmailAlert(
  monitor: IntegrationMonitor,
  alertType: string,
  message: string
): Promise<void> {
  if (!resend || !process.env.EMAIL_FROM) {
    console.log("Email not configured, skipping email alert");
    return;
  }

  try {
    // Get client contact email
    const client = await db
      .select()
      .from(clients)
      .where(eq(clients.id, monitor.clientId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!client || !client.contactEmail) {
      console.log("No client contact email found");
      return;
    }

    const detailsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/admin/clients/${client.id}`;

    const emailSubject =
      alertType === "recovered"
        ? `✅ Integration Recovered: ${monitor.serviceName}`
        : `⚠️ Integration Alert: ${monitor.serviceName}`;

    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: client.contactEmail,
      subject: emailSubject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: ${alertType === "recovered" ? "#10b981" : "#ef4444"}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Integration ${alertType === "recovered" ? "Recovered" : "Alert"}</h1>
            </div>

            <div style="border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 8px 8px;">
              <h2 style="margin-top: 0; color: #111827;">${monitor.serviceName}</h2>

              <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Service:</strong> ${monitor.serviceName}</p>
                <p style="margin: 5px 0;"><strong>Type:</strong> ${monitor.serviceType}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> ${alertType === "recovered" ? "Operational" : "Down"}</p>
                ${monitor.lastCheckedAt ? `<p style="margin: 5px 0;"><strong>Last Checked:</strong> ${new Date(monitor.lastCheckedAt).toLocaleString()}</p>` : ""}
              </div>

              <p>${message}</p>

              <div style="margin-top: 30px;">
                <a href="${detailsUrl}" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Integration Details</a>
              </div>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                <p>You're receiving this because you have alerts enabled for this integration.</p>
                <p>Digital Directions Portal</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log(`Email alert sent for ${monitor.serviceName}`);
  } catch (error) {
    console.error("Error sending email alert:", error);
  }
}

/**
 * Create in-app notification for all client users
 */
async function createInAppNotification(
  monitor: IntegrationMonitor,
  alertType: string,
  message: string
): Promise<void> {
  try {
    // Get all users for this client
    const clientUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.clientId, monitor.clientId), isNull(users.deletedAt)));

    // Also notify admin users
    const adminUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));

    const allUsers = [...clientUsers, ...adminUsers];

    // Create notifications for all relevant users
    const notifications = allUsers.map((user) => ({
      userId: user.id,
      type: "integration_alert",
      title:
        alertType === "recovered"
          ? `Integration Recovered: ${monitor.serviceName}`
          : `Integration Alert: ${monitor.serviceName}`,
      message,
      linkUrl: `/dashboard/admin/clients/${monitor.clientId}`,
      isRead: false,
    }));

    if (notifications.length > 0) {
      await db.insert(userNotifications).values(notifications);
      console.log(`Created ${notifications.length} in-app notifications`);
    }
  } catch (error) {
    console.error("Error creating in-app notifications:", error);
  }
}
