import type { IDoctorDocument } from "../models/Doctor.model";
import type { IBreakPeriod, ISlot, ISlotValidationResult, SlotStatus } from "../types";

export const timeToMinutes = (timeStr: string): number => {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hourStr, minStr] = timeStr.split(':');
  const hours = parseInt(hourStr ?? '0', 10);
  const minutes = parseInt(minStr ?? '0', 10);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

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

const getTodayLocalString = (): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const isToday = (dateStr: string): boolean => dateStr === getTodayLocalString();

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
  const currentMinutes = checkPast ? getCurrentTimeInMinutes() : -1;

  const slots: ISlot[] = [];
  let current = workStart;

  while (current + duration <= workEnd) {
    const end = current + duration;
    const startStr = minutesToTime(current);
    const endStr   = minutesToTime(end);

    const isDuringBreak = overlapsWithBreak(current, end, breaks);
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
