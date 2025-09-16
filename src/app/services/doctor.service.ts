import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
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

  getDoctors(): Observable<Doctor[]> {
    return of(this.doctors);
  }

  getDoctorById(id: number): Observable<Doctor | undefined> {
    return of(this.doctors.find(doctor => doctor.id === id));
  }
}
