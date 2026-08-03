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
    await signInWithEmailAndPassword(auth, "test-antigravity@nhanphu.edu.vn", "testPassword123");

    const classId = "75e3c127-c1b8-46cf-9bdc-cada410f633e";
    const q = query(collection(db, 'sessions'), where('classId', '==', classId));
    const snap = await getDocs(q);
    
    let aug1Sessions = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.date && data.date.includes("2026-08-01")) {
         aug1Sessions.push(data);
      }
    });
    
    console.log(`Found ${aug1Sessions.length} sessions on August 1st.`);
    console.log(JSON.stringify(aug1Sessions, null, 2));

  } catch (e) {
    console.error(e);
  }
}

run();
