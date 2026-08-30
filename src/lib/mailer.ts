import nodemailer from "nodemailer";

// Brevo / Standard SMTP Transporter Configuration
const host = process.env.SMTP_HOST || "smtp-relay.brevo.com";
const port = Number(process.env.SMTP_PORT) || 587;
const user = process.env.SMTP_USER || process.env.EMAIL_FROM || "";
const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || "";
const isSecure = Boolean(process.env.SMTP_SECURE === "true" || port === 465);

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure: isSecure,
  auth: {
    user,
    pass,
  },
});

const FROM_HEADER = `"DSAMRR" <${user || "notifications@dsamrr.dev"}>`;

function isValidEmail(value: string): boolean {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) && !/[\r\n]/.test(value);
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
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
        If you did not request this code, you can safely ignore this email.
      </p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: FROM_HEADER,
      to: toEmail,
      subject: `${otpCode} is your DSAMRR verification code`,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.warn("Brevo SMTP send note (logged):", err.message);
    return { success: false, error: "Email delivery failed" };
  }
}

// 2. Instant Live Ad Confirmation Email
export async function sendAdLiveConfirmationEmail(params: {
  toEmail: string;
  adName: string;
  slotLabel: string;
  durationDays: number;
  startedAt: string;
  expiresAt: string;
  targetUrl: string;
}): Promise<EmailResponse> {
  const { toEmail, adName, slotLabel, durationDays, startedAt, expiresAt, targetUrl } = params;
  if (!isValidEmail(toEmail)) return { success: false, error: "Invalid recipient email" };

  const html = `
    <div style="background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border-radius: 16px; border: 1px solid #27272a;">
      <div style="margin-bottom: 24px;">
        <span style="background: #022c22; color: #34d399; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; border: 1px solid #065f46; text-transform: uppercase;">Payment Confirmed</span>
      </div>
      <h2 style="font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 12px;">Payment Received! Your ad @${adName} is now LIVE</h2>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 20px;">
        Thank you for advertising with DSAMRR! Your payment was successfully received and your campaign is now active on the competitive programming leaderboard.
      </p>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
        <div style="font-size: 12px; color: #71717a; margin-bottom: 4px;">Advertisement Details:</div>
        <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 12px;">@${adName} &bull; ${slotLabel}</div>
        <div style="font-size: 13px; color: #d4d4d8; line-height: 1.8;">
          <strong>Target Link:</strong> <a href="${targetUrl}" style="color: #10b981; text-decoration: none;">${targetUrl}</a><br/>
          <strong>Campaign Duration:</strong> ${durationDays} Days<br/>
          <strong>Active Period:</strong> <span style="color: #34d399;">${startedAt}</span> to <span style="color: #fbbf24;">${expiresAt}</span>
        </div>
      </div>
      <p style="font-size: 13px; color: #71717a; line-height: 1.5;">
        You will receive a final performance analytics report with total impressions and clicks on <strong>${expiresAt}</strong>.
      </p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: FROM_HEADER,
      to: toEmail,
      subject: `Payment Received — Your ad @${adName} is now live on DSAMRR!`,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.warn("Brevo SMTP send note (logged):", err.message);
    return { success: false, error: "Email delivery failed" };
  }
}

// 3. Pre-Book Confirmation Email
export async function sendAdPrebookConfirmationEmail(params: {
  toEmail: string;
  adName: string;
  slotLabel: string;
  durationDays: number;
  startedAt: string;
  expiresAt: string;
}): Promise<EmailResponse> {
  const { toEmail, adName, slotLabel, durationDays, startedAt, expiresAt } = params;
  if (!isValidEmail(toEmail)) return { success: false, error: "Invalid recipient email" };

  const html = `
    <div style="background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border-radius: 16px; border: 1px solid #27272a;">
      <div style="margin-bottom: 24px;">
        <span style="background: #451a03; color: #fbbf24; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; border: 1px solid #78350f; text-transform: uppercase;">Slot Reserved</span>
      </div>
      <h2 style="font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 12px;">Thank you for pre-booking on DSAMRR!</h2>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 20px;">
        Thank you for pre-booking a slot for <strong>@${adName}</strong>! We wish you all the best with your launch. Your slot has been permanently locked and guaranteed in the queue.
      </p>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
        <div style="font-size: 12px; color: #71717a; margin-bottom: 4px;">Pre-Booking Schedule:</div>
        <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 12px;">${slotLabel}</div>
        <div style="font-size: 13px; color: #d4d4d8; line-height: 1.8;">
          <strong>Time Period:</strong> <span style="color: #fbbf24; font-weight: bold;">${startedAt}</span> to <span style="color: #34d399; font-weight: bold;">${expiresAt}</span> (${durationDays} Days)<br/>
          <strong>Queue Lock:</strong> Guaranteed exclusive reservation
        </div>
      </div>
      <p style="font-size: 13px; color: #71717a; line-height: 1.5;">
        We will send you a reminder email the moment your ad goes live on <strong>${startedAt}</strong>!
      </p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: FROM_HEADER,
      to: toEmail,
      subject: `Thank you for pre-booking slot ${slotLabel} on DSAMRR!`,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.warn("Brevo SMTP send note (logged):", err.message);
    return { success: false, error: "Email delivery failed" };
  }
}

