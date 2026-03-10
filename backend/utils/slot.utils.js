/**
 * Slot Generation Utility
 * 
 * Generates time slots based on doctor's working hours, breaks, and slot duration.
 * Excludes past slots for today, and marks booked slots as unavailable.
 */

/**
 * Convert "HH:MM" time string to total minutes from midnight
 * @param {string} timeStr - "HH:MM" format
 * @returns {number} minutes from midnight
 */
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes from midnight back to "HH:MM" string
 * @param {number} minutes - minutes from midnight
 * @returns {string} "HH:MM" format
 */
const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

/**
 * Check if a time range overlaps with any break period
 * @param {number} slotStart - slot start in minutes
 * @param {number} slotEnd - slot end in minutes
 * @param {Array} breaks - array of {startTime, endTime} break objects
 * @returns {boolean}
 */
const overlapsWithBreak = (slotStart, slotEnd, breaks) => {
  return breaks.some((brk) => {
    const breakStart = timeToMinutes(brk.startTime);
    const breakEnd = timeToMinutes(brk.endTime);
    // Slot overlaps with break if they intersect
    return slotStart < breakEnd && slotEnd > breakStart;
  });
};

/**
 * Get current time in minutes (for filtering past slots on today's date)
 * @returns {number} current time in minutes
 */
const getCurrentTimeInMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

/**
 * Check if a given date string is today
 * @param {string} dateStr - "YYYY-MM-DD"
 * @returns {boolean}
 */
const isToday = (dateStr) => {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
};

/**
 * Main slot generation function
 * 
 * @param {Object} doctor - Doctor document with workingHours, breaks, slotDuration
 * @param {string} date - "YYYY-MM-DD" format
 * @param {Array} bookedSlots - Array of booked slotStart strings ["HH:MM", ...]
 * @returns {Array} Array of slot objects
 */
const generateSlots = (doctor, date, bookedSlots = []) => {
  const { workingHours, breaks = [], slotDuration } = doctor;

  const workStart = timeToMinutes(workingHours.startTime);
  const workEnd = timeToMinutes(workingHours.endTime);
  const duration = slotDuration || 15;

  const bookedSet = new Set(bookedSlots);
  const slots = [];

  const checkPastSlots = isToday(date);
  const currentMinutes = checkPastSlots ? getCurrentTimeInMinutes() : -1;

  let current = workStart;

  while (current + duration <= workEnd) {
    const slotEnd = current + duration;
    const startStr = minutesToTime(current);
    const endStr = minutesToTime(slotEnd);

    // Check if slot overlaps with any break
    const isDuringBreak = overlapsWithBreak(current, slotEnd, breaks);

    // Check if slot is in the past (for today only)
    const isPast = checkPastSlots && current < currentMinutes;

    // Check if slot is already booked
    const isBooked = bookedSet.has(startStr);

    slots.push({
      slotStart: startStr,
      slotEnd: endStr,
      isAvailable: !isDuringBreak && !isPast && !isBooked,
      status: isDuringBreak
        ? 'break'
        : isPast
        ? 'past'
        : isBooked
        ? 'booked'
        : 'available',
    });

    current += duration;
  }

  return slots;
};

/**
 * Validate that a specific slot is valid for a doctor's schedule
 * @param {string} slotStart - "HH:MM"
 * @param {string} slotEnd - "HH:MM"
 * @param {Object} doctor - Doctor document
 * @returns {{ valid: boolean, reason?: string }}
 */
const validateSlot = (slotStart, slotEnd, doctor) => {
  const start = timeToMinutes(slotStart);
  const end = timeToMinutes(slotEnd);
  const workStart = timeToMinutes(doctor.workingHours.startTime);
  const workEnd = timeToMinutes(doctor.workingHours.endTime);

  if (start < workStart || end > workEnd) {
    return { valid: false, reason: 'Slot is outside doctor working hours' };
  }

  if (end - start !== doctor.slotDuration) {
    return { valid: false, reason: 'Slot duration mismatch' };
  }

  if (overlapsWithBreak(start, end, doctor.breaks || [])) {
    return { valid: false, reason: 'Slot falls during a break period' };
  }

  return { valid: true };
};

module.exports = {
  generateSlots,
  validateSlot,
  timeToMinutes,
  minutesToTime,
};
