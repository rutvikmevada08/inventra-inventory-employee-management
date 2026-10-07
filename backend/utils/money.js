// Amounts are stored as rupees with two decimals. Every calculation is rounded
// at the point it is made so floating point noise never reaches the database.
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const round3 = (n) => Math.round((Number(n) + Number.EPSILON) * 1000) / 1000;
module.exports = { round2, round3 };
