// controllers/eventController.js
import * as Event from '../models/Events.js'

export const create = async (req, res) => {
  const { title, start, end } = req.body
   console.log('req.body:', req.body);            // ✅ Log body
  console.log('req.user:', req.user); 
  const ownerId = req.user.id

  if (!title || !start || !end) {
    return res.status(400).json({ success: false, message: 'Missing required fields' })
  }

  try {
    const event = await Event.createEvent(title, start, end, ownerId)
    res.status(201).json({ success: true, message: 'Event created successfully', event })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

export const getAll = async (req, res, next) => {
  try {
    const events = await Event.getAllEventsByUser(req.user.id)
    res.json({ success: true, events })
  } catch (err) {
     next(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

export const getById = async (req, res, next) => {
  try {
    const event = await Event.getEventById(req.params.id)
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' })
    res.json({ success: true, event })
  } catch (err) {
     next(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

export const update = async (req, res) => {
  const { title, start_date, end_date } = req.body;
  const id = req.params.id;
  const owner_id = req.user?.id;

  // Log all values before update
  console.log("Received update data:", { id, title, start_date, end_date, owner_id });

  if (!id || !owner_id) {
    return res.status(400).json({ success: false, message: 'Missing required identifiers' });
  }

  try {
    const event = await Event.updateEvent(id, title ?? null, start_date ?? null, end_date ?? null, owner_id);
    res.json({ success: true, message: 'Event updated successfully', event });
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};


// export const update = async (req, res, next) => {
//   // const { title, start, end } = req.body
//    const { title ,start_date ,end_date, } = req.body;
//    const owner_id = req.user?.id;
//    const id = req.params.id;

//   if (!title || !start_date || !end_date || !owner_id || !id) {
//   return res.status(400).json({ success: false, message: 'No fields provided for update' });
// }

//   try {
//     console.log('updateEvent params:', { title, start_date, end_date, owner_id, id });

//     const event = await Event.updateEvent(id, title, start_date, end_date)

//     res.json({ success: true, message: 'Event updated successfully', event })
//   } catch (err) {
//      next(err);
//      console.log('Error updating event:', err);
//     res.status(500).json({ success: false, message: 'Server error', error: err.message })
//   }
// }

export const remove = async (req, res, next) => {
  try {
    await Event.deleteEvent(req.params.id)
    res.json({ success: true, message: 'Event deleted successfully' })
  } catch (err) {
     next(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}
