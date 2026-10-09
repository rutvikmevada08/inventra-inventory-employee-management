const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: '1mb' }));
if (env.nodeEnv !== 'test') app.use(morgan('dev'));

app.use('/api', routes);
app.use('/api', notFound);

// In production the built React app can be served by this same process.
const dist = path.join(__dirname, '..', 'frontend', 'dist');
if (env.nodeEnv === 'production' && fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(errorHandler);

module.exports = app;
