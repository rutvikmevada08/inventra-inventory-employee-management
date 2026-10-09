const env = require('./config/env');
const { connectDb } = require('./config/db');

env.validate();
const app = require('./app');

connectDb()
  .then(() => {
    app.listen(env.port, () => console.log(`API listening on port ${env.port}`));
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  });
