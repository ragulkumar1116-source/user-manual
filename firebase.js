// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  push, 
  update, 
  remove, 
  onValue 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ⚠️ REPLACE THIS WITH YOUR FIREBASE CONFIGURATION OBJECT
const firebaseConfig = {
  apiKey: "AIzaSyCfc7la06vL3yEN3vCZX5jctD4PjsEtK0g",
  authDomain: "aittest-9ec93.firebaseapp.com",
  databaseURL: "https://aittest-9ec93-default-rtdb.firebaseio.com",
  projectId: "aittest-9ec93",
  storageBucket: "aittest-9ec93.firebasestorage.app",
  messagingSenderId: "628576595149",
  appId: "1:628576595149:web:00905b7b299dc275524d84",
  measurementId: "G-8QH3YFRCR0"
};

// Initialize Firebase App & Realtime Database
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 1. Add New Document
export function addDocument(data) {
  const docsRef = ref(db, 'documents');
  return push(docsRef, data);
}

// 2. Update Existing Document
export function updateDocument(key, data) {
  const docRef = ref(db, `documents/${key}`);
  return update(docRef, data);
}

// 3. Delete Document
export function deleteDocument(key) {
  const docRef = ref(db, `documents/${key}`);
  return remove(docRef);
}

// 4. Realtime Data Listener
export function listenToDocuments(callback) {
  const docsRef = ref(db, 'documents');
  onValue(docsRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  }, (error) => {
    console.error("Firebase fetch error:", error);
  });
}