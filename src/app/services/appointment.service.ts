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

  constructor(private authService: AuthService) {}

  getAppointments(): Observable<Appointment[]> {
    return this.appointmentsSubject.asObservable().pipe(
      map(() => this.filterAppointmentsForCurrentUser())
    );
  }

  createAppointment(appointmentData: Omit<Appointment, 'id' | 'userId' | 'status' | 'createdAt'>): Observable<Appointment | null> {
    return new Observable(observer => {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        observer.next(null);
        observer.complete();
        return;
      }

      const conflict = this.appointments.find(apt => 
        apt.doctorId === appointmentData.doctorId && 
        apt.date === appointmentData.date && 
        apt.time === appointmentData.time && 
        apt.status !== 'cancelled'
      );

      if (conflict) {
        observer.next(null);
        observer.complete();
        return;
      }

      const newAppointment: Appointment = {
        id: this.nextId++,
        userId: currentUser.id,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        ...appointmentData
      };

      this.appointments.push(newAppointment);
      this.emitAppointments();
      observer.next(newAppointment);
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
}
