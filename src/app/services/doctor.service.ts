import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Doctor } from '../models/doctor.model';

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  private doctors: Doctor[] = [
    { id: 1, name: 'Dr. Sarah Wilson', specialty: 'Cardiology', experience: '15 years', rating: 4.8 },
    { id: 2, name: 'Dr. Michael Chen', specialty: 'Dermatology', experience: '12 years', rating: 4.7 },
    { id: 3, name: 'Dr. Emily Johnson', specialty: 'Pediatrics', experience: '18 years', rating: 4.9 },
    { id: 4, name: 'Dr. David Rodriguez', specialty: 'Orthopedics', experience: '20 years', rating: 4.6 },
    { id: 5, name: 'Dr. Lisa Anderson', specialty: 'Neurology', experience: '14 years', rating: 4.8 },
    { id: 6, name: 'Dr. James Thompson', specialty: 'Internal Medicine', experience: '16 years', rating: 4.7 }
  ];

  private doctorsSubject = new BehaviorSubject<Doctor[]>([...this.doctors]);
  private nextId = this.doctors.length + 1;

  getDoctors(): Observable<Doctor[]> {
    return this.doctorsSubject.asObservable();
  }

  getDoctorById(id: number): Observable<Doctor | undefined> {
    return of(this.doctors.find(doctor => doctor.id === id));
  }

  createDoctor(doctor: Omit<Doctor, 'id'>): Observable<Doctor> {
    const newDoctor: Doctor = { id: this.nextId++, ...doctor };
    this.doctors.push(newDoctor);
    this.emitDoctors();
    return of(newDoctor);
  }

  updateDoctor(id: number, changes: Partial<Omit<Doctor, 'id'>>): Observable<Doctor | null> {
    const index = this.doctors.findIndex(doc => doc.id === id);
    if (index === -1) {
      return of(null);
    }

    this.doctors[index] = {
      ...this.doctors[index],
      ...changes
    };

    this.emitDoctors();
    return of(this.doctors[index]);
  }

  deleteDoctor(id: number): Observable<boolean> {
    const index = this.doctors.findIndex(doc => doc.id === id);
    if (index === -1) {
      return of(false);
    }

    this.doctors.splice(index, 1);
    this.emitDoctors();
    return of(true);
  }

  private emitDoctors() {
    this.doctorsSubject.next([...this.doctors]);
  }
}
