import express from 'express';
import dotenv from 'dotenv';
import https from 'https';
import fs from 'fs';
import cors from 'cors';

dotenv.config();

import authRoutes from './routes/auth';
import apiRoutes from './routes/messages';
import scheduleRoutes from './routes/schedule';
import channelsRoutes from './routes/channels';
import testRoutes from './routes/test';
import scheduler from './utils/scheduler';

const app = express();
app.use(express.json());
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'https://localhost:4200']
}));

app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api', channelsRoutes);
app.use('/api', testRoutes);
app.use('/api/schedule', scheduleRoutes);

scheduler.start();

const PORT = Number(process.env.PORT) || 4000;
const useLocalHttps = process.env.LOCAL_HTTPS === 'true';

if (useLocalHttps) {
  const key = fs.readFileSync('./certs/key.pem');
  const cert = fs.readFileSync('./certs/cert.pem');
  https.createServer({ key, cert }, app).listen(PORT, () => {
    console.log(`✅ Backend (HTTPS) on https://localhost:${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`✅ Backend (HTTP) on port ${PORT}`);
  });
}
