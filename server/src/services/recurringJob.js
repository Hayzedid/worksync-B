import cron from 'node-cron';
import { getRecurringTasks, createTaskInstance } from '../models/Task.js';
import { getRecurringEvents, createEventInstance } from '../models/Events.js';

// Run every minute (adjust as needed)
cron.schedule('* * * * *', async () => {
  const recurringTasks = await getRecurringTasks();
  for (const task of recurringTasks) {
    // TODO: Add logic to check if a new instance should be created
    await createTaskInstance(task);
  }
  const recurringEvents = await getRecurringEvents();
  for (const event of recurringEvents) {
    // TODO: Add logic to check if a new instance should be created
    await createEventInstance(event);
  }
}); 