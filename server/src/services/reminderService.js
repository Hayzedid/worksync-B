// Smart Reminder Service for WorkSync
// Handles email notifications for tasks and events with 24h and 1h advance notice

import cron from 'node-cron';
import { pool } from '../config/database.js';
import emailService from './emailService.js';
import { sanitizeParams } from '../utils/sql.js';

class ReminderService {
  constructor() {
    this.activeReminders = new Map(); // Track sent reminders to prevent duplicates
    this.isRunning = false;
  }

  // Start the reminder service
  start() {
    if (this.isRunning) return;
    
    console.log('📧 Starting Smart Reminder Service...');
    
    // Check for reminders every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      await this.checkAndSendReminders();
    });
    
    this.isRunning = true;
    console.log('✅ Smart Reminder Service started');
  }

  // Check for tasks and events that need reminders
  async checkAndSendReminders() {
    try {
      console.log('🔍 Checking for upcoming deadlines...');
      
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);

      // Check tasks with deadlines
      await this.checkTaskDeadlines(now, in24Hours, in1Hour);
      
      // Check events
      await this.checkEventReminders(now, in24Hours, in1Hour);
      
      // Cleanup old reminder tracking
      this.cleanupOldReminders();
      
    } catch (error) {
      console.error('❌ Error checking reminders:', error);
    }
  }

  // Check task deadlines and send reminders
  async checkTaskDeadlines(now, in24Hours, in1Hour) {
    try {
      // Get tasks with due dates in the next 24 hours
      const [tasks] = await pool.execute(`
        SELECT t.*, u.email, u.firstName, u.lastName 
        FROM tasks t
        JOIN users u ON t.user_id = u.id
        WHERE t.due_date IS NOT NULL 
        AND t.due_date BETWEEN ? AND ?
        AND t.status != 'done'
        AND u.email IS NOT NULL
      `, sanitizeParams([now.toISOString(), in24Hours.toISOString()]));

      for (const task of tasks) {
        const dueDate = new Date(task.due_date);
        const timeUntilDue = dueDate.getTime() - now.getTime();
        const hoursUntilDue = Math.floor(timeUntilDue / (60 * 60 * 1000));

        // Send 24-hour reminder
        if (hoursUntilDue <= 24 && hoursUntilDue > 22) {
          await this.sendTaskReminder(task, '24-hour', dueDate);
        }
        
        // Send 1-hour reminder
        if (hoursUntilDue <= 1 && hoursUntilDue > 0) {
          await this.sendTaskReminder(task, '1-hour', dueDate);
        }
      }
    } catch (error) {
      console.error('❌ Error checking task deadlines:', error);
    }
  }

  // Check event reminders
  async checkEventReminders(now, in24Hours, in1Hour) {
    try {
      // Get events starting in the next 24 hours
      const [events] = await pool.execute(`
        SELECT e.*, u.email, u.firstName, u.lastName 
        FROM events e
        JOIN users u ON e.user_id = u.id
        WHERE e.start_date BETWEEN ? AND ?
        AND u.email IS NOT NULL
      `, sanitizeParams([now.toISOString(), in24Hours.toISOString()]));

      for (const event of events) {
        const startDate = new Date(event.start_date);
        const timeUntilStart = startDate.getTime() - now.getTime();
        const hoursUntilStart = Math.floor(timeUntilStart / (60 * 60 * 1000));

        // Send 24-hour reminder
        if (hoursUntilStart <= 24 && hoursUntilStart > 22) {
          await this.sendEventReminder(event, '24-hour', startDate);
        }
        
        // Send 1-hour reminder
        if (hoursUntilStart <= 1 && hoursUntilStart > 0) {
          await this.sendEventReminder(event, '1-hour', startDate);
        }
      }
    } catch (error) {
      console.error('❌ Error checking event reminders:', error);
    }
  }

  // Send task reminder email
  async sendTaskReminder(task, reminderType, dueDate) {
    const reminderKey = `task-${task.id}-${reminderType}`;
    
    // Check if we already sent this reminder
    if (this.activeReminders.has(reminderKey)) {
      return;
    }

    try {
      const userName = `${task.firstName || ''} ${task.lastName || ''}`.trim() || 'there';
      const dueDateFormatted = this.formatDate(dueDate);
      const timeText = reminderType === '24-hour' ? '24 hours' : '1 hour';
      
      const subject = `⏰ Task Reminder: "${task.title}" due in ${timeText}`;
      
      const html = this.generateTaskReminderHTML({
        userName,
        taskTitle: task.title,
        dueDate: dueDateFormatted,
        timeText,
        taskId: task.id
      });

      const text = this.generateTaskReminderText({
        userName,
        taskTitle: task.title,
        dueDate: dueDateFormatted,
        timeText,
        taskId: task.id
      });

      await emailService.sendEmail({
        to: task.email,
        subject,
        html,
        text
      });

      // Mark as sent
      this.activeReminders.set(reminderKey, Date.now());
      console.log(`📧 Sent ${reminderType} task reminder for "${task.title}" to ${task.email}`);
      
    } catch (error) {
      console.error(`❌ Error sending task reminder:`, error);
    }
  }

  // Send event reminder email
  async sendEventReminder(event, reminderType, startDate) {
    const reminderKey = `event-${event.id}-${reminderType}`;
    
    // Check if we already sent this reminder
    if (this.activeReminders.has(reminderKey)) {
      return;
    }

    try {
      const userName = `${event.firstName || ''} ${event.lastName || ''}`.trim() || 'there';
      const startDateFormatted = this.formatDate(startDate);
      const timeText = reminderType === '24-hour' ? '24 hours' : '1 hour';
      
      const subject = `📅 Event Reminder: "${event.title}" starts in ${timeText}`;
      
      const html = this.generateEventReminderHTML({
        userName,
        eventTitle: event.title,
        startDate: startDateFormatted,
        timeText,
        eventId: event.id,
        category: event.category
      });

      const text = this.generateEventReminderText({
        userName,
        eventTitle: event.title,
        startDate: startDateFormatted,
        timeText,
        eventId: event.id
      });

      await emailService.sendEmail({
        to: event.email,
        subject,
        html,
        text
      });

      // Mark as sent
      this.activeReminders.set(reminderKey, Date.now());
      console.log(`📧 Sent ${reminderType} event reminder for "${event.title}" to ${event.email}`);
      
    } catch (error) {
      console.error(`❌ Error sending event reminder:`, error);
    }
  }

  // Generate HTML template for task reminders
  generateTaskReminderHTML({ userName, taskTitle, dueDate, timeText, taskId }) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3100';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Reminder - WorkSync</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f6fffe;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-top: 20px;
            margin-bottom: 20px;
        }
        .header { 
            background: linear-gradient(135deg, #0FC2C0, #015958); 
            color: white; 
            padding: 30px; 
            text-align: center; 
        }
        .header h1 { 
            margin: 0; 
            font-size: 24px; 
            font-weight: 700;
        }
        .content { 
            padding: 30px; 
        }
        .urgent { 
            background: #fef2f2; 
            border-left: 4px solid #ef4444; 
            padding: 20px; 
            margin: 20px 0; 
            border-radius: 8px;
        }
        .task-details {
            background: #f6fffe;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid #0CABA8;
        }
        .button { 
            display: inline-block; 
            background: linear-gradient(135deg, #0FC2C0, #015958); 
            color: white; 
            padding: 14px 28px; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0;
            font-weight: 600;
        }
        .button:hover {
            opacity: 0.9;
        }
        .footer { 
            text-align: center; 
            padding: 20px; 
            color: #666; 
            font-size: 14px; 
            background: #f8fafc;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Task Reminder</h1>
        </div>
        
        <div class="content">
            <p>Hi ${userName}!</p>
            
            <div class="urgent">
                <h3 style="margin-top: 0; color: #dc2626;">Task Due Soon!</h3>
                <p style="margin-bottom: 0;">You have a task due in <strong>${timeText}</strong>.</p>
            </div>
            
            <div class="task-details">
                <h3 style="margin-top: 0; color: #015958;">Task Details</h3>
                <p><strong>Title:</strong> ${taskTitle}</p>
                <p><strong>Due Date:</strong> ${dueDate}</p>
                <p><strong>Time Remaining:</strong> ${timeText}</p>
            </div>
            
            <p>Don't let this task slip through the cracks! Take action now to stay on track.</p>
            
            <center>
                <a href="${frontendUrl}/tasks/${taskId}" class="button">
                    📋 View Task
                </a>
            </center>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
                💡 <strong>Tip:</strong> Set up a productive workspace and tackle your tasks one by one. You've got this!
            </p>
        </div>
        
        <div class="footer">
            <p><strong>WorkSync</strong> - Stay organized, stay productive</p>
            <p>Lagos, Nigeria | <a href="mailto:support@worksync.ng">support@worksync.ng</a></p>
        </div>
    </div>
</body>
</html>`;
  }

  // Generate text version for task reminders
  generateTaskReminderText({ userName, taskTitle, dueDate, timeText, taskId }) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3100';
    
    return `
⏰ Task Reminder - WorkSync

Hi ${userName}!

TASK DUE SOON!
You have a task due in ${timeText}.

Task Details:
• Title: ${taskTitle}
• Due Date: ${dueDate}
• Time Remaining: ${timeText}

Don't let this task slip through the cracks! Take action now to stay on track.

View Task: ${frontendUrl}/tasks/${taskId}

💡 Tip: Set up a productive workspace and tackle your tasks one by one. You've got this!

---
WorkSync - Stay organized, stay productive
Lagos, Nigeria | support@worksync.ng
`;
  }

  // Generate HTML template for event reminders
  generateEventReminderHTML({ userName, eventTitle, startDate, timeText, eventId, category }) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3100';
    const categoryEmoji = this.getCategoryEmoji(category);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event Reminder - WorkSync</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f6fffe;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-top: 20px;
            margin-bottom: 20px;
        }
        .header { 
            background: linear-gradient(135deg, #0FC2C0, #015958); 
            color: white; 
            padding: 30px; 
            text-align: center; 
        }
        .header h1 { 
            margin: 0; 
            font-size: 24px; 
            font-weight: 700;
        }
        .content { 
            padding: 30px; 
        }
        .upcoming { 
            background: #fef3c7; 
            border-left: 4px solid #f59e0b; 
            padding: 20px; 
            margin: 20px 0; 
            border-radius: 8px;
        }
        .event-details {
            background: #f6fffe;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid #0CABA8;
        }
        .button { 
            display: inline-block; 
            background: linear-gradient(135deg, #0FC2C0, #015958); 
            color: white; 
            padding: 14px 28px; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0;
            font-weight: 600;
        }
        .button:hover {
            opacity: 0.9;
        }
        .footer { 
            text-align: center; 
            padding: 20px; 
            color: #666; 
            font-size: 14px; 
            background: #f8fafc;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Event Reminder</h1>
        </div>
        
        <div class="content">
            <p>Hi ${userName}!</p>
            
            <div class="upcoming">
                <h3 style="margin-top: 0; color: #92400e;">Event Starting Soon!</h3>
                <p style="margin-bottom: 0;">You have an event starting in <strong>${timeText}</strong>.</p>
            </div>
            
            <div class="event-details">
                <h3 style="margin-top: 0; color: #015958;">Event Details</h3>
                <p><strong>Title:</strong> ${categoryEmoji} ${eventTitle}</p>
                <p><strong>Start Date:</strong> ${startDate}</p>
                <p><strong>Category:</strong> ${category}</p>
                <p><strong>Time Until Start:</strong> ${timeText}</p>
            </div>
            
            <p>Don't forget about your upcoming event! Make sure you're prepared and ready to go.</p>
            
            <center>
                <a href="${frontendUrl}/events/${eventId}" class="button">
                    📅 View Event
                </a>
            </center>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
                💡 <strong>Tip:</strong> Arrive a few minutes early and make sure you have everything you need!
            </p>
        </div>
        
        <div class="footer">
            <p><strong>WorkSync</strong> - Never miss an important moment</p>
            <p>Lagos, Nigeria | <a href="mailto:support@worksync.ng">support@worksync.ng</a></p>
        </div>
    </div>
</body>
</html>`;
  }

  // Generate text version for event reminders
  generateEventReminderText({ userName, eventTitle, startDate, timeText, eventId }) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3100';
    
    return `
📅 Event Reminder - WorkSync

Hi ${userName}!

EVENT STARTING SOON!
You have an event starting in ${timeText}.

Event Details:
• Title: ${eventTitle}
• Start Date: ${startDate}
• Time Until Start: ${timeText}

Don't forget about your upcoming event! Make sure you're prepared and ready to go.

View Event: ${frontendUrl}/events/${eventId}

💡 Tip: Arrive a few minutes early and make sure you have everything you need!

---
WorkSync - Never miss an important moment
Lagos, Nigeria | support@worksync.ng
`;
  }

  // Get emoji for event category
  getCategoryEmoji(category) {
    const emojis = {
      meeting: '👥',
      birthday: '🎂',
      outing: '🌟',
      reminder: '⏰',
      appointment: '📋',
      holiday: '🏖️',
      task: '✅'
    };
    return emojis[category] || '📅';
  }

  // Format date for display
  formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(date);
  }

  // Clean up old reminders from memory (older than 48 hours)
  cleanupOldReminders() {
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    
    for (const [key, timestamp] of this.activeReminders.entries()) {
      if (timestamp < fortyEightHoursAgo) {
        this.activeReminders.delete(key);
      }
    }
  }

  // Stop the reminder service
  stop() {
    this.isRunning = false;
    console.log('🛑 Smart Reminder Service stopped');
  }

  // Manual trigger for testing
  async testReminders() {
    console.log('🧪 Testing reminder system...');
    await this.checkAndSendReminders();
    console.log('✅ Test completed');
  }
}

// Create singleton instance
const reminderService = new ReminderService();
export default reminderService;