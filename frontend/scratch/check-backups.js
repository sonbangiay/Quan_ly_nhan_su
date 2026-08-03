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

async function run() {
  await signInWithEmailAndPassword(auth, 'test-antigravity@nhanphu.edu.vn', 'testPassword123');
  // Unfortunately Firestore Web SDK doesn't support listing collections easily.
  // But we can try to query likely backup collections.
  const collectionsToCheck = ['sessions_backup', 'backup_sessions', 'old_sessions', 'trash_backup'];
  for (const c of collectionsToCheck) {
      try {
          const snap = await getDocs(collection(db, c));
          console.log(`Collection ${c} size: ${snap.size}`);
      } catch (e) {
          console.log(`Collection ${c} error`);
      }
  }
}
run();