// 4. Pre-Book Go-Live Reminder Email (When pre-booked ad begins)
export async function sendAdStartedReminderEmail(params: {
  toEmail: string;
  adName: string;
  slotLabel: string;
  expiresAt: string;
  targetUrl: string;
}): Promise<EmailResponse> {
  const { toEmail, adName, slotLabel, expiresAt, targetUrl } = params;
  if (!isValidEmail(toEmail)) return { success: false, error: "Invalid recipient email" };

  const html = `
    <div style="background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border-radius: 16px; border: 1px solid #27272a;">
      <h2 style="font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 12px;">Hello! Your ad @${adName} has just started!</h2>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 20px;">
        Just a quick reminder: your pre-booked advertisement for <strong>@${adName}</strong> has officially gone live on DSAMRR on <strong>${slotLabel}</strong> today!
      </p>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
        <div style="font-size: 13px; color: #d4d4d8; line-height: 1.8;">
          <strong>Target Link:</strong> <a href="${targetUrl}" style="color: #10b981; text-decoration: none;">${targetUrl}</a><br/>
          <strong>Live Until:</strong> <span style="color: #34d399; font-weight: bold;">${expiresAt}</span>
        </div>
      </div>
      <p style="font-size: 13px; color: #71717a; line-height: 1.5;">
        Thank you for choosing DSAMRR. We wish you maximum conversions!
      </p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: FROM_HEADER,
      to: toEmail,
      subject: `Hello! Your ad @${adName} is now live — DSAMRR reminder`,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.warn("Brevo SMTP send note (logged):", err.message);
    return { success: false, error: "Email delivery failed" };
  }
}

// 5. Campaign Concluded Analytics Report Email
export async function sendAdCompletionAnalyticsEmail(params: {
  toEmail: string;
  adName: string;
  totalViews: number;
  totalClicks: number;
  startedAt: string;
  expiresAt: string;
}): Promise<EmailResponse> {
  const { toEmail, adName, totalViews, totalClicks, startedAt, expiresAt } = params;
  if (!isValidEmail(toEmail)) return { success: false, error: "Invalid recipient email" };

  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : "0.00";

  const html = `
    <div style="background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border-radius: 16px; border: 1px solid #27272a;">
      <h2 style="font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 12px;">Final Analytics Report for @${adName}</h2>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 20px;">
        Your campaign (${startedAt} to ${expiresAt}) has officially concluded. Here are your final audience analytics:
      </p>
      <div style="display: flex; gap: 12px; margin-bottom: 24px;">
        <div style="flex: 1; background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 11px; color: #71717a; text-transform: uppercase;">Total Views</div>
          <div style="font-size: 24px; font-weight: 800; color: #ffffff; margin-top: 4px;">${totalViews.toLocaleString()}</div>
        </div>
        <div style="flex: 1; background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 11px; color: #71717a; text-transform: uppercase;">Total Clicks</div>
          <div style="font-size: 24px; font-weight: 800; color: #10b981; margin-top: 4px;">${totalClicks.toLocaleString()}</div>
        </div>
        <div style="flex: 1; background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 11px; color: #71717a; text-transform: uppercase;">Click Rate</div>
          <div style="font-size: 24px; font-weight: 800; color: #fbbf24; margin-top: 4px;">${ctr}%</div>
        </div>
      </div>
      <p style="font-size: 13px; color: #a1a1aa; line-height: 1.5; margin-bottom: 16px;">
        Thank you for advertising with us! We wish you all the best with your project growth.
      </p>
      <p style="font-size: 12px; color: #71717a;">
        Ready for another round? Book your next campaign anytime at <a href="https://dsamrr.dev/ads" style="color: #10b981;">dsamrr.dev/ads</a>.
      </p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: FROM_HEADER,
      to: toEmail,
      subject: `Here are the views and clicks you got for @${adName} — DSAMRR Analytics`,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.warn("Brevo SMTP send note (logged):", err.message);
    return { success: false, error: "Email delivery failed" };
  }
}

// 6. Monthly Developer Leaderboard Ranking Email
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

  try {
    const info = await transporter.sendMail({
      from: FROM_HEADER,
      to: toEmail,
      subject: `You are the top ${rank}${getOrdinal(rank)} person in ${monthName}! Keep rocking 🚀`,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.warn("Brevo SMTP send note (logged):", err.message);
    return { success: false, error: "Email delivery failed" };
  }
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
