import cron from 'node-cron';
import { getRecurringTasks, createTaskInstance } from '../models/Task.js';
import { getRecurringEvents, createEventInstance } from '../models/Events.js';

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

// Helper function to determine if a task instance should be created
function shouldCreateTaskInstance(task) {
  // TODO: Implement proper logic based on recurrence pattern and current date
  // For now, we'll just return true to maintain existing behavior
  return true;
}

// Helper function to determine if an event instance should be created
function shouldCreateEventInstance(event) {
  // TODO: Implement proper logic based on recurrence pattern and current date
  // For now, we'll just return true to maintain existing behavior
  return true;
}