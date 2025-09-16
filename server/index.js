const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3333;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

app.use(cors());
app.use(bodyParser.json());

function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    throw new Error('Database file not found.');
  }
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function sanitizeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

function nextId(collection, key) {
  collection.nextIds[key] = (collection.nextIds[key] || 1);
  const id = collection.nextIds[key];
  collection.nextIds[key] += 1;
  return id;
}

function ensureData() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  }
  if (!fs.existsSync(DB_FILE)) {
    const seed = {
      users: [
        { id: 1, name: 'Demo Admin', email: 'admin@demo.com', password: 'password123', phone: '+1234567890', role: 'admin' },
        { id: 2, name: 'Demo Patient', email: 'patient@demo.com', password: 'password123', phone: '+1987654321', role: 'patient' }
      ],
      doctors: [
        { id: 1, name: 'Dr. Sarah Wilson', specialty: 'Cardiology', experience: '15 years', rating: 4.8 },
        { id: 2, name: 'Dr. Michael Chen', specialty: 'Dermatology', experience: '12 years', rating: 4.7 },
        { id: 3, name: 'Dr. Emily Johnson', specialty: 'Pediatrics', experience: '18 years', rating: 4.9 },
        { id: 4, name: 'Dr. David Rodriguez', specialty: 'Orthopedics', experience: '20 years', rating: 4.6 },
        { id: 5, name: 'Dr. Lisa Anderson', specialty: 'Neurology', experience: '14 years', rating: 4.8 },
        { id: 6, name: 'Dr. James Thompson', specialty: 'Internal Medicine', experience: '16 years', rating: 4.7 }
      ],
      appointments: [
        {
          id: 1,
          userId: 2,
          doctorId: 1,
          doctorName: 'Dr. Sarah Wilson',
          date: new Date().toISOString().split('T')[0],
          time: '09:00',
          reason: 'Annual check-up',
          status: 'confirmed',
          createdAt: new Date().toISOString()
        }
      ],
      nextIds: {
        users: 3,
        doctors: 7,
        appointments: 2
      }
    };
    writeDb(seed);
  }
}

ensureData();

app.get('/api/users', (req, res) => {
  const db = readDb();
  res.json(db.users.map(sanitizeUser));
});

app.post('/api/users', (req, res) => {
  const db = readDb();
  const { name, email, phone, role = 'patient', password } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  const exists = db.users.some(user => user.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(409).json({ message: 'Email already exists.' });
  }

  const newUser = {
    id: nextId(db, 'users'),
    name,
    email,
    phone,
    role,
    password: password || 'password123'
  };

  db.users.push(newUser);
  writeDb(db);

  res.status(201).json(sanitizeUser(newUser));
});

app.put('/api/users/:id', (req, res) => {
  const db = readDb();
  const userId = Number(req.params.id);
  const index = db.users.findIndex(user => user.id === userId);
  if (index === -1) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const { email } = req.body;
  if (email) {
    const exists = db.users.some(user => user.email.toLowerCase() === email.toLowerCase() && user.id !== userId);
    if (exists) {
      return res.status(409).json({ message: 'Email already exists.' });
    }
  }

  db.users[index] = {
    ...db.users[index],
    ...req.body,
    password: req.body.password ? req.body.password : db.users[index].password
  };

  writeDb(db);
  res.json(sanitizeUser(db.users[index]));
});

app.delete('/api/users/:id', (req, res) => {
  const db = readDb();
  const userId = Number(req.params.id);
  const index = db.users.findIndex(user => user.id === userId);
  if (index === -1) {
    return res.status(404).json({ message: 'User not found.' });
  }

  db.users.splice(index, 1);
  db.appointments = db.appointments.filter(appointment => appointment.userId !== userId);
  writeDb(db);
  res.status(204).end();
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDb();
  const user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase() && u.password === password);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  res.json(sanitizeUser(user));
});

