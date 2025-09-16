import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AppointmentService } from '../../services/appointment.service';
import { AuthService } from '../../services/auth.service';
import { DoctorService } from '../../services/doctor.service';
import { Appointment } from '../../models/appointment.model';
import { User } from '../../models/user.model';
import { Doctor } from '../../models/doctor.model';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  template: `
    <div class="doctor-dashboard">
      <mat-card class="doctor-card">
        <mat-card-header>
          <mat-card-title>Appointment Requests</mat-card-title>
          <mat-card-subtitle>
            Manage appointments assigned to you. Approve new requests or reject ones you cannot take.
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <table mat-table [dataSource]="doctorAppointments()" class="appointments-table">
            <ng-container matColumnDef="patient">
              <th mat-header-cell *matHeaderCellDef>Patient</th>
              <td mat-cell *matCellDef="let appointment">{{ getPatientName(appointment.userId) }}</td>
            </ng-container>

            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let appointment">{{ formatDate(appointment.date) }}</td>
            </ng-container>

            <ng-container matColumnDef="time">
              <th mat-header-cell *matHeaderCellDef>Time</th>
              <td mat-cell *matCellDef="let appointment">{{ formatTime(appointment.time) }}</td>
            </ng-container>

            <ng-container matColumnDef="reason">
              <th mat-header-cell *matHeaderCellDef>Reason</th>
              <td mat-cell *matCellDef="let appointment">{{ appointment.reason }}</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let appointment">
                <mat-chip [color]="getStatusColor(appointment.status)" selected>
                  {{ appointment.status | titlecase }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let appointment" class="actions-cell">
                <button mat-stroked-button color="primary"
                        *ngIf="appointment.status === 'pending'"
                        (click)="respondToAppointment(appointment, 'confirmed')">
                  Approve
                </button>
                <button mat-stroked-button color="warn"
                        *ngIf="appointment.status === 'pending'"
                        (click)="respondToAppointment(appointment, 'cancelled')">
                  Reject
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <div class="empty-state" *ngIf="doctorAppointments().length === 0">
            <p>No appointments assigned to you yet.</p>
            <p class="hint" *ngIf="!hasMatchingDoctorProfile()">
              Ask an administrator to link your doctor profile so you can start receiving appointment requests.
            </p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrls: ['./doctor-dashboard.component.scss']
})
export class DoctorDashboardComponent {
  private readonly appointmentService = inject(AppointmentService);
  private readonly authService = inject(AuthService);
  private readonly doctorService = inject(DoctorService);
  private readonly snackBar = inject(MatSnackBar);

  private readonly currentUser = toSignal<User | null>(this.authService.currentUser$);

  private readonly users = toSignal(this.authService.getUsers(), { initialValue: [] as User[] });
  private readonly doctors = toSignal(this.doctorService.getDoctors(), { initialValue: [] as Doctor[] });

  private readonly allAppointments = toSignal(
    this.appointmentService.getAllAppointments().pipe(
      map(appointments =>
        [...appointments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      )
    ),
    { initialValue: [] as Appointment[] }
  );

  private readonly assignedDoctorId = computed<number | null>(() => {
    const user = this.currentUser();
    if (!user || user.role !== 'doctor') {
      return null;
    }

    const match = this.doctors().find(doctor =>
      doctor.name.trim().toLowerCase() === user.name.trim().toLowerCase()
    );

    return match?.id ?? null;
  });

  readonly doctorAppointments = computed(() => {
    const user = this.currentUser();
    if (!user || user.role !== 'doctor') {
      return [] as Appointment[];
    }

    const doctorId = this.assignedDoctorId();
    const filterFn = doctorId !== null
      ? (appointment: Appointment) => appointment.doctorId === doctorId
      : (appointment: Appointment) => appointment.doctorName.trim().toLowerCase() === user.name.trim().toLowerCase();

    return this.allAppointments().filter(filterFn);
  });

  readonly displayedColumns = ['patient', 'date', 'time', 'reason', 'status', 'actions'];

  hasMatchingDoctorProfile(): boolean {
    return this.assignedDoctorId() !== null;
  }

  getPatientName(userId: number): string {
    return this.users().find(user => user.id === userId)?.name ?? 'Unknown patient';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  formatTime(time: string): string {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour, 10);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${displayHour}:${minute} ${ampm}`;
  }

  getStatusColor(status: Appointment['status']): string {
    switch (status) {
      case 'confirmed':
        return 'primary';
      case 'pending':
        return 'accent';
      case 'cancelled':
        return 'warn';
      default:
        return '';
    }
  }

  respondToAppointment(appointment: Appointment, status: Appointment['status']) {
    this.appointmentService.updateAppointment(appointment.id, {
      userId: appointment.userId,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctorName,
      date: appointment.date,
      time: appointment.time,
      reason: appointment.reason,
      status
    }).subscribe({
      next: result => {
        if (result) {
          const message = status === 'confirmed' ? 'Appointment approved' : 'Appointment rejected';
          this.snackBar.open(message, 'Close', { duration: 3000 });
        }
      },
      error: () => {
        this.snackBar.open('Unable to update appointment. Please try again.', 'Close', { duration: 3000 });
      }
    });
  }
}

