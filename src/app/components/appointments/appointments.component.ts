import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AppointmentService } from '../../services/appointment.service';
import { Appointment } from '../../models/appointment.model';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  template: `
    <div class="appointments-container">
      <h2>My Appointments</h2>
      
      <table mat-table [dataSource]="appointments()" class="appointments-table">
        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef>Date</th>
          <td mat-cell *matCellDef="let appointment">
            {{ formatDate(appointment.date) }}
          </td>
        </ng-container>

        <ng-container matColumnDef="time">
          <th mat-header-cell *matHeaderCellDef>Time</th>
          <td mat-cell *matCellDef="let appointment">
            {{ formatTime(appointment.time) }}
          </td>
        </ng-container>

        <ng-container matColumnDef="doctor">
          <th mat-header-cell *matHeaderCellDef>Doctor</th>
          <td mat-cell *matCellDef="let appointment">
            {{ appointment.doctorName }}
          </td>
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
          <td mat-cell *matCellDef="let appointment">
            <button mat-button color="warn" 
                    *ngIf="appointment.status !== 'cancelled'"
                    (click)="cancelAppointment(appointment.id)">
              Cancel
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>

      <div *ngIf="appointments().length === 0" class="no-appointments">
        <p>No appointments found. <a routerLink="/dashboard">Book your first appointment!</a></p>
      </div>
    </div>
  `,
  styleUrls: ['./appointments.component.scss']
})
export class AppointmentsComponent {
  private readonly appointmentService = inject(AppointmentService);
  private readonly snackBar = inject(MatSnackBar);

  readonly appointments = toSignal(
    this.appointmentService.getAppointments().pipe(
      map(appointments =>
        [...appointments].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      )
    ),
    { initialValue: [] as Appointment[] }
  );
  displayedColumns: string[] = ['date', 'time', 'doctor', 'status', 'actions'];

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

  getStatusColor(status: string): string {
    switch (status) {
      case 'confirmed': return 'primary';
      case 'pending': return 'accent';
      case 'cancelled': return 'warn';
      default: return '';
    }
  }

  cancelAppointment(id: number) {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      this.appointmentService.cancelAppointment(id).subscribe(success => {
        if (success) {
          this.snackBar.open('Appointment cancelled successfully', 'Close', { duration: 3000 });
        }
      });
    }
  }
}

