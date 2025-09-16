import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Appointment, CreateAppointmentDto } from '../models/appointment.model';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../config/api.config';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type CreateAppointmentPayload = Omit<CreateAppointmentDto, 'userId' | 'status'> & {
  status?: CreateAppointmentDto['status'];
};

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private readonly apiUrl = `${API_BASE_URL}/appointments`;
  private appointmentsSubject = new BehaviorSubject<Appointment[]>([]);
  private allAppointmentsSubject = new BehaviorSubject<Appointment[]>([]);

  constructor(private http: HttpClient, private authService: AuthService) {
    this.authService.currentUser$
      .pipe(takeUntilDestroyed())
      .subscribe(user => {
        if (user) {
          this.loadAppointmentsForUser(user.id);
        } else {
          this.appointmentsSubject.next([]);
        }
      });

    this.refreshAllAppointments();
  }

  getAppointments(): Observable<Appointment[]> {
    return this.appointmentsSubject.asObservable();
  }

  getAllAppointments(): Observable<Appointment[]> {
    return this.allAppointmentsSubject.asObservable();
  }

  createAppointment(appointmentData: CreateAppointmentPayload): Observable<Appointment | null> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of(null);
    }

    const payload = this.buildCreatePayload(currentUser.id, appointmentData);

    return this.http.post<Appointment>(this.apiUrl, payload).pipe(
      tap(() => {
        this.loadAppointmentsForUser(currentUser.id);
        this.refreshAllAppointments();
      }),
      catchError(error => {
        if (error.status === 409) {
          return of(null);
        }
        return throwError(() => error);
      })
    );
  }

  createAppointmentForUser(userId: number, appointmentData: CreateAppointmentPayload): Observable<Appointment | null> {
    const payload = this.buildCreatePayload(userId, appointmentData);

    return this.http.post<Appointment>(this.apiUrl, payload).pipe(
      tap(() => {
        this.loadAppointmentsForUser(userId);
        this.refreshAllAppointments();
      }),
      catchError(error => {
        if (error.status === 409) {
          return of(null);
        }
        return throwError(() => error);
      })
    );
  }

  updateAppointment(id: number, changes: Partial<Omit<Appointment, 'id' | 'createdAt'>>): Observable<Appointment | null> {
    const normalizedChanges: Partial<Omit<Appointment, 'id' | 'createdAt'>> = {
      ...changes,
      ...(changes.time ? { time: this.ensureTimeWithSeconds(changes.time) } : {})
    };

    return this.http.put<Appointment>(`${this.apiUrl}/${id}`, normalizedChanges).pipe(
      tap(updated => {
        this.refreshAllAppointments();
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && updated.userId === currentUser.id) {
          this.loadAppointmentsForUser(currentUser.id);
        }
      }),
      catchError(error => {
        if (error.status === 409) {
          return of(null);
        }
        return throwError(() => error);
      })
    );
  }

  deleteAppointment(id: number): Observable<boolean> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.refreshAllAppointments();
        const currentUser = this.authService.getCurrentUser();
        if (currentUser) {
          this.loadAppointmentsForUser(currentUser.id);
        }
      }),
      map(() => true),
      catchError(error => {
        if (error.status === 404) {
          return of(false);
        }
        return throwError(() => error);
      })
    );
  }

  cancelAppointment(id: number): Observable<boolean> {
    const appointment = this.findAppointmentById(id);
    if (!appointment) {
      return of(false);
    }

    const payload = this.buildUpdatePayload(appointment, 'cancelled');
    return this.updateAppointment(id, payload).pipe(
      map(result => result !== null)
    );
  }

  private findAppointmentById(id: number): Appointment | undefined {
    return this.allAppointmentsSubject.getValue().find(appointment => appointment.id === id)
      ?? this.appointmentsSubject.getValue().find(appointment => appointment.id === id);
  }

  private buildUpdatePayload(appointment: Appointment, status: Appointment['status']): Partial<Omit<Appointment, 'id' | 'createdAt'>> {
    return {
      userId: appointment.userId,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctorName,
      date: appointment.date,
      time: this.ensureTimeWithSeconds(appointment.time),
      reason: appointment.reason,
      status
    };
  }

  private buildCreatePayload(userId: number, appointmentData: CreateAppointmentPayload): CreateAppointmentDto {
    const { status, ...details } = appointmentData;
    const normalizedDetails = {
      ...details,
      time: this.ensureTimeWithSeconds(details.time)
    };

    return {
      userId,
      ...normalizedDetails,
      status: status ?? 'confirmed'
    };
  }

  private ensureTimeWithSeconds(time: string): string {
    if (time && /^\d{2}:\d{2}$/.test(time)) {
      return `${time}:00`;
    }

    return time;
  }

  private loadAppointmentsForUser(userId: number) {
    const params = new HttpParams().set('userId', userId);
    this.http.get<Appointment[]>(this.apiUrl, { params }).subscribe({
      next: appointments => this.appointmentsSubject.next(appointments),
      error: error => console.error('Failed to load appointments', error)
    });
  }

  private refreshAllAppointments() {
    this.http.get<Appointment[]>(this.apiUrl).subscribe({
      next: appointments => this.allAppointmentsSubject.next(appointments),
      error: error => console.error('Failed to load appointments', error)
    });
  }
}
