// =====================================================
// WorkSync Phase 3 - MySQL Validation Utilities
// Input validation and sanitization helpers
// Compatible with existing MySQL infrastructure
// =====================================================

/**
 * Sanitize input to prevent XSS attacks
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove basic HTML tags
    .trim(); // Remove whitespace
};

/**
 * Validate integer ID
 */
export const validateId = (id) => {
  const numId = parseInt(id);
  return !isNaN(numId) && numId > 0;
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate date string
 */
export const validateDate = (dateString) => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * Validate time duration in seconds
 */
export const validateDuration = (seconds) => {
  const num = parseInt(seconds);
  return !isNaN(num) && num >= 0;
};

/**
 * Validate story points
 */
export const validateStoryPoints = (points) => {
  if (points === null || points === undefined) return true;
  const num = parseInt(points);
  return !isNaN(num) && num >= 0 && num <= 100;
};

/**
 * Validate priority level
 */
export const validatePriority = (priority) => {
  const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  return validPriorities.includes(priority);
};

/**
 * Validate status
 */
export const validateStatus = (status) => {
  const validStatuses = ['ACTIVE', 'ARCHIVED', 'DELETED'];
  return validStatuses.includes(status);
};

/**
 * Validate JSON data
 */
export const validateJSON = (jsonString) => {
  try {
    JSON.parse(jsonString);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate hourly rate
 */
export const validateHourlyRate = (rate) => {
  if (rate === null || rate === undefined) return true;
  const num = parseFloat(rate);
  return !isNaN(num) && num >= 0 && num <= 1000;
};

/**
 * Sanitize HTML content (basic)
 */
export const sanitizeHTML = (html) => {
  if (typeof html !== 'string') return html;
  
  // Basic HTML sanitization - remove script tags and dangerous attributes
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
};

/**
 * Validate and sanitize card title
 */
export const validateCardTitle = (title) => {
  if (!title || typeof title !== 'string') return false;
  const sanitized = sanitizeInput(title);
  return sanitized.length >= 1 && sanitized.length <= 500;
};

/**
 * Validate board name
 */
export const validateBoardName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const sanitized = sanitizeInput(name);
  return sanitized.length >= 1 && sanitized.length <= 255;
};

/**
 * Validate color hex code
 */
export const validateColor = (color) => {
  if (!color) return true; // Optional
  const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return colorRegex.test(color);
};

/**
 * Validate tags array
 */
export const validateTags = (tags) => {
  if (!Array.isArray(tags)) return false;
  return tags.every(tag => 
    typeof tag === 'string' && 
    tag.length >= 1 && 
    tag.length <= 50
  );
};

/**
 * Validate time entry description
 */
export const validateTimeDescription = (description) => {
  if (!description || typeof description !== 'string') return false;
  const sanitized = sanitizeInput(description);
  return sanitized.length >= 1 && sanitized.length <= 1000;
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (page, limit) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 50;
  
  return {
    page: Math.max(1, pageNum),
    limit: Math.min(100, Math.max(1, limitNum))
  };
};

/**
 * Validate time range
 */
export const validateTimeRange = (startTime, endTime) => {
  if (!startTime || !endTime) return false;
  
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  return !isNaN(start.getTime()) && 
         !isNaN(end.getTime()) && 
         end > start;
};

export default {
  sanitizeInput,
  validateId,
  validateEmail,
  validateDate,
  validateDuration,
  validateStoryPoints,
  validatePriority,
  validateStatus,
  validateJSON,
  validateHourlyRate,
  sanitizeHTML,
  validateCardTitle,
  validateBoardName,
  validateColor,
  validateTags,
  validateTimeDescription,
  validatePagination,
  validateTimeRange
};