app.post('/api/auth/register', (req, res) => {
  const db = readDb();
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  const exists = db.users.some(user => user.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(409).json({ message: 'Email already exists.' });
  }

  const newUser = {
    id: nextId(db, 'users'),
    name,
    email,
    phone,
    password,
    role: 'patient'
  };

  db.users.push(newUser);
  writeDb(db);

  res.status(201).json(sanitizeUser(newUser));
});

app.get('/api/doctors', (req, res) => {
  const db = readDb();
  res.json(db.doctors);
});

app.post('/api/doctors', (req, res) => {
  const db = readDb();
  const { name, specialty, experience, rating } = req.body;

  if (!name || !specialty || !experience || rating === undefined) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  const newDoctor = {
    id: nextId(db, 'doctors'),
    name,
    specialty,
    experience,
    rating: Number(rating)
  };

  db.doctors.push(newDoctor);
  writeDb(db);
  res.status(201).json(newDoctor);
});

app.put('/api/doctors/:id', (req, res) => {
  const db = readDb();
  const doctorId = Number(req.params.id);
  const index = db.doctors.findIndex(doc => doc.id === doctorId);
  if (index === -1) {
    return res.status(404).json({ message: 'Doctor not found.' });
  }

  db.doctors[index] = {
    ...db.doctors[index],
    ...req.body,
    rating: req.body.rating !== undefined ? Number(req.body.rating) : db.doctors[index].rating
  };

  writeDb(db);
  res.json(db.doctors[index]);
});

app.delete('/api/doctors/:id', (req, res) => {
  const db = readDb();
  const doctorId = Number(req.params.id);
  const index = db.doctors.findIndex(doc => doc.id === doctorId);
  if (index === -1) {
    return res.status(404).json({ message: 'Doctor not found.' });
  }

  db.doctors.splice(index, 1);
  writeDb(db);
  res.status(204).end();
});

function hasAppointmentConflict(db, doctorId, date, time, ignoreId) {
  return db.appointments.some(appointment =>
    appointment.id !== ignoreId &&
    appointment.doctorId === doctorId &&
    appointment.date === date &&
    appointment.time === time &&
    appointment.status !== 'cancelled'
  );
}

app.get('/api/appointments', (req, res) => {
  const db = readDb();
  const { userId } = req.query;
  let result = db.appointments;
  if (userId) {
    const id = Number(userId);
    result = result.filter(appointment => appointment.userId === id);
  }
  res.json(result);
});

app.post('/api/appointments', (req, res) => {
  const db = readDb();
  const { userId, doctorId, doctorName, date, time, reason, status = 'confirmed' } = req.body;

  if (!userId || !doctorId || !doctorName || !date || !time || !reason) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  if (hasAppointmentConflict(db, doctorId, date, time)) {
    return res.status(409).json({ message: 'Slot already booked.' });
  }

  const newAppointment = {
    id: nextId(db, 'appointments'),
    userId,
    doctorId,
    doctorName,
    date,
    time,
    reason,
    status,
    createdAt: new Date().toISOString()
  };

  db.appointments.push(newAppointment);
  writeDb(db);
  res.status(201).json(newAppointment);
});

app.put('/api/appointments/:id', (req, res) => {
  const db = readDb();
  const appointmentId = Number(req.params.id);
  const index = db.appointments.findIndex(apt => apt.id === appointmentId);
  if (index === -1) {
    return res.status(404).json({ message: 'Appointment not found.' });
  }

  const existing = db.appointments[index];
  const updated = {
    ...existing,
    ...req.body
  };

  if (hasAppointmentConflict(db, updated.doctorId, updated.date, updated.time, appointmentId)) {
    return res.status(409).json({ message: 'Slot already booked.' });
  }

  db.appointments[index] = updated;
  writeDb(db);
  res.json(updated);
});

app.delete('/api/appointments/:id', (req, res) => {
  const db = readDb();
  const appointmentId = Number(req.params.id);
  const index = db.appointments.findIndex(apt => apt.id === appointmentId);
  if (index === -1) {
    return res.status(404).json({ message: 'Appointment not found.' });
  }

  db.appointments.splice(index, 1);
  writeDb(db);
  res.status(204).end();
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Unexpected server error.' });
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
