import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from './services/auth.service';
import { User } from './models/user.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = toSignal<User | null>(this.authService.currentUser$, {
    initialValue: null
  });
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');
  readonly isDoctor = computed(() => this.currentUser()?.role === 'doctor');
  readonly userInitials = computed(() => {
    const user = this.currentUser();
    if (!user?.name) {
      return '';
    }
    return user.name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0]?.toUpperCase() ?? '')
      .slice(0, 2)
      .join('');
  });
  readonly currentYear = new Date().getFullYear();

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
