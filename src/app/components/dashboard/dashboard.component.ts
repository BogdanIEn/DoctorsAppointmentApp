import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { DoctorsComponent } from '../doctors/doctors.component';
import { AppointmentsComponent } from '../appointments/appointments.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTabsModule,
    MatCardModule,
    DoctorsComponent,
    AppointmentsComponent
  ],
  template: `
    <div class="dashboard-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Medical Appointment System</mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <mat-tab-group animationDuration="300ms">
            <mat-tab label="Book Appointment">
              <app-doctors></app-doctors>
            </mat-tab>
            
            <mat-tab label="My Appointments">
              <app-appointments></app-appointments>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
}