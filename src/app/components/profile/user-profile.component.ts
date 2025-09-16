import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { AppointmentService } from '../../services/appointment.service';
import { User } from '../../models/user.model';
import { Appointment } from '../../models/appointment.model';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss'
})
export class UserProfileComponent {
  private readonly authService = inject(AuthService);
  private readonly appointmentService = inject(AppointmentService);
  private readonly appointmentsSignal = signal<Appointment[]>([]);

  readonly currentUser = toSignal<User | null>(this.authService.currentUser$, {
    initialValue: null
  });
  readonly profileUser = computed(() => this.currentUser() ?? this.authService.getCurrentUser());

  readonly appointmentStats = computed(() => {
    const appointments = this.appointmentsSignal();
    const confirmed = appointments.filter(a => a.status === 'confirmed');
    const upcoming = confirmed.filter(a => new Date(a.date) >= this.startOfToday());
    const cancelled = appointments.filter(a => a.status === 'cancelled');

    const nextAppointment = confirmed
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;

    return {
      total: appointments.length,
      upcoming: upcoming.length,
      cancelled: cancelled.length,
      next: nextAppointment
    };
  });

  constructor() {
    this.appointmentService.getAppointments()
      .pipe(takeUntilDestroyed())
      .subscribe(appointments => this.appointmentsSignal.set(appointments));
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0]?.toUpperCase() ?? '')
      .slice(0, 2)
      .join('');
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

  private startOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
}
