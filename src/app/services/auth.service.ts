import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private users: (User & { password?: string })[] = [
    {
      id: 1,
      name: 'Demo Admin',
      email: 'admin@demo.com',
      password: 'password123',
      phone: '+1234567890',
      role: 'admin'
    },
    {
      id: 2,
      name: 'Demo Patient',
      email: 'patient@demo.com',
      password: 'password123',
      phone: '+1987654321',
      role: 'patient'
    }
  ];
  private usersSubject = new BehaviorSubject<User[]>([]);

  constructor() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const parsed = JSON.parse(storedUser) as User;
      if (!parsed.role) {
        parsed.role = 'patient';
      }
      this.currentUserSubject.next(parsed);
    }

    this.emitUsers();
  }

  login(email: string, password: string): Observable<User | null> {
    return new Observable(observer => {
      const user = this.users.find(u => u.email === email && u.password === password);

      if (user) {
        const sanitized = this.sanitizeUser(user);
        localStorage.setItem('currentUser', JSON.stringify(sanitized));
        this.currentUserSubject.next(sanitized);
        observer.next(sanitized);
      } else {
        observer.next(null);
      }
      observer.complete();
    });
  }

  register(userData: Omit<User, 'id' | 'role'>): Observable<User | null> {
    return new Observable(observer => {
      if (this.users.find(u => u.email === userData.email)) {
        observer.next(null);
        observer.complete();
        return;
      }

      const newUser: User & { password?: string } = {
        id: this.users.length + 1,
        role: 'patient',
        ...userData
      };

      this.users.push(newUser);
      this.emitUsers();
      observer.next(this.sanitizeUser(newUser));
      observer.complete();
    });
  }

  createUser(userData: Omit<User, 'id'>): Observable<User | null> {
    return new Observable(observer => {
      if (this.users.find(u => u.email === userData.email)) {
        observer.next(null);
        observer.complete();
        return;
      }

      const newUser: User & { password?: string } = {
        id: this.users.length + 1,
        ...userData
      };

      if (!newUser.password) {
        newUser.password = 'password123';
      }

      this.users.push(newUser);
      this.emitUsers();
      observer.next(this.sanitizeUser(newUser));
      observer.complete();
    });
  }

  updateUser(userId: number, changes: Partial<Omit<User, 'id'>>): Observable<User | null> {
    return new Observable(observer => {
      const userIndex = this.users.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        observer.next(null);
        observer.complete();
        return;
      }

      if (changes.email) {
        const emailTaken = this.users.some(u => u.email === changes.email && u.id !== userId);
        if (emailTaken) {
          observer.next(null);
          observer.complete();
          return;
        }
      }

      const existing = this.users[userIndex];
      const updatedUser: User & { password?: string } = {
        ...existing,
        ...changes
      };

      if (!changes.password) {
        updatedUser.password = existing.password;
      }

      this.users[userIndex] = updatedUser;
      this.emitUsers();

      if (this.currentUserSubject.value?.id === userId) {
        const sanitized = this.sanitizeUser(updatedUser);
        this.currentUserSubject.next(sanitized);
        localStorage.setItem('currentUser', JSON.stringify(sanitized));
      }

      observer.next(this.sanitizeUser(updatedUser));
      observer.complete();
    });
  }

  deleteUser(userId: number): Observable<boolean> {
    return new Observable(observer => {
      const index = this.users.findIndex(u => u.id === userId);
      if (index === -1) {
        observer.next(false);
        observer.complete();
        return;
      }

      const [removed] = this.users.splice(index, 1);
      this.emitUsers();

      if (this.currentUserSubject.value?.id === removed.id) {
        this.logout();
      }

      observer.next(true);
      observer.complete();
    });
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

  private sanitizeUser(user: User & { password?: string }): User {
    const { password, ...rest } = user;
    return { ...rest };
  }

  private emitUsers() {
    this.usersSubject.next(this.users.map(user => this.sanitizeUser(user)));
  }
}
