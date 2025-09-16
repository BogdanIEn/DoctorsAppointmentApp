import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { User } from '../models/user.model';
import { API_BASE_URL } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = API_BASE_URL;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private usersSubject = new BehaviorSubject<User[]>([]);

  constructor(private http: HttpClient) {
    this.restoreCurrentUser();
    this.refreshUsers();
  }

  login(email: string, password: string): Observable<User | null> {
    return this.http.post<User>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap(user => this.setCurrentUser(user)),
      tap(() => this.refreshUsers()),
      catchError(error => {
        if (error.status === 401) {
          return of(null);
        }
        return throwError(() => error);
      })
    );
  }

  register(userData: Omit<User, 'id' | 'role'>): Observable<User | null> {
    return this.http.post<User>(`${this.apiUrl}/auth/register`, userData).pipe(
      tap(user => this.setCurrentUser(user)),
      tap(() => this.refreshUsers()),
      catchError(error => {
        if (error.status === 409) {
          return of(null);
        }
        return throwError(() => error);
      })
    );
  }

  createUser(userData: Omit<User, 'id'>): Observable<User | null> {
    return this.http.post<User>(`${this.apiUrl}/users`, userData).pipe(
      tap(() => this.refreshUsers()),
      catchError(error => {
        if (error.status === 409) {
          return of(null);
        }
        return throwError(() => error);
      })
    );
  }

  updateUser(userId: number, changes: Partial<Omit<User, 'id'>>): Observable<User | null> {
    return this.http.put<User>(`${this.apiUrl}/users/${userId}`, changes).pipe(
      tap(updatedUser => {
        if (this.currentUserSubject.value?.id === updatedUser.id) {
          this.setCurrentUser(updatedUser);
        }
      }),
      tap(() => this.refreshUsers()),
      catchError(error => {
        if (error.status === 409) {
          return of(null);
        }
        return throwError(() => error);
      })
    );
  }

  deleteUser(userId: number): Observable<boolean> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}`).pipe(
      tap(() => {
        if (this.currentUserSubject.value?.id === userId) {
          this.logout();
        }
        this.refreshUsers();
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

  getUsers(): Observable<User[]> {
    return this.usersSubject.asObservable();
  }

  logout() {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  private restoreCurrentUser() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    }
  }

  private setCurrentUser(user: User) {
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private refreshUsers() {
    this.http.get<User[]>(`${this.apiUrl}/users`).subscribe({
      next: users => this.usersSubject.next(users),
      error: error => console.error('Failed to load users', error)
    });
  }
}
