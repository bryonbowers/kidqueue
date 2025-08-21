import { z } from 'zod';

// User and authentication types
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  provider: z.enum(['google', 'facebook', 'apple']),
  providerId: z.string(),
  role: z.enum(['parent', 'teacher', 'admin']),
  schoolId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// School types
export const SchoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  phoneNumber: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type School = z.infer<typeof SchoolSchema>;

// Student types
export const StudentSchema = z.object({
  id: z.string(),
  name: z.string(),
  grade: z.string(),
  parentId: z.string(),
  schoolId: z.string(),
  qrCode: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Student = z.infer<typeof StudentSchema>;

// Vehicle types
export const VehicleSchema = z.object({
  id: z.string(),
  parentId: z.string(),
  licensePlate: z.string(),
  make: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  qrCode: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Vehicle = z.infer<typeof VehicleSchema>;

// Queue types
export const QueueEntrySchema = z.object({
  id: z.string(),
  studentId: z.string(),
  parentId: z.string(),
  schoolId: z.string(),
  vehicleId: z.string().optional(),
  status: z.enum(['waiting', 'called', 'picked_up']),
  queuePosition: z.number(),
  enteredAt: z.date(),
  calledAt: z.date().optional(),
  pickedUpAt: z.date().optional(),
  teacherId: z.string().optional(),
});

export type QueueEntry = z.infer<typeof QueueEntrySchema>;

// API response types
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
  error: z.string().optional(),
});

export type ApiResponse<T = any> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
};

// Request types
export const QRCodeScanRequestSchema = z.object({
  qrCode: z.string(),
  schoolId: z.string(),
  teacherId: z.string(),
});

export type QRCodeScanRequest = z.infer<typeof QRCodeScanRequestSchema>;

export const CreateStudentRequestSchema = z.object({
  name: z.string().min(1),
  grade: z.string().min(1),
  schoolId: z.string(),
});

export type CreateStudentRequest = z.infer<typeof CreateStudentRequestSchema>;

export const CreateVehicleRequestSchema = z.object({
  licensePlate: z.string().min(1),
  make: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
});

export type CreateVehicleRequest = z.infer<typeof CreateVehicleRequestSchema>;

// Socket event types
export interface SocketEvents {
  'queue:updated': (queueData: QueueEntry[]) => void;
  'queue:position-changed': (data: { studentId: string; position: number }) => void;
  'queue:student-called': (data: { studentId: string; queueEntry: QueueEntry }) => void;
  'queue:student-picked-up': (data: { studentId: string; queueEntry: QueueEntry }) => void;
}

// Constants
export const QR_CODE_PREFIX = 'KIDQUEUE_';
export const QUEUE_STATUSES = ['waiting', 'called', 'picked_up'] as const;
export const USER_ROLES = ['parent', 'teacher', 'admin'] as const;
export const AUTH_PROVIDERS = ['google', 'facebook', 'apple'] as const;