export type AppointmentStatus = 'confirmed' | 'pending' | 'cancelled';

export interface CreateAppointmentDto {
  userId: number;
  doctorId: number;
  doctorName: string;
  date: string;
  time: string;
  reason: string;
  status: AppointmentStatus;
}

export interface Appointment {
  id: number;
  userId: number;
  doctorId: number;
  doctorName: string;
  date: string;
  time: string;
  reason: string;
  status: AppointmentStatus;
  createdAt: string;
}
