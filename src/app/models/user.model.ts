// models/user.model.ts
export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'patient' | 'admin';
  password?: string;
}
