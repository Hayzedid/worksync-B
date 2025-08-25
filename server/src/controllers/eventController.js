// Validation middleware (currently no-op, add logic as needed)
export const validateEvent = (req, res, next) => next();
export const validateRequest = (req, res, next) => next();

// controllers/eventController.js
import * as Event from '../models/Events.js'

function toMySQLDateTime(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  // format YYYY-MM-DD HH:mm:ss (use UTC to be consistent)
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function shapeEvent(row) {
  if (!row) return row;
  return {
    id: row.id,
    title: row.title,
    start: row.start_date ?? row.start ?? null,
    end: row.end_date ?? row.end ?? null,
    all_day: typeof row.all_day === 'number' ? row.all_day : (row.all_day ? 1 : 0),
    allDay: !!row.all_day,
    location: row.location ?? null,
    description: row.description ?? null,
    category: row.category ?? null,
    workspace_id: row.workspace_id ?? null,
    project_id: row.project_id ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

export const create = async (req, res) => {
  const { title, start, end, all_day, location, description, workspace_id, project_id, category } = req.body || {};
  const ownerId = req.user.id;

  if (!title || !start || !end) {
    return res.status(400).json({ message: 'Missing required fields: title, start, end' });
  }

  // Coerce all_day to 0/1 (default 0)
  const allDay = all_day === 1 || all_day === '1' || all_day === true ? 1 : 0;

  // Convert/validate dates
  let startDT = toMySQLDateTime(start);
  let endDT = toMySQLDateTime(end);
  if (!startDT || !endDT) {
    return res.status(400).json({ message: 'Invalid date format. Use ISO-8601 or YYYY-MM-DD HH:mm:ss' });
  }

  // all-day normalization to day boundaries (UTC)
  if (allDay === 1) {
    const s = new Date(start);
    const e = new Date(end);
    const startDay = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), 0, 0, 0));
    const endDay = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate(), 23, 59, 59));
    startDT = toMySQLDateTime(startDay.toISOString());
    endDT = toMySQLDateTime(endDay.toISOString());
  }

  // Ensure end >= start
  if (new Date(endDT) < new Date(startDT)) {
    return res.status(400).json({ message: 'End must be greater than or equal to start' });
  }

  // Normalize category: trim to 50 chars; null if missing or empty
  const cat = typeof category === 'string' ? category.trim().slice(0, 50) : null;
  try {
    const event = await Event.createEvent({
      title,
      start_date: startDT,
      end_date: endDT,
      owner_id: ownerId,
      all_day: allDay,
      location: location ?? null,
      description: description ?? null,
      workspace_id: workspace_id ?? null,
      project_id: project_id ?? null,
      category: cat,
    });
    return res.status(201).json({ success: true, message: 'Event created successfully', event: shapeEvent(event) });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

export const getAll = async (req, res, next) => {
  try {
    const events = await Event.getAllEventsByUser(req.user.id)
    res.json({ success: true, events: events.map(shapeEvent) })
  } catch (err) {
     next(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

export const getById = async (req, res, next) => {
  try {
    const event = await Event.getEventById(req.params.id)
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' })
    res.json({ success: true, event: shapeEvent(event) })
  } catch (err) {
     next(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

export const update = async (req, res) => {
  const id = req.params.id;
  const owner_id = req.user?.id;
  const {
    title,
    start,
    end,
    all_day,
    location,
    description,
    workspace_id,
    project_id,
    category,
  } = req.body || {};

  if (!id || !owner_id) {
    return res.status(400).json({ message: 'Missing required identifiers' });
  }

  // Build partial updates
  const patch = {};
  if (typeof title !== 'undefined') patch.title = title;
  if (typeof location !== 'undefined') patch.location = location;
  if (typeof description !== 'undefined') patch.description = description;
  if (typeof workspace_id !== 'undefined') patch.workspace_id = workspace_id;
  if (typeof project_id !== 'undefined') patch.project_id = project_id;
  if (typeof category !== 'undefined') {
    const catUpd = typeof category === 'string' ? category.trim().slice(0, 50) : null;
    patch.category = catUpd;
  }
  if (typeof all_day !== 'undefined') patch.all_day = (all_day === 1 || all_day === '1' || all_day === true) ? 1 : 0;

  // Handle dates
  let startDT = typeof start !== 'undefined' ? toMySQLDateTime(start) : undefined;
  let endDT = typeof end !== 'undefined' ? toMySQLDateTime(end) : undefined;
  if (typeof start !== 'undefined' && !startDT) {
    return res.status(400).json({ message: 'Invalid start date format' });
  }
  if (typeof end !== 'undefined' && !endDT) {
    return res.status(400).json({ message: 'Invalid end date format' });
  }

  // If all_day provided, normalize any provided start/end to boundaries
  if (typeof patch.all_day !== 'undefined' && patch.all_day === 1) {
    if (startDT) {
      const s = new Date(start);
      const startDay = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), 0, 0, 0));
      startDT = toMySQLDateTime(startDay.toISOString());
    }
    if (endDT) {
      const e = new Date(end);
      const endDay = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate(), 23, 59, 59));
      endDT = toMySQLDateTime(endDay.toISOString());
    }
  }
  if (startDT) patch.start_date = startDT;
  if (endDT) patch.end_date = endDT;

  // If both provided, ensure end >= start
  if (patch.start_date && patch.end_date && new Date(patch.end_date) < new Date(patch.start_date)) {
    return res.status(400).json({ message: 'End must be greater than or equal to start' });
  }

  try {
    const event = await Event.updateEventPartial(id, owner_id, patch);
    return res.json({ success: true, message: 'Event updated successfully', event: shapeEvent(event) });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
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
