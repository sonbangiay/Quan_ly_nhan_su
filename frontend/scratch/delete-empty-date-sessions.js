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
  
  let toDelete = [];
  
  snap.forEach(d => {
    const data = d.data();
    if (!data.date || data.date.trim() === '') {
       toDelete.push(d.id);
    }
  });
  
  console.log(`Found ${toDelete.length} sessions with empty dates to delete.`);
  
  for (const id of toDelete) {
    await deleteDoc(doc(db, 'sessions', id));
  }
  
  console.log('Successfully deleted all "Chưa xếp lịch" sessions.');
}

run();
