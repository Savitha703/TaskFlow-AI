import mongoose from 'mongoose';
import { validateSchedule } from '../../../shared/scheduling.js';

const scheduleSchema = new mongoose.Schema({
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  timeZone: { type: String, required: true },
  explanation: { type: String, default: '', maxlength: 350 },
}, { _id: false });

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, trim: true, default: '', maxlength: 5000 },
  project: { type: String, trim: true, default: 'Personal', maxlength: 60 },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'In Progress' },
  dueDate: { type: Date, required: true },
  completedAt: { type: Date, default: null },
  schedule: { type: scheduleSchema, default: null },
}, {
  timestamps: true,
  optimisticConcurrency: true,
  bufferCommands: false,
  toJSON: {
    transform(_document, result) {
      result.id = result._id.toString();
      delete result._id;
      delete result.__v;
      return result;
    },
  },
});

taskSchema.pre('validate', function () {
  if (this.schedule) {
    try { validateSchedule(this.schedule.toObject()); }
    catch (error) { this.invalidate('schedule', error.message); }
  }
  if (this.isModified('status')) {
    this.completedAt = this.status === 'Completed' ? new Date() : null;
  }
});

export default mongoose.model('Task', taskSchema);
