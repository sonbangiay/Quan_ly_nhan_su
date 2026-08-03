const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, deleteDoc } = require('firebase/firestore');
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
  
  const classId = '75e3c127-c1b8-46cf-9bdc-cada410f633e';
  const q = query(collection(db, 'sessions'), where('classId', '==', classId));
  const snap = await getDocs(q);
  
  let totalSessions = snap.size;
  let emptyDateSessions = [];
  
  snap.forEach(d => {
    const data = d.data();
    if (!data.date || data.date.trim() === '') {
       emptyDateSessions.push({ id: d.id, ...data });
    }
  });
  
  console.log(`Total sessions: ${totalSessions}`);
  console.log(`Sessions with empty date: ${emptyDateSessions.length}`);
  
  // Also print the first 5 to verify
  emptyDateSessions.slice(0, 5).forEach(s => {
      console.log(`- ID: ${s.id}, dayName: ${s.dayName}, topic: ${s.topic}`);
  });
}

run();
