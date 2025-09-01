import sanitizeHtml from 'sanitize-html';

/**
 * Validation utilities for Phase 3
 */

// UUID validation
export const validateUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Input sanitization
export const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') {
    return input;
  }
  
  return sanitizeHtml(input, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    allowedAttributes: {
      'a': ['href']
    },
    allowedIframeHostnames: []
  });
};

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password strength validation
export const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  return { valid: true, message: 'Password is valid' };
};

// Date validation
export const validateDate = (dateString) => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

// Kanban card priority validation
export const validateCardPriority = (priority) => {
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  return validPriorities.includes(priority);
};

// Project status validation
export const validateProjectStatus = (status) => {
  const validStatuses = ['planning', 'active', 'on_hold', 'completed', 'cancelled'];
  return validStatuses.includes(status);
};

// Time zone validation
export const validateTimezone = (timezone) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (e) {
    return false;
  }
};

// Hex color validation
export const validateHexColor = (color) => {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
};

// File type validation
export const validateFileType = (filename, allowedTypes) => {
  const extension = filename.split('.').pop().toLowerCase();
  return allowedTypes.includes(extension);
};

// File size validation (in bytes)
export const validateFileSize = (size, maxSize) => {
  return size <= maxSize;
};

// Pagination validation
export const validatePagination = (page, limit) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  
  return {
    page: Math.max(1, pageNum),
    limit: Math.min(100, Math.max(1, limitNum)) // Max 100 items per page
  };
};

// Hourly rate validation
export const validateHourlyRate = (rate) => {
  const rateNum = parseFloat(rate);
  return !isNaN(rateNum) && rateNum >= 0 && rateNum <= 10000;
};

// Duration validation (in seconds)
export const validateDuration = (duration) => {
  const durationNum = parseInt(duration);
  return !isNaN(durationNum) && durationNum >= 0 && durationNum <= 86400; // Max 24 hours
};

// Percentage validation (0-100)
export const validatePercentage = (percentage) => {
  const percentNum = parseInt(percentage);
  return !isNaN(percentNum) && percentNum >= 0 && percentNum <= 100;
};

// Array validation
export const validateArray = (arr, maxLength = 100) => {
  return Array.isArray(arr) && arr.length <= maxLength;
};

// JSON validation
export const validateJSON = (jsonString) => {
  try {
    JSON.parse(jsonString);
    return true;
  } catch (e) {
    return false;
  }
};

// Workspace role validation
export const validateWorkspaceRole = (role) => {
  const validRoles = ['owner', 'admin', 'member', 'viewer'];
  return validRoles.includes(role);
};

// Milestone status validation
export const validateMilestoneStatus = (status) => {
  const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
  return validStatuses.includes(status);
};

// Deliverable type validation
export const validateDeliverableType = (type) => {
  const validTypes = ['document', 'code', 'design', 'review', 'other'];
  return validTypes.includes(type);
};

// Skill validation (for team members)
export const validateSkills = (skills) => {
  if (!Array.isArray(skills)) return false;
  if (skills.length > 20) return false; // Max 20 skills
  
  return skills.every(skill => 
    typeof skill === 'string' && 
    skill.length <= 50 && 
    skill.trim().length > 0
  );
};

// Capacity validation (hours per week)
export const validateCapacity = (capacity) => {
  const capacityNum = parseFloat(capacity);
  return !isNaN(capacityNum) && capacityNum >= 0 && capacityNum <= 168; // Max 168 hours/week
};

// WIP limit validation
export const validateWipLimit = (limit) => {
  if (limit === null || limit === undefined) return true; // WIP limit is optional
  const limitNum = parseInt(limit);
  return !isNaN(limitNum) && limitNum > 0 && limitNum <= 100;
};

// Position validation (for ordering)
export const validatePosition = (position) => {
  const positionNum = parseInt(position);
  return !isNaN(positionNum) && positionNum >= 0;
};

// Tag validation
export const validateTag = (tag) => {
  return typeof tag === 'string' && 
         tag.length <= 50 && 
         tag.trim().length > 0 &&
         /^[a-zA-Z0-9\s\-_]+$/.test(tag); // Alphanumeric, spaces, hyphens, underscores only
};

// Label validation (for cards)
export const validateLabel = (label) => {
  if (typeof label !== 'object') return false;
  
  return label.name && 
         typeof label.name === 'string' && 
         label.name.length <= 30 &&
         (!label.color || validateHexColor(label.color));
};

// Dependency validation (array of UUIDs)
export const validateDependencies = (dependencies) => {
  if (!Array.isArray(dependencies)) return false;
  if (dependencies.length > 10) return false; // Max 10 dependencies
  
  return dependencies.every(dep => validateUUID(dep));
};

// Search query validation
export const validateSearchQuery = (query) => {
  return typeof query === 'string' && 
         query.trim().length >= 2 && 
         query.length <= 100;
};

// Sort field validation
export const validateSortField = (field, allowedFields) => {
  return allowedFields.includes(field);
};

// Sort direction validation
export const validateSortDirection = (direction) => {
  return ['asc', 'desc'].includes(direction.toLowerCase());
};

// Bulk operation validation
export const validateBulkOperation = (items, maxItems = 100) => {
  if (!Array.isArray(items)) return false;
  if (items.length === 0 || items.length > maxItems) return false;
  
  return items.every(item => 
    typeof item === 'object' && 
    item.id && 
    validateUUID(item.id)
  );
};

// URL validation
export const validateURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

// Phone number validation (basic)
export const validatePhoneNumber = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
  return phoneRegex.test(phone);
};

// Currency validation
export const validateCurrency = (amount) => {
  const amountNum = parseFloat(amount);
  return !isNaN(amountNum) && amountNum >= 0 && amountNum <= 9999999.99;
};

// Export all validators as a single object for easy import
export const validators = {
  validateUUID,
  sanitizeInput,
  validateEmail,
  validatePassword,
  validateDate,
  validateCardPriority,
  validateProjectStatus,
  validateTimezone,
  validateHexColor,
  validateFileType,
  validateFileSize,
  validatePagination,
  validateHourlyRate,
  validateDuration,
  validatePercentage,
  validateArray,
  validateJSON,
  validateWorkspaceRole,
  validateMilestoneStatus,
  validateDeliverableType,
  validateSkills,
  validateCapacity,
  validateWipLimit,
  validatePosition,
  validateTag,
  validateLabel,
  validateDependencies,
  validateSearchQuery,
  validateSortField,
  validateSortDirection,
  validateBulkOperation,
  validateURL,
  validatePhoneNumber,
  validateCurrency
};

export default validators;
