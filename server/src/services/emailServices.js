export async function sendEmail({ to, subject, text }) {
  // Dummy implementation for development
  console.log(`[EmailService] Would send email to: ${to}, subject: ${subject}`);
  if (text) console.log(`[EmailService] Body:\n${text}`);
  // In production, integrate with nodemailer, SendGrid, etc.
  return true;
}