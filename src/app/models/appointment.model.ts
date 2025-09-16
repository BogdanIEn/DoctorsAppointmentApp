export interface Appointment {
  id: number;
  userId: number;
  doctorId: number;
  doctorName: string;
  date: string;
  time: string;
  reason: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: string;
}