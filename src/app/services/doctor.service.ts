import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Doctor } from '../models/doctor.model';
import { API_BASE_URL } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  private readonly apiUrl = `${API_BASE_URL}/doctors`;
  private doctorsSubject = new BehaviorSubject<Doctor[]>([]);

  constructor(private http: HttpClient) {
    this.refreshDoctors();
  }

  getDoctors(): Observable<Doctor[]> {
    return this.doctorsSubject.asObservable();
  }

  createDoctor(doctor: Omit<Doctor, 'id'>): Observable<Doctor> {
    return this.http.post<Doctor>(this.apiUrl, doctor).pipe(
      tap(() => this.refreshDoctors())
    );
  }

  updateDoctor(id: number, changes: Partial<Omit<Doctor, 'id'>>): Observable<Doctor | null> {
    return this.http.put<Doctor>(`${this.apiUrl}/${id}`, changes).pipe(
      tap(() => this.refreshDoctors()),
      catchError(error => {
        if (error.status === 404) {
          return of(null);
        }
        return throwError(() => error);
      })
    );
  }

  deleteDoctor(id: number): Observable<boolean> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.refreshDoctors()),
      map(() => true),
      catchError(error => {
        if (error.status === 404) {
          return of(false);
        }
        return throwError(() => error);
      })
    );
  }

  private refreshDoctors() {
    this.http.get<Doctor[]>(this.apiUrl).subscribe({
      next: doctors => this.doctorsSubject.next(doctors),
      error: error => console.error('Failed to load doctors', error)
    });
  }
}
