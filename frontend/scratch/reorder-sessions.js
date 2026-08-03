const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, updateDoc } = require('firebase/firestore');
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
  
  let sessions = [];
  snap.forEach(d => {
    sessions.push({ id: d.id, ...d.data() });
  });
  
  // Sort sessions by date (and time if available, or just topic to be stable)
  sessions.sort((a, b) => {
    const timeA = new Date(a.date || 0).getTime();
    const timeB = new Date(b.date || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;
    // Tie breaker: Sáng before Chiều
    const isMorningA = (a.topic && a.topic.includes('Sáng')) || (a.dayName && a.dayName.includes('Sáng'));
    const isMorningB = (b.topic && b.topic.includes('Sáng')) || (b.dayName && b.dayName.includes('Sáng'));
    if (isMorningA && !isMorningB) return -1;
    if (!isMorningA && isMorningB) return 1;
    return 0;
  });
  
  console.log(`Found ${sessions.length} sessions to reorder.`);
  
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    const order = i + 1;
    await updateDoc(doc(db, 'sessions', s.id), {
       order: order,
       index: order // Some components might use index, some use order
    });
    console.log(`Updated session ${s.id} to order ${order}`);
  }
  
  console.log('Successfully reordered all remaining sessions.');
}

run();
