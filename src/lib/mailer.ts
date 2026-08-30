import nodemailer from "nodemailer";

// Brevo / Standard SMTP Transporter Configuration
const host = process.env.SMTP_HOST || "smtp-relay.brevo.com";
const port = Number(process.env.SMTP_PORT) || 587;
const user = process.env.SMTP_USER || process.env.EMAIL_FROM || "";
const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || "";
const isSecure = Boolean(process.env.SMTP_SECURE === "true" || port === 465);

// The From address: must match an authorized sender in Brevo (or SMTP_FROM_EMAIL)
const fromEmail =
  process.env.SMTP_FROM_EMAIL ||
  (user && !user.includes("smtp-brevo.com") ? user : "notifications@dsamrr.dev");

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure: isSecure,
  auth: {
    user,
    pass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

function isValidEmail(value: string): boolean {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) && !/[\r\n]/.test(value);
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Helper: send email with Brevo REST API fallback if SMTP port/auth fails
async function dispatchEmail(params: {
  toEmail: string;
  subject: string;
  html: string;
}): Promise<EmailResponse> {
  const { toEmail, subject, html } = params;

  // 1. Try Brevo REST API if SMTP key starts with xkeysib or BREVO_API_KEY is provided
  const apiKey = process.env.BREVO_API_KEY || (pass.startsWith("xkeysib-") ? pass : null);
  if (apiKey) {
    try {
      const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
          accept: "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: "DSAMRR",
            email: process.env.SMTP_FROM_EMAIL || "notifications@dsamrr.dev",
          },
          to: [{ email: toEmail }],
          subject,
          htmlContent: html,
        }),
      });

      if (brevoRes.ok) {
        const data = await brevoRes.json();
        return { success: true, messageId: data.messageId };
      }
    } catch (apiErr) {
      console.warn("Brevo REST API fallback note:", apiErr);
    }
  }

  // 2. Default: Standard Nodemailer SMTP
  try {
    const info = await transporter.sendMail({
      from: `"DSAMRR" <${fromEmail}>`,
      to: toEmail,
      subject,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.warn("SMTP send note (logged):", err.message);
    return { success: false, error: err.message || "Email delivery failed" };
  }
}

// 1. Signup 6-digit OTP Email Template
export async function sendSignupOtpEmail(params: {
  toEmail: string;
  otpCode: string;
}): Promise<EmailResponse> {
  const { toEmail, otpCode } = params;
  if (!isValidEmail(toEmail)) return { success: false, error: "Invalid recipient email" };

  const html = `
    <div style="background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; border-radius: 16px; border: 1px solid #27272a;">
      <div style="margin-bottom: 20px;">
        <span style="background: #022c22; color: #34d399; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; border: 1px solid #065f46; text-transform: uppercase;">Verification Code</span>
      </div>
      <h2 style="font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 10px;">Confirm your DSAMRR account</h2>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">
        Enter the following 6-digit verification code to complete your signup on DSAMRR. This code is valid for 10 minutes.
      </p>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <div style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #10b981; font-family: monospace;">${otpCode}</div>
      </div>
      <p style="font-size: 12px; color: #71717a; line-height: 1.5;">
        If you did not request this verification code, please disregard this email.
      </p>
    </div>
  `;

  return dispatchEmail({
    toEmail,
    subject: `Your DSAMRR Verification Code: ${otpCode}`,
    html,
  });
}

// 2. Ad Live Confirmation Receipt (Instant upon payment)
export async function sendAdLiveConfirmationEmail(params: {
  toEmail: string;
  adName: string;
  slotId?: string;
  slotLabel?: string;
  durationDays: number;
  amountPaise?: number;
  paymentId?: string;
  startedAt?: string;
  expiresAt?: string;
  targetUrl?: string;
}): Promise<EmailResponse> {
  const { toEmail, adName, slotId, slotLabel, durationDays, amountPaise, paymentId, startedAt, expiresAt } = params;
  if (!isValidEmail(toEmail)) return { success: false, error: "Invalid recipient email" };

  const spotName = slotLabel || slotId || "L1";
  const amountRupees = amountPaise ? amountPaise / 100 : (durationDays === 15 ? 20 : 35);
  const html = `
    <div style="background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border-radius: 16px; border: 1px solid #27272a;">
      <div style="margin-bottom: 20px;">
        <span style="background: #022c22; color: #34d399; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; border: 1px solid #065f46; text-transform: uppercase;">Payment Confirmed & Live</span>
      </div>
      <h2 style="font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 12px;">Your advertisement is now LIVE on DSAMRR! 🎉</h2>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">
        Thank you for advertising with DSAMRR. Your campaign is active and receiving prime visibility on the leaderboard sidebar.
      </p>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="color: #a1a1aa; padding: 6px 0;">Campaign Name:</td>
            <td style="color: #ffffff; font-weight: 600; text-align: right;">${adName}</td>
          </tr>
          <tr>
            <td style="color: #a1a1aa; padding: 6px 0;">Spot Location:</td>
            <td style="color: #34d399; font-weight: 700; text-align: right;">Spot #${spotName.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="color: #a1a1aa; padding: 6px 0;">Duration:</td>
            <td style="color: #ffffff; text-align: right;">${durationDays} Days</td>
          </tr>
          <tr>
            <td style="color: #a1a1aa; padding: 6px 0;">Active Window:</td>
            <td style="color: #ffffff; text-align: right;">${startedAt || "Today"} &rarr; ${expiresAt || "15/30 days"}</td>
          </tr>
          <tr>
            <td style="color: #a1a1aa; padding: 6px 0;">Amount Paid:</td>
            <td style="color: #34d399; font-weight: 700; font-size: 15px; text-align: right;">&#8377;${amountRupees}</td>
          </tr>
          ${paymentId ? `<tr>
            <td style="color: #71717a; padding: 6px 0; font-size: 11px;">Payment Reference:</td>
            <td style="color: #71717a; text-align: right; font-family: monospace; font-size: 11px;">${paymentId}</td>
          </tr>` : ""}
        </table>
      </div>
      <p style="font-size: 13px; color: #71717a; line-height: 1.5;">
        You will receive a complete performance analytics wrap-up on the final day of your campaign.
      </p>
    </div>
  `;

  return dispatchEmail({
    toEmail,
    subject: `Ad Receipt & Live Confirmation: Spot #${spotName.toUpperCase()} (₹${amountRupees})`,
    html,
  });
}

// 3. Pre-Book Confirmation Receipt (Instant upon payment for future spot)
export async function sendAdPrebookConfirmationEmail(params: {
  toEmail: string;
  adName: string;
  slotId?: string;
  slotLabel?: string;
  durationDays: number;
  amountPaise?: number;
  paymentId?: string;
  queuePosition?: number;
  scheduledStart?: string;
  scheduledEnd?: string;
  startedAt?: string;
  expiresAt?: string;
}): Promise<EmailResponse> {
  const { toEmail, adName, slotId, slotLabel, durationDays, amountPaise, paymentId, scheduledStart, scheduledEnd, startedAt, expiresAt } = params;
  if (!isValidEmail(toEmail)) return { success: false, error: "Invalid recipient email" };

  const spotName = slotLabel || slotId || "L1";
  const amountRupees = amountPaise ? amountPaise / 100 : (durationDays === 15 ? 20 : 35);
  const startDate = scheduledStart || startedAt || "Scheduled Date";
  const endDate = scheduledEnd || expiresAt || "Scheduled End";

  const html = `
    <div style="background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border-radius: 16px; border: 1px solid #27272a;">
      <div style="margin-bottom: 20px;">
        <span style="background: #172554; color: #60a5fa; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; border: 1px solid #1e40af; text-transform: uppercase;">Pre-Book Spot Reserved</span>
      </div>
      <h2 style="font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 12px;">Your spot is reserved on DSAMRR! 🔒</h2>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">
        Your payment has been verified and your upcoming ad slot is guaranteed in our queue.
      </p>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="color: #a1a1aa; padding: 6px 0;">Campaign Name:</td>
            <td style="color: #ffffff; font-weight: 600; text-align: right;">${adName}</td>
          </tr>
          <tr>
            <td style="color: #a1a1aa; padding: 6px 0;">Reserved Spot:</td>
            <td style="color: #60a5fa; font-weight: 700; text-align: right;">Spot #${spotName.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="color: #a1a1aa; padding: 6px 0;">Scheduled Go-Live Date:</td>
            <td style="color: #34d399; font-weight: 700; text-align: right;">${startDate}</td>
          </tr>
          <tr>
            <td style="color: #a1a1aa; padding: 6px 0;">Scheduled End Date:</td>
            <td style="color: #ffffff; text-align: right;">${endDate}</td>
          </tr>
          <tr>
            <td style="color: #a1a1aa; padding: 6px 0;">Amount Paid:</td>
            <td style="color: #34d399; font-weight: 700; font-size: 15px; text-align: right;">&#8377;${amountRupees}</td>
          </tr>
          ${paymentId ? `<tr>
            <td style="color: #71717a; padding: 6px 0; font-size: 11px;">Payment ID:</td>
            <td style="color: #71717a; text-align: right; font-family: monospace; font-size: 11px;">${paymentId}</td>
          </tr>` : ""}
        </table>
      </div>
      <p style="font-size: 13px; color: #71717a; line-height: 1.5;">
        We will automatically send you an email alert the morning your advertisement goes live!
      </p>
    </div>
  `;

  return dispatchEmail({
    toEmail,
    subject: `Pre-Book Confirmed: Spot #${spotName.toUpperCase()} Go-Live on ${startDate}`,
    html,
  });
}

// 4. Pre-Book Go-Live Reminder (Morning ad goes live)
export async function sendAdStartedReminderEmail(params: {
  toEmail: string;
  adName: string;
  slotId?: string;
  slotLabel?: string;
  expiresAt: string;
  targetUrl?: string;
}): Promise<EmailResponse> {
  const { toEmail, adName, slotId, slotLabel, expiresAt } = params;
  if (!isValidEmail(toEmail)) return { success: false, error: "Invalid recipient email" };

  const spotName = slotLabel || slotId || "L1";
  const html = `
    <div style="background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border-radius: 16px; border: 1px solid #27272a;">
      <div style="margin-bottom: 20px;">
        <span style="background: #022c22; color: #34d399; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; border: 1px solid #065f46; text-transform: uppercase;">Ad Officially Live</span>
      </div>
      <h2 style="font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 12px;">Good morning! Your pre-booked ad is now LIVE 🚀</h2>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 20px;">
        Your pre-booked campaign <strong>${adName}</strong> has officially taken its spot on <strong>Spot #${spotName.toUpperCase()}</strong>.
      </p>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 18px; margin-bottom: 24px; font-size: 13px;">
        <div style="color: #ffffff; margin-bottom: 8px;"><strong>Status:</strong> Active & Visible</div>
        <div style="color: #a1a1aa;"><strong>Expires on:</strong> ${expiresAt}</div>
      </div>
      <p style="font-size: 13px; color: #71717a;">
        Track live traffic on the DSAMRR leaderboard.
      </p>
    </div>
  `;

  return dispatchEmail({
    toEmail,
    subject: `Your Ad Campaign "${adName}" is Now LIVE on DSAMRR!`,
    html,
  });
}

// 5. Campaign Final Day Analytics Report
export async function sendAdCompletionAnalyticsEmail(params: {
  toEmail: string;
  adName: string;
  slotId?: string;
  slotLabel?: string;
  startedAt?: string;
  expiresAt?: string;
  impressions?: number;
  totalViews?: number;
  clicks?: number;
  totalClicks?: number;
  durationDays?: number;
}): Promise<EmailResponse> {
  const { toEmail, adName, slotId, slotLabel, startedAt, expiresAt, impressions, totalViews, clicks, totalClicks } = params;
  if (!isValidEmail(toEmail)) return { success: false, error: "Invalid recipient email" };

  const spotName = slotLabel || slotId || "L1";
  const viewsCount = totalViews ?? impressions ?? 0;
  const clicksCount = totalClicks ?? clicks ?? 0;
  const ctr = viewsCount > 0 ? ((clicksCount / viewsCount) * 100).toFixed(2) : "0.00";

  const html = `
    <div style="background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border-radius: 16px; border: 1px solid #27272a;">
      <div style="margin-bottom: 20px;">
        <span style="background: #3b0764; color: #c084fc; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; border: 1px solid #581c87; text-transform: uppercase;">Final Campaign Analytics</span>
      </div>
      <h2 style="font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 12px;">Campaign Performance Report 📊</h2>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">
        Your campaign <strong>${adName}</strong> on <strong>Spot #${spotName.toUpperCase()}</strong> has concluded. Here are your verified engagement metrics:
      </p>
      <div style="display: flex; gap: 12px; margin-bottom: 24px;">
        <div style="flex: 1; background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; font-weight: 800; color: #34d399;">${clicksCount}</div>
          <div style="font-size: 11px; color: #a1a1aa; text-transform: uppercase; margin-top: 4px;">Total Clicks</div>
        </div>
        <div style="flex: 1; background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; font-weight: 800; color: #60a5fa;">${viewsCount}</div>
          <div style="font-size: 11px; color: #a1a1aa; text-transform: uppercase; margin-top: 4px;">Impressions</div>
        </div>
        <div style="flex: 1; background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; font-weight: 800; color: #fbbf24;">${ctr}%</div>
          <div style="font-size: 11px; color: #a1a1aa; text-transform: uppercase; margin-top: 4px;">Click-Through Rate</div>
        </div>
      </div>
      <p style="font-size: 13px; color: #71717a;">
        Thank you for advertising with DSAMRR! You can re-book or reserve any upcoming open slot anytime.
      </p>
    </div>
  `;

  return dispatchEmail({
    toEmail,
    subject: `Final Performance Report: ${clicksCount} Clicks for "${adName}" on DSAMRR`,
    html,
  });
}

// 6. Monthly Global Developer Rank Awards
export async function sendMonthlyRankAnalyticsEmail(params: {
  toEmail: string;
  username: string;
  rank: number;
  totalSolved: number;
  monthName: string;
}): Promise<EmailResponse> {
  const { toEmail, username, rank, totalSolved, monthName } = params;
  if (!isValidEmail(toEmail)) return { success: false, error: "Invalid recipient email" };

  const html = `
    <div style="background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border-radius: 16px; border: 1px solid #27272a;">
      <div style="margin-bottom: 18px;">
        <span style="background: #1e1b4b; color: #818cf8; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; border: 1px solid #3730a3; text-transform: uppercase;">${monthName} Wrap-Up</span>
      </div>
      <h2 style="font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 12px;">You are the top ${rank}${getOrdinal(rank)} person in ${monthName}! Keep rocking! 🚀</h2>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 20px;">
        Hey <strong>@${username}</strong>, huge congratulations on your grind! Here is your verified monthly performance summary on DSAMRR:
      </p>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
        <div style="font-size: 13px; color: #d4d4d8; line-height: 1.8;">
          <strong>Monthly Global Rank:</strong> <span style="color: #fbbf24; font-weight: 800; font-size: 16px;">#${rank}</span><br/>
          <strong>Total Verified Solves:</strong> <span style="color: #34d399; font-weight: 800; font-size: 16px;">${totalSolved} problems</span><br/>
        </div>
      </div>
      <p style="font-size: 13px; color: #71717a;">
        Keep up the consistency and defend your spot on the leaderboard this upcoming month!
      </p>
    </div>
  `;

  return dispatchEmail({
    toEmail,
    subject: `You are the top ${rank}${getOrdinal(rank)} person in ${monthName}! Keep rocking 🚀`,
    html,
  });
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
