// Usage: npm run create-admin -- "Full Name" admin@example.com
// The password is read from the ADMIN_PASSWORD env var or prompted for, never taken from the command line history.
const readline = require('readline');
const mongoose = require('mongoose');
const env = require('../config/env');
const { connectDb } = require('../config/db');
const User = require('../models/User');

const ask = (q) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(q, (a) => { rl.close(); resolve(a); });
});

(async () => {
  env.validate();
  const [name, email] = process.argv.slice(2);
  if (!name || !email) throw new Error('Usage: npm run create-admin -- "Full Name" email@example.com');
  const password = process.env.ADMIN_PASSWORD || (await ask('Password (min 8 characters): '));
  await connectDb();
  let user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    user.role = 'admin';
    user.isActive = true;
    console.log('User exists: promoting to admin and resetting password.');
  } else {
    user = new User({ name, email, role: 'admin' });
  }
  await user.setPassword(password);
  await user.save();
  console.log(`Admin ready: ${user.email}`);
  await mongoose.disconnect();
})().catch((err) => { console.error(err.message); process.exit(1); });
