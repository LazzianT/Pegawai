const express = require('express');
const userRoutes = require('./src/routes/userRoutes');
const cutiRoutes = require('./src/routes/cutiRoutes');
const izinRoutes = require('./src/routes/izinRoutes');
const notifikasiRoutes = require('./src/routes/notifikasiRoutes');
const travelRoutes = require('./src/routes/travelRoutes');
const announcementRoutes = require('./src/routes/announcementRoutes');
const deviceTokenRoutes = require('./src/routes/deviceTokenRoutes');
const securityRoutes = require('./src/routes/securityRoutes');
const { startTravelAutoCloseScheduler } = require('./src/services/travelAutoCloseService');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use('/api/user', userRoutes);
app.use('/api/cuti', cutiRoutes);
app.use('/api/izin', izinRoutes);
app.use('/api/notifikasi', notifikasiRoutes);
app.use('/api/travel', travelRoutes);
app.use('/api/pengumuman', announcementRoutes);
app.use('/api/device', deviceTokenRoutes);
app.use('/api/security', securityRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  startTravelAutoCloseScheduler();
  console.log(`Server running on port ${PORT}`);
});