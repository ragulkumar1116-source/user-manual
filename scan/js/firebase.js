import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set, get, child, remove, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// REPLACE THIS CONFIG WITH YOUR ACTUAL FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCfc7la06vL3yEN3vCZX5jctD4PjsEtK0g",
  authDomain: "aittest-9ec93.firebaseapp.com",
  projectId: "aittest-9ec93",
  storageBucket: "aittest-9ec93.firebasestorage.app",
  messagingSenderId: "628576595149",
  appId: "1:628576595149:web:00905b7b299dc275524d84",
  measurementId: "G-8QH3YFRCR0"
};

let app, db;
try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
} catch(e) {
    console.error("Firebase initialization failed.", e);
}

export { db, ref, onValue, set, get, child, remove, update };
