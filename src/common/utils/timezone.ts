import { getTimezoneOffset } from 'date-fns-tz';

/**
 * Parse a date string (YYYY-MM-DD format) as a date in a specific timezone.
 * Returns the Date object in UTC representation.
 * 
 * @param dateString - Date in YYYY-MM-DD format
 * @param timezone - IANA timezone string (e.g., 'America/Halifax')
 * @returns Date object representing midnight in the given timezone
 */
export function parseDateInTimezone(dateString: string, timezone: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create a date assuming it's in UTC first
  const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  
  // Calculate the offset for the given timezone at this date
  // The offset is how many milliseconds to ADD to UTC to get local time
  const offsetMs = getTimezoneOffset(timezone, utcDate);
  
  // Subtract the offset to get the UTC date that represents midnight in the local timezone
  return new Date(utcDate.getTime() - offsetMs);
}

/**
 * Parse a time string (HH:MM format) as a specific time in a timezone.
 * Assumes the time is on a given date in the specified timezone.
 * 
 * @param dateString - Date in YYYY-MM-DD format
 * @param timeString - Time in HH:MM format
 * @param timezone - IANA timezone string
 * @returns Date object in UTC
 */
export function parseTimeInTimezone(
  dateString: string,
  timeString: string,
  timezone: string
): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Create a UTC date with the time in UTC
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
  
  // Calculate the offset for the given timezone
  const offsetMs = getTimezoneOffset(timezone, utcDate);
  
  // Subtract the offset to convert from UTC to the timezone's UTC representation
  return new Date(utcDate.getTime() - offsetMs);
}

/**
 * Convert a UTC time to a specific timezone and extract the local time string.
 * 
 * @param utcDate - Date object in UTC
 * @param timezone - IANA timezone string
 * @returns Time string in HH:MM format (local to the timezone)
 */
export function formatTimeInTimezone(utcDate: Date, timezone: string): string {
  const offsetMs = getTimezoneOffset(timezone, utcDate);
  const localDate = new Date(utcDate.getTime() + offsetMs);
  
  const hours = String(localDate.getUTCHours()).padStart(2, '0');
  const minutes = String(localDate.getUTCMinutes()).padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * Get the day of week (0=Monday, 6=Sunday) for a date in a specific timezone.
 * 
 * @param dateString - Date in YYYY-MM-DD format
 * @param timezone - IANA timezone string
 * @returns Day of week (0=Monday, 6=Sunday) as per salon system convention
 */
export function getDayOfWeekInTimezone(dateString: string, timezone: string): number {
  const [year, month, day] = dateString.split('-').map(Number);
  
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  const offsetMs = getTimezoneOffset(timezone, utcDate);
  const localDate = new Date(utcDate.getTime() + offsetMs);
  
  // JavaScript's getUTCDay() returns 0=Sun, 1=Mon, ..., 6=Sat
  // Convert to convention: 0=Mon, 1=Tue, ..., 6=Sun
  const jsDay = localDate.getUTCDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}
