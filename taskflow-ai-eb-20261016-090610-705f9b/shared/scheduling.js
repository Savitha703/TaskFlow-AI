export const FOCUS_MINUTES = [25, 50, 90];
export const BREAK_MINUTES = [0, 5, 10, 15, 20, 30];

export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function timeMinutes(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}
export function clockTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
export function isTimeZone(value) {
  if (typeof value !== 'string' || value.length > 80) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
}
export function validateSchedule(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['date', 'startTime', 'endTime', 'timeZone', 'explanation'].includes(key))) throw new Error('Provide date, startTime, endTime, timeZone and an optional explanation for the schedule.');
  if (!isCalendarDate(value.date) || !isTimeZone(value.timeZone)) throw new Error('Schedule requires a valid YYYY-MM-DD date and IANA time zone.');
  const start = timeMinutes(value.startTime), end = timeMinutes(value.endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error('Schedule times must be HH:MM with the end after the start on the same day.');
  if (value.explanation !== undefined && (typeof value.explanation !== 'string' || value.explanation.length > 350)) throw new Error('Schedule explanation must be at most 350 characters.');
  return { date: value.date, startTime: value.startTime, endTime: value.endTime, timeZone: value.timeZone, explanation: value.explanation || '' };
}

export function validateDailyPreferences(value) {
  const fields = ['date', 'startTime', 'endTime', 'timeZone', 'availableHours', 'focusMinutes', 'breakMinutes', 'workingDays', 'workStyle'];
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !fields.includes(key))) throw new Error('Provide only daily planning preferences; tasks are loaded from the database.');
  if (!isCalendarDate(value.date) || !isTimeZone(value.timeZone)) throw new Error('Choose a valid planning date and time zone.');
  const start = timeMinutes(value.startTime), end = timeMinutes(value.endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error('Choose a working window ending after it starts on the same day.');
  if (typeof value.availableHours !== 'number' || !Number.isFinite(value.availableHours) || value.availableHours < 0.25 || value.availableHours > 12 || !Number.isInteger(value.availableHours * 4)) throw new Error('Available hours must be between 0.25 and 12 in quarter-hour increments.');
  if (value.availableHours * 60 > end - start) throw new Error('Available hours cannot exceed the working window. Breaks also need room within that window.');
  if (!FOCUS_MINUTES.includes(value.focusMinutes) || !BREAK_MINUTES.includes(value.breakMinutes)) throw new Error('Choose a supported focus-block length and break duration.');
  if (!Array.isArray(value.workingDays) || !value.workingDays.length || value.workingDays.some(day => !Number.isInteger(day) || day < 0 || day > 6) || new Set(value.workingDays).size !== value.workingDays.length) throw new Error('Choose at least one working day, using unique weekday numbers from 0 to 6.');
  if (!value.workingDays.includes(new Date(`${value.date}T12:00:00Z`).getUTCDay())) throw new Error('The planning date is outside your selected working days. Choose another date or enable that weekday.');
  if (!['balanced', 'urgent-first', 'deep-work'].includes(value.workStyle)) throw new Error('Choose a supported working style.');
  return Object.fromEntries(fields.map(field => [field, value[field]]));
}

// Titles and priorities always come from saved tasks, never generated text.
export function validateDailyBlocks(value, tasks, preferences) {
  const invalid = () => { throw new Error('Gemini returned an invalid schedule. Try regenerating; no tasks have been changed.'); };
  if (!value || !Array.isArray(value.blocks) || !value.blocks.length || value.blocks.length > tasks.length) return invalid();
  const byId = new Map(tasks.map(task => [String(task.id || task._id), task]));
  const seen = new Set();
  let previousEnd = timeMinutes(preferences.startTime), total = 0;
  const blocks = value.blocks.map((block, index) => {
    const task = byId.get(block?.taskId);
    const start = timeMinutes(block?.startTime), duration = block?.durationMinutes;
    if (!task || task.status === 'Completed' || seen.has(block.taskId) || !Number.isFinite(start) || !Number.isInteger(duration) || duration < 5 || duration % 5 !== 0 || duration > preferences.focusMinutes || typeof block.explanation !== 'string' || !block.explanation.trim() || block.explanation.trim().length > 350) return invalid();
    const end = start + duration;
    if (start < previousEnd + (index ? preferences.breakMinutes : 0) || end > timeMinutes(preferences.endTime)) return invalid();
    seen.add(block.taskId);
    previousEnd = end;
    total += duration;
    return { taskId: block.taskId, title: task.title, priority: task.priority, status: task.status, dueDate: new Date(task.dueDate).toISOString().slice(0, 10), sourceUpdatedAt: new Date(task.updatedAt).toISOString(), startTime: block.startTime, endTime: clockTime(end), durationMinutes: duration, explanation: block.explanation.trim() };
  });
  if (total > preferences.availableHours * 60 || previousEnd - timeMinutes(blocks[0].startTime) > preferences.availableHours * 60) return invalid();
  return blocks;
}
