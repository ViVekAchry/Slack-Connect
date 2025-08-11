import express from 'express';
import dotenv from 'dotenv';
import https from 'https';
import fs from 'fs';
import cors from 'cors';

// Load environment variables first
dotenv.config();

// Routes
import authRoutes from './routes/auth';
import apiRoutes from './routes/messages';
import scheduleRoutes from './routes/schedule';
import channelsRoutes from './routes/channels';
import testRoutes from './routes/test'; // ✅ Import the new refresh-test route

// Scheduler
import scheduler from './utils/scheduler';

// Create Express app
const app = express();
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:4200', 'https://localhost:4200']
}));
// app.use(cors({ origin: ['http://localhost:4200','https://localhost:4200'] }));
// API Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api', channelsRoutes);
app.use('/api', testRoutes); // ✅ Mount the refresh-test route
app.use('/api/schedule', scheduleRoutes);

// Start scheduler AFTER routes are registered
scheduler.start();

// SSL certificates
const key = fs.readFileSync('./certs/key.pem');
const cert = fs.readFileSync('./certs/cert.pem');

// Start HTTPS server
https.createServer({ key, cert }, app).listen(4000, () => {
  console.log('✅ Backend running on https://localhost:4000');
  console.log('⏳ Scheduler started — checking every minute for due messages...');
});
