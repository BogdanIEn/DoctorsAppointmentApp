import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, map } from 'rxjs';
import { Appointment } from '../models/appointment.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private appointments: Appointment[] = [];
  private appointmentsSubject = new BehaviorSubject<Appointment[]>([]);
  private nextId = 1;

  constructor(private authService: AuthService) {
    this.seedDemoAppointments();
  }

  getAppointments(): Observable<Appointment[]> {
    return this.appointmentsSubject.asObservable().pipe(
      map(() => this.filterAppointmentsForCurrentUser())
    );
  }

  getAllAppointments(): Observable<Appointment[]> {
    return this.appointmentsSubject.asObservable();
  }

  createAppointment(appointmentData: Omit<Appointment, 'id' | 'userId' | 'status' | 'createdAt'>): Observable<Appointment | null> {
    return new Observable(observer => {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        observer.next(null);
        observer.complete();
        return;
      }

      if (this.hasConflict(appointmentData.doctorId, appointmentData.date, appointmentData.time)) {
        observer.next(null);
        observer.complete();
        return;
      }

      const newAppointment = this.buildAppointment({
        userId: currentUser.id,
        status: 'confirmed',
        ...appointmentData
      });

      this.appointments.push(newAppointment);
      this.emitAppointments();
      observer.next(newAppointment);
      observer.complete();
    });
  }

  createAppointmentForUser(userId: number, appointmentData: Omit<Appointment, 'id' | 'userId' | 'status' | 'createdAt'> & { status?: Appointment['status'] }): Observable<Appointment | null> {
    return new Observable(observer => {
      if (this.hasConflict(appointmentData.doctorId, appointmentData.date, appointmentData.time)) {
        observer.next(null);
        observer.complete();
        return;
      }

      const newAppointment = this.buildAppointment({
        userId,
        status: appointmentData.status ?? 'confirmed',
        ...appointmentData
      });

      this.appointments.push(newAppointment);
      this.emitAppointments();
      observer.next(newAppointment);
      observer.complete();
    });
  }

  updateAppointment(id: number, changes: Partial<Omit<Appointment, 'id' | 'createdAt'>>): Observable<Appointment | null> {
    return new Observable(observer => {
      const index = this.appointments.findIndex(apt => apt.id === id);
      if (index === -1) {
        observer.next(null);
        observer.complete();
        return;
      }

      const current = this.appointments[index];
      const updated: Appointment = {
        ...current,
        ...changes
      };

      if (this.hasConflict(updated.doctorId, updated.date, updated.time, id)) {
        observer.next(null);
        observer.complete();
        return;
      }

      this.appointments[index] = updated;
      this.emitAppointments();
      observer.next(updated);
      observer.complete();
    });
  }

  deleteAppointment(id: number): Observable<boolean> {
    return new Observable(observer => {
      const index = this.appointments.findIndex(apt => apt.id === id);
      if (index === -1) {
        observer.next(false);
        observer.complete();
        return;
      }

      this.appointments.splice(index, 1);
      this.emitAppointments();
      observer.next(true);
      observer.complete();
    });
  }

  cancelAppointment(id: number): Observable<boolean> {
    const appointment = this.appointments.find(apt => apt.id === id);
    if (appointment) {
      appointment.status = 'cancelled';
      this.emitAppointments();
      return of(true);
    }
    return of(false);
  }

  private buildAppointment(data: Omit<Appointment, 'id' | 'createdAt'> & { status: Appointment['status']; userId: number }): Appointment {
    return {
      id: this.nextId++,
      createdAt: new Date().toISOString(),
      ...data
    };
  }

  private hasConflict(doctorId: number, date: string, time: string, ignoreId?: number): boolean {
    return this.appointments.some(apt =>
      apt.id !== ignoreId &&
      apt.doctorId === doctorId &&
      apt.date === date &&
      apt.time === time &&
      apt.status !== 'cancelled'
    );
  }

  private emitAppointments() {
    this.appointmentsSubject.next([...this.appointments]);
  }

  private filterAppointmentsForCurrentUser(): Appointment[] {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return [];
    }

    return this.appointments
      .filter(apt => apt.userId === currentUser.id);
  }

  private seedDemoAppointments() {
    if (this.appointments.length === 0) {
      const today = new Date();
      const upcoming = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);
      const followUp = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10);

      this.appointments.push(
        this.buildAppointment({
          userId: 2,
          doctorId: 1,
          doctorName: 'Dr. Sarah Wilson',
          date: this.toIsoDate(upcoming),
          time: '09:00',
          reason: 'Annual check-up',
          status: 'confirmed'
        })
      );

      this.appointments.push(
        this.buildAppointment({
          userId: 2,
          doctorId: 3,
          doctorName: 'Dr. Emily Johnson',
          date: this.toIsoDate(followUp),
          time: '14:30',
          reason: 'Pediatric follow-up',
          status: 'cancelled'
        })
      );
    }

    this.emitAppointments();
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
