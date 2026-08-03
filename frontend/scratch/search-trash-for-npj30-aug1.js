const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
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

    const trashSnap = await getDocs(query(collection(db, 'trash'), where('type', '==', 'session')));
    console.log("Total session items in trash:", trashSnap.size);
    trashSnap.forEach(d => {
      const data = d.data();
      const sessionData = data.data || {};
      const deletedAt = data.deletedAt;
      
      // Filter for items deleted around August 1st 2026
      if (deletedAt && deletedAt.includes("2026-08-01")) {
          console.log(`Document ID: ${d.id}`);
          console.log(`  - DeletedAt: ${deletedAt}`);
          console.log(`  - Class ID: ${sessionData.classId}`);
          console.log(`  - Session Date: ${sessionData.date}`);
          console.log(`  - Session Index: ${sessionData.index}`);
          console.log(`  - Session ID: ${sessionData.id}`);
      }
    });

  } catch (e) {
    console.error(e);
  }
}

run();
