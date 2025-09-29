-- =====================================================
-- Newsletter Subscriptions Migration
-- Adds newsletter functionality to WorkSync
-- =====================================================

-- Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    source VARCHAR(50) DEFAULT 'website',
    status ENUM('active', 'unsubscribed', 'bounced') DEFAULT 'active',
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at TIMESTAMP NULL,
    last_email_sent TIMESTAMP NULL,
    email_count INT DEFAULT 0,
    preferences JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_newsletter_email (email),
    INDEX idx_newsletter_status (status),
    INDEX idx_newsletter_subscribed_at (subscribed_at),
    INDEX idx_newsletter_source (source)
);

-- Newsletter Campaigns Table (for future email campaigns)
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    template_type ENUM('welcome', 'update', 'promotional', 'newsletter') DEFAULT 'newsletter',
    status ENUM('draft', 'scheduled', 'sending', 'sent', 'cancelled') DEFAULT 'draft',
    scheduled_at TIMESTAMP NULL,
    sent_at TIMESTAMP NULL,
    recipient_count INT DEFAULT 0,
    open_count INT DEFAULT 0,
    click_count INT DEFAULT 0,
    unsubscribe_count INT DEFAULT 0,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_campaigns_status (status),
    INDEX idx_campaigns_scheduled_at (scheduled_at),
    INDEX idx_campaigns_template_type (template_type)
);

-- Newsletter Campaign Recipients (track who received which campaigns)
CREATE TABLE IF NOT EXISTS newsletter_campaign_recipients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    campaign_id INT NOT NULL,
    subscriber_id INT NOT NULL,
    status ENUM('sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed') DEFAULT 'sent',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP NULL,
    opened_at TIMESTAMP NULL,
    clicked_at TIMESTAMP NULL,
    bounced_at TIMESTAMP NULL,
    unsubscribed_at TIMESTAMP NULL,
    
    FOREIGN KEY (campaign_id) REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (subscriber_id) REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_campaign_subscriber (campaign_id, subscriber_id),
    INDEX idx_recipients_campaign (campaign_id),
    INDEX idx_recipients_subscriber (subscriber_id),
    INDEX idx_recipients_status (status)
);

-- Newsletter Email Templates
CREATE TABLE IF NOT EXISTS newsletter_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    template_type ENUM('welcome', 'update', 'promotional', 'newsletter') NOT NULL,
    subject_template VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_templates_type (template_type),
    INDEX idx_templates_active (is_active)
);

-- Insert default welcome email template
INSERT INTO newsletter_templates (name, template_type, subject_template, html_content, text_content, is_active) VALUES
(
    'Welcome Email Template',
    'welcome',
    'Welcome to WorkSync Newsletter!',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to WorkSync</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0FC2C0, #015958); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #0FC2C0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to WorkSync!</h1>
            <p>Your productivity journey starts here</p>
        </div>
        <div class="content">
            <h2>Thank you for subscribing!</h2>
            <p>We''re excited to have you join the WorkSync community. You''ll now receive:</p>
            <ul>
                <li>📈 Latest productivity tips and tricks</li>
                <li>🚀 New feature announcements</li>
                <li>💡 Best practices for team collaboration</li>
                <li>🎯 Exclusive updates and insights</li>
            </ul>
            <p>Ready to get started? Explore WorkSync and transform your workflow today!</p>
            <a href="https://worksync.ng" class="button">Get Started with WorkSync</a>
            <p>If you have any questions, feel free to reach out to our support team.</p>
        </div>
        <div class="footer">
            <p>WorkSync - All-in-One Productivity Platform</p>
            <p>Lagos, Nigeria | support@worksync.ng</p>
            <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{preferences_url}}">Update Preferences</a></p>
        </div>
    </div>
</body>
</html>',
    'Welcome to WorkSync!

Thank you for subscribing to our newsletter!

We''re excited to have you join the WorkSync community. You''ll now receive:
- Latest productivity tips and tricks
- New feature announcements  
- Best practices for team collaboration
- Exclusive updates and insights

Ready to get started? Visit https://worksync.ng to explore WorkSync and transform your workflow today!

If you have any questions, feel free to reach out to our support team.

Best regards,
The WorkSync Team

WorkSync - All-in-One Productivity Platform
Lagos, Nigeria | support@worksync.ng

Unsubscribe: {{unsubscribe_url}}
Update Preferences: {{preferences_url}}',
    TRUE
);

-- Create indexes for better performance
CREATE INDEX idx_newsletter_subscribers_email_status ON newsletter_subscribers(email, status);
CREATE INDEX idx_newsletter_campaigns_status_scheduled ON newsletter_campaigns(status, scheduled_at);
CREATE INDEX idx_newsletter_recipients_campaign_status ON newsletter_campaign_recipients(campaign_id, status);
