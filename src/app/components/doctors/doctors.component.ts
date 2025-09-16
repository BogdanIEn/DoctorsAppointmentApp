import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';
import { DoctorService } from '../../services/doctor.service';
import { Doctor } from '../../models/doctor.model';
import { AppointmentBookingDialogComponent } from './appointment-booking-dialog.component';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="doctors-container">
      <h2>Available Doctors</h2>
      
      <div class="doctors-grid">
        <mat-card *ngFor="let doctor of doctors()" class="doctor-card">
          <mat-card-header>
            <div class="doctor-avatar">
              {{ getInitials(doctor.name) }}
            </div>
            <mat-card-title>{{ doctor.name }}</mat-card-title>
            <mat-card-subtitle>{{ doctor.specialty }}</mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <p><strong>Experience:</strong> {{ doctor.experience }}</p>
            <p><strong>Rating:</strong> {{ getStarRating(doctor.rating) }} {{ doctor.rating }}</p>
          </mat-card-content>
          
          <mat-card-actions>
            <button mat-raised-button color="primary" 
                    (click)="bookAppointment(doctor)">
              Book Appointment
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styleUrls: ['./doctors.component.scss']
})
export class DoctorsComponent {
  private readonly doctorService = inject(DoctorService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly doctors = toSignal(this.doctorService.getDoctors(), { initialValue: [] as Doctor[] });

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('');
  }

  getStarRating(rating: number): string {
    const filledStars = Math.floor(rating);
    const star = '\u2605';
    const emptyStar = '\u2606';
    return star.repeat(filledStars).padEnd(5, emptyStar);
  }

  bookAppointment(doctor: Doctor) {
    const dialogRef = this.dialog.open(AppointmentBookingDialogComponent, {
      width: '500px',
      data: { doctor }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Appointment booked successfully!', 'Close', { duration: 3000 });
      }
    });
  }
}
