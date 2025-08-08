// socket/socketEvents.js

export function registerSocketEvents(socket, io) {
  // Example: Real-time note creation
  socket.on('note:create', (noteData) => {
    console.log('📝 Note created:', noteData);

    // Broadcast the new note to all connected clients
    io.emit('note:created', noteData);
  });

  // Example: Real-time task update
  socket.on('task:update', (taskData) => {
    console.log('✅ Task updated:', taskData);

    // Broadcast the task update
    io.emit('task:updated', taskData);
  });

  // You can add more events here (e.g., workspace events)
  socket.on('workspace:memberAdded', (data) => {
    console.log('👥 Member added to workspace:', data);
    io.emit('workspace:memberAdded', data);
  });

  // Handle other workspace actions
  socket.on('workspace:taskAssigned', (data) => {
    console.log('📌 Task assigned in workspace:', data);
    io.emit('workspace:taskAssigned', data);
  });
}

