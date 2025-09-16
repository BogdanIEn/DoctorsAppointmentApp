import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Appointment } from '../models/appointment.model';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../config/api.config';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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

  createAppointment(appointmentData: Omit<Appointment, 'id' | 'userId' | 'status' | 'createdAt'>): Observable<Appointment | null> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of(null);
    }

    const payload = {
      userId: currentUser.id,
      status: 'confirmed',
      ...appointmentData
    };

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

  createAppointmentForUser(userId: number, appointmentData: Omit<Appointment, 'id' | 'userId' | 'status' | 'createdAt'> & { status?: Appointment['status'] }): Observable<Appointment | null> {
    const payload = {
      userId,
      status: appointmentData.status ?? 'confirmed',
      ...appointmentData
    };

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
    return this.http.put<Appointment>(`${this.apiUrl}/${id}`, changes).pipe(
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
    return this.updateAppointment(id, { status: 'cancelled' }).pipe(
      map(result => result !== null)
    );
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
