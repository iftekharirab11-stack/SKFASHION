const admin = require('firebase-admin');

// Path to your service account key
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://skfashion-6fdab-default-rtdb.firebaseio.com' // Replace with your database URL if using Realtime Database
});

const db = admin.firestore();

module.exports = { admin, db };