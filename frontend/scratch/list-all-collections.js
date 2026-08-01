const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyAHiL9n7wG7rSA9DIneQwCfh6lvXKjGofI",
  authDomain: "hrm-nhan-phu.firebaseapp.com",
  projectId: "hrm-nhan-phu",
  storageBucket: "hrm-nhan-phu.appspot.com",
  messagingSenderId: "623974736852",
  appId: "1:623974736852:web:007f7f29b885ccd958ac41",
  measurementId: "G-5ZP5B4H3KK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// In client SDK, we cannot easily list collections. But we can check known collections:
const collections = [
  "classes",
  "sessions",
  "enrollments",
  "students",
  "tests",
  "trash",
  "users",
  "audit_logs",
  "logs",
  "settings"
];

async function run() {
  try {
    console.log("Signing in...");
    await signInWithEmailAndPassword(auth, "test-antigravity@nhanphu.edu.vn", "testPassword123");
    console.log("Signed in successfully!");

    for (const name of collections) {
      try {
        const snap = await getDocs(collection(db, name));
        console.log(`Collection '${name}': ${snap.size} documents`);
      } catch (e) {
        console.log(`Collection '${name}' check failed: ${e.message}`);
      }
    }

  } catch (e) {
    console.error(e);
  }
}

run();
