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
  try {
    console.log("Signing in...");
    await signInWithEmailAndPassword(auth, "test-antigravity@nhanphu.edu.vn", "testPassword123");
    console.log("Signed in successfully!");

    const trashSnap = await getDocs(collection(db, 'trash'));
    console.log("Total items in trash:", trashSnap.size);
    trashSnap.forEach(d => {
      const data = d.data();
      console.log(`Document ID: ${d.id}`);
      console.log(`  - Type: ${data.type}`);
      console.log(`  - Name: ${data.name}`);
      console.log(`  - DeletedAt: ${data.deletedAt}`);
      console.log(`  - Data keys: ${Object.keys(data.data || {})}`);
    });

  } catch (e) {
    console.error(e);
  }
}

run();
