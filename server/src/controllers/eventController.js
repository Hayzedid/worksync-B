// controllers/eventController.js
import * as Event from '../models/Event.js'

export const create = async (req, res) => {
  const { title, start, end } = req.body
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

export const getAll = async (req, res) => {
  try {
    const events = await Event.getAllEventsByUser(req.user.id)
    res.json({ success: true, events })
  } catch (err) {
     next(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

export const getById = async (req, res) => {
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
  const { title, start, end } = req.body
  try {
    const event = await Event.updateEvent(req.params.id, title, start, end)
    res.json({ success: true, message: 'Event updated successfully', event })
  } catch (err) {
     next(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

export const remove = async (req, res) => {
  try {
    await Event.deleteEvent(req.params.id)
    res.json({ success: true, message: 'Event deleted successfully' })
  } catch (err) {
     next(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}
