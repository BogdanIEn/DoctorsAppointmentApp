import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AppointmentService } from '../../services/appointment.service';
import { Doctor } from '../../models/doctor.model';

@Component({
  selector: 'app-appointment-booking-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <h2 mat-dialog-title>Book Appointment</h2>
    
    <mat-dialog-content>
      <form [formGroup]="appointmentForm" class="appointment-form">
        <mat-form-field appearance="outline">
          <mat-label>Doctor</mat-label>
          <input matInput [value]="data.doctor.name" readonly>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Date</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="date" required>
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Time</mat-label>
          <mat-select formControlName="time" required>
            <mat-option value="09:00">09:00 AM</mat-option>
            <mat-option value="10:00">10:00 AM</mat-option>
            <mat-option value="11:00">11:00 AM</mat-option>
            <mat-option value="14:00">02:00 PM</mat-option>
            <mat-option value="15:00">03:00 PM</mat-option>
            <mat-option value="16:00">04:00 PM</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Reason for Visit</mat-label>
          <textarea matInput rows="3" formControlName="reason" required></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" 
              [disabled]="appointmentForm.invalid" 
              (click)="bookAppointment()">
        Book Appointment
      </button>
    </mat-dialog-actions>
  `,
  styleUrls: ['./appointment-booking-dialog.component.scss']
})
export class AppointmentBookingDialogComponent {
  appointmentForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AppointmentBookingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { doctor: Doctor },
    private appointmentService: AppointmentService
  ) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.appointmentForm = this.fb.group({
      date: [tomorrow, Validators.required],
      time: ['', Validators.required],
      reason: ['', Validators.required]
    });
  }

  bookAppointment() {
    if (this.appointmentForm.valid) {
      const formValue = this.appointmentForm.value;
      const appointmentData = {
        doctorId: this.data.doctor.id,
        doctorName: this.data.doctor.name,
        date: formValue.date.toISOString().split('T')[0],
        time: formValue.time,
        reason: formValue.reason
      };

      this.appointmentService.createAppointment(appointmentData).subscribe({
        next: (appointment) => {
          if (appointment) {
            this.dialogRef.close(true);
          } else {
            // Handle conflict or other errors
            alert('This time slot is already booked. Please choose another time.');
          }
        }
      });
    }
  }
}