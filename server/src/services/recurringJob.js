import cron from 'node-cron';
import { getRecurringTasks, createTaskInstance } from '../models/Task.js';
import { getRecurringEvents, createEventInstance } from '../models/Events.js';

// Skip scheduling during tests to avoid keeping Jest running (open handle)
if (process.env.NODE_ENV !== 'test') {
  // Run every 5 minutes instead of every minute to reduce load
  cron.schedule('*/5 * * * *', async () => {
    try {
      // Limit the number of recurring items we process at once
      const recurringTasks = await getRecurringTasks();
      for (const task of recurringTasks.slice(0, 10)) { // Process max 10 at a time
        // Only create instance if needed based on current date
        if (shouldCreateTaskInstance(task)) {
          await createTaskInstance(task);
        }
      }
      
      const recurringEvents = await getRecurringEvents();
      for (const event of recurringEvents.slice(0, 10)) { // Process max 10 at a time
        // Only create instance if needed based on current date
        if (shouldCreateEventInstance(event)) {
          await createEventInstance(event);
        }
      }
    } catch (error) {
      console.error('Error in recurring job service:', error);
    }
  });
}

// Helper function to determine if a task instance should be created
function shouldCreateTaskInstance(task) {
  if (!task.recurrence_pattern || task.recurrence_pattern === 'none') {
    return false;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Check if recurrence has ended
  if (task.recurrence_end_date) {
    const endDate = new Date(task.recurrence_end_date);
    if (today > endDate) {
      return false;
    }
  }

  // Check if we already created an instance today
  if (task.last_recurrence_date) {
    const lastRecurrence = new Date(task.last_recurrence_date);
    if (lastRecurrence.getTime() === today.getTime()) {
      return false;
    }
  }

  // Check recurrence pattern
  switch (task.recurrence_pattern) {
    case 'daily':
      return shouldCreateDailyInstance(task, today);
    case 'weekly':
      return shouldCreateWeeklyInstance(task, today);
    case 'monthly':
      return shouldCreateMonthlyInstance(task, today);
    case 'yearly':
      return shouldCreateYearlyInstance(task, today);
    default:
      return false;
  }
}

// Helper function to determine if an event instance should be created
function shouldCreateEventInstance(event) {
  if (!event.recurrence_pattern || event.recurrence_pattern === 'none') {
    return false;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Check if recurrence has ended
  if (event.recurrence_end_date) {
    const endDate = new Date(event.recurrence_end_date);
    if (today > endDate) {
      return false;
    }
  }

  // Check if we already created an instance today
  if (event.last_recurrence_date) {
    const lastRecurrence = new Date(event.last_recurrence_date);
    if (lastRecurrence.getTime() === today.getTime()) {
      return false;
    }
  }

  // Check recurrence pattern
  switch (event.recurrence_pattern) {
    case 'daily':
      return shouldCreateDailyInstance(event, today);
    case 'weekly':
      return shouldCreateWeeklyInstance(event, today);
    case 'monthly':
      return shouldCreateMonthlyInstance(event, today);
    case 'yearly':
      return shouldCreateYearlyInstance(event, today);
    default:
      return false;
  }
}

// Helper functions for different recurrence patterns
function shouldCreateDailyInstance(item, today) {
  if (!item.recurrence_interval || item.recurrence_interval <= 0) {
    return true; // Every day
  }
  
  // Check if enough days have passed since last recurrence
  if (item.last_recurrence_date) {
    const lastRecurrence = new Date(item.last_recurrence_date);
    const daysDiff = Math.floor((today - lastRecurrence) / (1000 * 60 * 60 * 24));
    return daysDiff >= item.recurrence_interval;
  }
  
  return true; // First time
}

function shouldCreateWeeklyInstance(item, today) {
  if (!item.recurrence_interval || item.recurrence_interval <= 0) {
    return true; // Every week
  }
  
  // Check if enough weeks have passed since last recurrence
  if (item.last_recurrence_date) {
    const lastRecurrence = new Date(item.last_recurrence_date);
    const weeksDiff = Math.floor((today - lastRecurrence) / (1000 * 60 * 60 * 24 * 7));
    return weeksDiff >= item.recurrence_interval;
  }
  
  return true; // First time
}

function shouldCreateMonthlyInstance(item, today) {
  if (!item.recurrence_interval || item.recurrence_interval <= 0) {
    return true; // Every month
  }
  
  // Check if enough months have passed since last recurrence
  if (item.last_recurrence_date) {
    const lastRecurrence = new Date(item.last_recurrence_date);
    const monthsDiff = (today.getFullYear() - lastRecurrence.getFullYear()) * 12 + 
                      (today.getMonth() - lastRecurrence.getMonth());
    return monthsDiff >= item.recurrence_interval;
  }
  
  return true; // First time
}

function shouldCreateYearlyInstance(item, today) {
  if (!item.recurrence_interval || item.recurrence_interval <= 0) {
    return true; // Every year
  }
  
  // Check if enough years have passed since last recurrence
  if (item.last_recurrence_date) {
    const lastRecurrence = new Date(item.last_recurrence_date);
    const yearsDiff = today.getFullYear() - lastRecurrence.getFullYear();
    return yearsDiff >= item.recurrence_interval;
  }
  
  return true; // First time
}