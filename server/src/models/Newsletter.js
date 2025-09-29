import { pool } from '../config/database.js';
import emailService from '../services/emailService.js';

class Newsletter {
  // Subscribe a new email to the newsletter
  static async subscribe(email, options = {}) {
    const {
      firstName = null,
      lastName = null,
      source = 'website',
      ipAddress = null,
      userAgent = null,
      preferences = {}
    } = options;

    try {
      const [result] = await pool.execute(
        `INSERT INTO newsletter_subscribers 
         (email, first_name, last_name, source, ip_address, user_agent, preferences) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [email, firstName, lastName, source, ipAddress, userAgent, JSON.stringify(preferences)]
      );

      return {
        id: result.insertId,
        email,
        firstName,
        lastName,
        source,
        subscribedAt: new Date()
      };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Email already subscribed');
      }
      throw error;
    }
  }

  // Check if email is already subscribed
  static async isSubscribed(email) {
    try {
      const [rows] = await pool.execute(
        'SELECT id, status FROM newsletter_subscribers WHERE email = ?',
        [email]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw error;
    }
  }

  // Unsubscribe an email
  static async unsubscribe(email) {
    try {
      const [result] = await pool.execute(
        `UPDATE newsletter_subscribers 
         SET status = 'unsubscribed', unsubscribed_at = NOW() 
         WHERE email = ? AND status = 'active'`,
        [email]
      );

      if (result.affectedRows === 0) {
        throw new Error('Email not found or already unsubscribed');
      }

      return { success: true, message: 'Successfully unsubscribed' };
    } catch (error) {
      throw error;
    }
  }

  // Get all active subscribers
  static async getActiveSubscribers(limit = 100, offset = 0) {
    try {
      const [rows] = await pool.execute(
        `SELECT id, email, first_name, last_name, source, subscribed_at, email_count 
         FROM newsletter_subscribers 
         WHERE status = 'active' 
         ORDER BY subscribed_at DESC 
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get subscriber count
  static async getSubscriberCount() {
    try {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) as count FROM newsletter_subscribers WHERE status = "active"'
      );
      return rows[0].count;
    } catch (error) {
      throw error;
    }
  }

  // Get subscriber by email
  static async getSubscriberByEmail(email) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM newsletter_subscribers WHERE email = ?',
        [email]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw error;
    }
  }

  // Update subscriber preferences
  static async updatePreferences(email, preferences) {
    try {
      const [result] = await pool.execute(
        'UPDATE newsletter_subscribers SET preferences = ? WHERE email = ?',
        [JSON.stringify(preferences), email]
      );

      if (result.affectedRows === 0) {
        throw new Error('Subscriber not found');
      }

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  // Create a new newsletter campaign
  static async createCampaign(campaignData) {
    const {
      name,
      subject,
      content,
      templateType = 'newsletter',
      scheduledAt = null,
      createdBy = null
    } = campaignData;

    try {
      const [result] = await pool.execute(
        `INSERT INTO newsletter_campaigns 
         (name, subject, content, template_type, scheduled_at, created_by) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, subject, content, templateType, scheduledAt, createdBy]
      );

      return {
        id: result.insertId,
        name,
        subject,
        content,
        templateType,
        scheduledAt,
        status: 'draft'
      };
    } catch (error) {
      throw error;
    }
  }

  // Get email template by type
  static async getTemplate(templateType) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM newsletter_templates WHERE template_type = ? AND is_active = TRUE LIMIT 1',
        [templateType]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw error;
    }
  }

  // Send welcome email to new subscriber
  static async sendWelcomeEmail(email, subscriberData = {}) {
    try {
      // Send welcome email using email service
      const result = await emailService.sendWelcomeEmail(email, subscriberData);

      // Update subscriber's email count
      await pool.execute(
        'UPDATE newsletter_subscribers SET email_count = email_count + 1, last_email_sent = NOW() WHERE email = ?',
        [email]
      );

      console.log(`Welcome email sent to: ${email}`);
      console.log(`Message ID: ${result.messageId}`);
      
      return {
        success: true,
        messageId: result.messageId,
        subscriber: subscriberData
      };
    } catch (error) {
      console.error('Welcome email failed:', error);
      throw error;
    }
  }

  // Get newsletter statistics
  static async getStats() {
    try {
      const [subscriberStats] = await pool.execute(
        `SELECT 
           COUNT(*) as total_subscribers,
           SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_subscribers,
           SUM(CASE WHEN status = 'unsubscribed' THEN 1 ELSE 0 END) as unsubscribed_count,
           SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced_count,
           SUM(CASE WHEN DATE(subscribed_at) = CURDATE() THEN 1 ELSE 0 END) as today_subscriptions
         FROM newsletter_subscribers`
      );

      const [campaignStats] = await pool.execute(
        `SELECT 
           COUNT(*) as total_campaigns,
           SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_campaigns,
           SUM(recipient_count) as total_emails_sent,
           SUM(open_count) as total_opens,
           SUM(click_count) as total_clicks
         FROM newsletter_campaigns`
      );

      return {
        subscribers: subscriberStats[0],
        campaigns: campaignStats[0]
      };
    } catch (error) {
      throw error;
    }
  }
}

export default Newsletter;
