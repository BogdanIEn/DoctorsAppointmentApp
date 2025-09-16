import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { AppointmentService } from '../../services/appointment.service';
import { DoctorService } from '../../services/doctor.service';
import { Doctor } from '../../models/doctor.model';
import { User } from '../../models/user.model';
import { Appointment } from '../../models/appointment.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly appointmentService = inject(AppointmentService);
  private readonly doctorService = inject(DoctorService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly users = toSignal(this.authService.getUsers(), { initialValue: [] as User[] });
  readonly appointments = toSignal(this.appointmentService.getAllAppointments(), { initialValue: [] as Appointment[] });
  readonly doctors = toSignal(this.doctorService.getDoctors(), { initialValue: [] as Doctor[] });

  readonly roles: Array<User['role']> = ['patient', 'doctor', 'admin'];
  readonly statuses: Array<Appointment['status']> = ['pending', 'confirmed', 'cancelled'];

  readonly selectedUserId = signal<number | null>(null);
  readonly selectedAppointmentId = signal<number | null>(null);
  readonly selectedDoctorId = signal<number | null>(null);

  readonly userForm = this.fb.group({
    name: ['', Validators.required],
    doctorId: [null as number | null],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    role: ['patient', Validators.required],
    password: ['']
  });

  readonly appointmentForm = this.fb.group({
    userId: [null as number | null, Validators.required],
    doctorId: [null as number | null, Validators.required],
    date: ['', Validators.required],
    time: ['', Validators.required],
    reason: ['', Validators.required],
    status: ['pending', Validators.required]
  });

  readonly doctorForm = this.fb.group({
    name: ['', Validators.required],
    specialty: ['', Validators.required],
    experience: ['', Validators.required],
    rating: [4.5, [Validators.required, Validators.min(0), Validators.max(5)]]
  });

  constructor() {
    const roleControl = this.userForm.get('role');
    roleControl?.valueChanges.subscribe(role => this.handleRoleChange(role as User['role']));
    this.handleRoleChange(roleControl?.value as User['role']);
  }

  get userList(): User[] {
    return this.users();
  }

  get appointmentList(): Appointment[] {
    return this.appointments();
  }

  get doctorList(): Doctor[] {
    return this.doctors();
  }

  get isEditingUser(): boolean {
    return this.selectedUserId() !== null;
  }

  get isEditingAppointment(): boolean {
    return this.selectedAppointmentId() !== null;
  }

  get isEditingDoctor(): boolean {
    return this.selectedDoctorId() !== null;
  }

  getUserName(userId: number): string {
    return this.users().find(user => user.id === userId)?.name ?? 'Unknown';
  }

  private handleRoleChange(role: User['role'] | null) {
    const nameControl = this.userForm.get('name');
    const doctorControl = this.userForm.get('doctorId');

    if (!nameControl || !doctorControl) {
      return;
    }

    if (role === 'doctor') {
      if (nameControl.enabled) {
        nameControl.disable({ emitEvent: false });
      }
      nameControl.setValidators(null);
      doctorControl.enable({ emitEvent: false });
      doctorControl.setValidators([Validators.required]);
      this.syncDoctorNameFromSelection(doctorControl.value as number | null);
    } else {
      if (!nameControl.enabled) {
        nameControl.enable({ emitEvent: false });
      }
      nameControl.setValidators([Validators.required]);
      doctorControl.setValidators(null);
      doctorControl.setErrors(null);
      doctorControl.setValue(null, { emitEvent: false });
      doctorControl.disable({ emitEvent: false });
    }

    nameControl.updateValueAndValidity({ emitEvent: false });
    doctorControl.updateValueAndValidity({ emitEvent: false });
  }

  private syncDoctorNameFromSelection(doctorId: number | null) {
    const nameControl = this.userForm.get('name');
    if (!nameControl) {
      return;
    }

    const doctor = doctorId !== null
      ? this.doctorList.find(d => d.id === doctorId)
      : null;
    const doctorName = doctor ? doctor.name : '';
    nameControl.setValue(doctorName, { emitEvent: false });
  }

  onDoctorSelectionChange(doctorId: number | null) {
    this.syncDoctorNameFromSelection(doctorId);
  }

  startNewUser() {
    this.selectedUserId.set(null);
    this.userForm.reset({
      name: '',
      email: '',
      phone: '',
      role: 'patient',
      password: '',
      doctorId: null
    });

    this.handleRoleChange(this.userForm.get('role')?.value as User['role']);
  }

  editUser(user: User) {
    this.selectedUserId.set(user.id);
    const matchedDoctor = user.role === 'doctor'
      ? this.doctorList.find(doctor => doctor.name.trim().toLowerCase() === user.name.trim().toLowerCase())
      : null;
    this.userForm.reset({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      password: '',
      doctorId: matchedDoctor?.id ?? null
    });

    if (user.role === 'doctor') {
      this.syncDoctorNameFromSelection(matchedDoctor?.id ?? null);
    }

    this.handleRoleChange(user.role);
  }

  saveUser() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const value = this.userForm.getRawValue();
    const cleanPassword = value.password?.trim();
    const role = (value.role ?? 'patient') as User['role'];

    if (role === 'doctor') {
      const doctorId = value.doctorId ?? null;
      if (doctorId === null) {
        const doctorControl = this.userForm.get('doctorId');
        doctorControl?.setErrors({ required: true });
        doctorControl?.markAsTouched();
        return;
      }

      const doctor = this.doctorList.find(d => d.id === doctorId);
      if (!doctor) {
        this.snackBar.open('Selected doctor profile is no longer available.', 'Close', { duration: 3000 });
        return;
      }

      value.name = doctor.name;
    }

    const payload: Omit<User, 'id'> = {
      name: (value.name ?? '').trim(),
      email: value.email!,
      phone: value.phone!,
      role,
      password: cleanPassword ? cleanPassword : undefined
    };

    const selectedId = this.selectedUserId();
    if (selectedId !== null) {
      this.authService.updateUser(selectedId, payload).subscribe(result => {
        if (result) {
          this.snackBar.open('User updated successfully', 'Close', { duration: 2500 });
          this.startNewUser();
        } else {
          this.snackBar.open('Could not update user (email may already exist)', 'Close', { duration: 3000 });
        }
      });
    } else {
      this.authService.createUser(payload).subscribe(result => {
        if (result) {
          this.snackBar.open('User created successfully', 'Close', { duration: 2500 });
          this.startNewUser();
        } else {
          this.snackBar.open('Could not create user (email may already exist)', 'Close', { duration: 3000 });
        }
      });
    }
  }

  deleteUser(user: User) {
    if (confirm(`Delete ${user.name}? This action cannot be undone.`)) {
      this.authService.deleteUser(user.id).subscribe(success => {
        if (success) {
          this.snackBar.open('User deleted', 'Close', { duration: 2000 });
          if (this.selectedUserId() === user.id) {
            this.startNewUser();
          }
        }
      });
    }
  }

  startNewAppointment() {
    this.selectedAppointmentId.set(null);
    this.appointmentForm.reset({ status: 'pending' });
  }

  editAppointment(appointment: Appointment) {
    this.selectedAppointmentId.set(appointment.id);
    this.appointmentForm.reset({
      userId: appointment.userId,
      doctorId: appointment.doctorId,
      date: appointment.date,
      time: appointment.time,
      reason: appointment.reason,
      status: appointment.status
    });
  }

  saveAppointment() {
    if (this.appointmentForm.invalid) {
      this.appointmentForm.markAllAsTouched();
      return;
    }

    const value = this.appointmentForm.value;
    const status = (value.status ?? 'confirmed') as Appointment['status'];
    const doctor = this.doctors().find(d => d.id === value.doctorId!);
    const doctorName = doctor ? doctor.name : 'Unknown Doctor';
    const payload = {
      doctorId: value.doctorId!,
      doctorName,
      date: value.date!,
      time: value.time!,
      reason: value.reason!,
      status
    };

    const selectedId = this.selectedAppointmentId();
    if (selectedId !== null) {
      this.appointmentService.updateAppointment(selectedId, {
        userId: value.userId!,
        ...payload
      }).subscribe(result => {
        if (result) {
          this.snackBar.open('Appointment updated', 'Close', { duration: 2500 });
          this.startNewAppointment();
        } else {
          this.snackBar.open('Could not update appointment (slot may be taken)', 'Close', { duration: 3000 });
        }
      });
    } else {
      this.appointmentService.createAppointmentForUser(value.userId!, payload).subscribe(result => {
        if (result) {
          this.snackBar.open('Appointment created', 'Close', { duration: 2500 });
          this.startNewAppointment();
        } else {
          this.snackBar.open('Could not create appointment (slot may be taken)', 'Close', { duration: 3000 });
        }
      });
    }
  }

  deleteAppointment(appointment: Appointment) {
    if (confirm('Delete this appointment?')) {
      this.appointmentService.deleteAppointment(appointment.id).subscribe(success => {
        if (success) {
          this.snackBar.open('Appointment deleted', 'Close', { duration: 2000 });
          if (this.selectedAppointmentId() === appointment.id) {
            this.startNewAppointment();
          }
        }
      });
    }
  }

  startNewDoctor() {
    this.selectedDoctorId.set(null);
    this.doctorForm.reset({ rating: 4.5 });
  }

  editDoctor(doctor: Doctor) {
    this.selectedDoctorId.set(doctor.id);
    this.doctorForm.reset({
      name: doctor.name,
      specialty: doctor.specialty,
      experience: doctor.experience,
      rating: doctor.rating
    });
  }

  saveDoctor() {
    if (this.doctorForm.invalid) {
      this.doctorForm.markAllAsTouched();
      return;
    }

    const value = this.doctorForm.value;
    const payload: Omit<Doctor, 'id'> = {
      name: value.name!,
      specialty: value.specialty!,
      experience: value.experience!,
      rating: Number(value.rating ?? 0)
    };

    const selectedId = this.selectedDoctorId();
    if (selectedId !== null) {
      this.doctorService.updateDoctor(selectedId, payload).subscribe(result => {
        if (result) {
          this.snackBar.open('Doctor updated', 'Close', { duration: 2500 });
          this.startNewDoctor();
        } else {
          this.snackBar.open('Could not update doctor', 'Close', { duration: 3000 });
        }
      });
    } else {
      this.doctorService.createDoctor(payload).subscribe(() => {
        this.snackBar.open('Doctor added', 'Close', { duration: 2500 });
        this.startNewDoctor();
      });
    }
  }

  deleteDoctor(doctor: Doctor) {
    if (confirm(`Remove ${doctor.name}?`)) {
      this.doctorService.deleteDoctor(doctor.id).subscribe(success => {
        if (success) {
          this.snackBar.open('Doctor removed', 'Close', { duration: 2000 });
          if (this.selectedDoctorId() === doctor.id) {
            this.startNewDoctor();
          }
        }
      });
    }
  }
}
