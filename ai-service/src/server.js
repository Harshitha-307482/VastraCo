require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const aiController = require('./controllers/aiController');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());

// Dynamic CORS configurations
let corsOrigin = ['http://localhost:3000', 'http://frontend:80', '*'];
if (process.env.CORS_ALLOWED_ORIGINS) {
  if (process.env.CORS_ALLOWED_ORIGINS === '*') {
    corsOrigin = '*';
  } else {
    corsOrigin = process.env.CORS_ALLOWED_ORIGINS.split(',');
  }
}
app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(morgan('dev'));

// AI Routes
app.post('/api/ai/chat', aiController.chat);
app.post('/api/ai/preview', aiController.preview);

// Health Probes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ai-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/ready', (req, res) => {
  res.status(200).json({ status: 'ready' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong in AI Service!' });
});

app.listen(PORT, () => {
  console.log(`AI Service running on port ${PORT}`);
});
