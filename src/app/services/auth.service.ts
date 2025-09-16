import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private users: User[] = [
    { 
      id: 1, 
      name: 'Demo User', 
      email: 'admin@demo.com', 
      password: 'password123', 
      phone: '+1234567890' 
    }
  ];

  constructor() {
    // Check for stored user on service init
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    }
  }

  login(email: string, password: string): Observable<User | null> {
    return new Observable(observer => {
      const user = this.users.find(u => u.email === email && u.password === password);
      
      if (user) {
        const userWithoutPassword = { ...user };
        delete userWithoutPassword.password;
        
        localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
        this.currentUserSubject.next(userWithoutPassword);
        observer.next(userWithoutPassword);
      } else {
        observer.next(null);
      }
      observer.complete();
    });
  }

  register(userData: Omit<User, 'id'>): Observable<User | null> {
    return new Observable(observer => {
      // Check if email already exists
      if (this.users.find(u => u.email === userData.email)) {
        observer.next(null);
        observer.complete();
        return;
      }

      const newUser: User = {
        id: this.users.length + 1,
        ...userData
      };

      this.users.push(newUser);
      observer.next(newUser);
      observer.complete();
    });
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
}