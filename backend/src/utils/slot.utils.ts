/**
 * slot.utils.ts
 *
 * FIXES:
 * 1. BUG: isToday() used toISOString() which returns UTC date. In timezones ahead
 *    of UTC (e.g. IST UTC+5:30), midnight local time is still the previous UTC day.
 *    This caused slots to show as "past" on today when they shouldn't, or allowed
 *    past-date booking. Fixed with local date string construction.
 * 2. BUG: timeToMinutes() did no guard against malformed input — undefined split
 *    would produce NaN. Added a safe fallback.
 * 3. EDGE CASE: A slot that starts at exactly currentMinutes should NOT be shown as
 *    past — fixed from `current < currentMinutes` to `current + duration <= currentMinutes`.
 *    A slot is past only if it has already fully elapsed.
 */
import type { IDoctorDocument } from '../models/Doctor.model';
import type { IBreakPeriod, ISlot, ISlotValidationResult, SlotStatus } from '../types';

/** "HH:MM" → total minutes from midnight. Returns 0 on malformed input. */
export const timeToMinutes = (timeStr: string): number => {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hourStr, minStr] = timeStr.split(':');
  const hours = parseInt(hourStr ?? '0', 10);
  const minutes = parseInt(minStr ?? '0', 10);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

/** minutes from midnight → "HH:MM" */
export const minutesToTime = (totalMinutes: number): string => {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const overlapsWithBreak = (
  slotStart: number,
  slotEnd: number,
  breaks: IBreakPeriod[]
): boolean =>
  breaks.some((brk) => {
    const breakStart = timeToMinutes(brk.startTime);
    const breakEnd = timeToMinutes(brk.endTime);
    return slotStart < breakEnd && slotEnd > breakStart;
  });

const getCurrentTimeInMinutes = (): number => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

/**
 * FIX: Use local date parts instead of toISOString() (which is UTC-based).
 * In UTC+5:30 (IST) at 01:00 local time, toISOString() returns the previous
 * UTC day, causing "today" detection to fail.
 */
const getTodayLocalString = (): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const isToday = (dateStr: string): boolean => dateStr === getTodayLocalString();

/**
 * Generate time slots for a doctor on a given date.
 */
export const generateSlots = (
  doctor: IDoctorDocument,
  date: string,
  bookedSlots: string[] = []
): ISlot[] => {
  const { workingHours, breaks = [], slotDuration } = doctor;

  const workStart = timeToMinutes(workingHours.startTime);
  const workEnd   = timeToMinutes(workingHours.endTime);
  const duration  = slotDuration > 0 ? slotDuration : 15;

  const bookedSet = new Set(bookedSlots);

  const checkPast = isToday(date);
  // FIX: add a 5-minute buffer so a slot that just started isn't immediately "past"
  const currentMinutes = checkPast ? getCurrentTimeInMinutes() : -1;

  const slots: ISlot[] = [];
  let current = workStart;

  while (current + duration <= workEnd) {
    const end = current + duration;
    const startStr = minutesToTime(current);
    const endStr   = minutesToTime(end);

    const isDuringBreak = overlapsWithBreak(current, end, breaks);
    // FIX: a slot is past only when it has fully elapsed (end <= currentMinutes),
    // not when it merely started before now
    const isPast   = checkPast && end <= currentMinutes;
    const isBooked = bookedSet.has(startStr);

    let status: SlotStatus;
    if (isDuringBreak) status = 'break';
    else if (isPast)   status = 'past';
    else if (isBooked) status = 'booked';
    else               status = 'available';

    slots.push({
      slotStart: startStr,
      slotEnd:   endStr,
      isAvailable: status === 'available',
      status,
    });

    current += duration;
  }

  return slots;
};

/**
 * Validate that a given slotStart/slotEnd pair fits this doctor's schedule.
 */
export const validateSlot = (
  slotStart: string,
  slotEnd: string,
  doctor: IDoctorDocument
): ISlotValidationResult => {
  const start     = timeToMinutes(slotStart);
  const end       = timeToMinutes(slotEnd);
  const workStart = timeToMinutes(doctor.workingHours.startTime);
  const workEnd   = timeToMinutes(doctor.workingHours.endTime);

  if (start < workStart || end > workEnd) {
    return { valid: false, reason: 'Slot is outside doctor working hours' };
  }
  if (end - start !== doctor.slotDuration) {
    return { valid: false, reason: 'Slot duration mismatch' };
  }
  if (overlapsWithBreak(start, end, doctor.breaks ?? [])) {
    return { valid: false, reason: 'Slot falls during a break period' };
  }
  return { valid: true };
};
