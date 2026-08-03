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

    const classId = "75e3c127-c1b8-46cf-9bdc-cada410f633e";
    const q = query(collection(db, 'sessions'), where('classId', '==', classId));
    const snap = await getDocs(q);
    
    const sessions = [];
    snap.forEach(d => {
      sessions.push({ id: d.id, ...d.data() });
    });
    
    // Sort by index/order
    sessions.sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : a.index;
        const orderB = b.order !== undefined ? b.order : b.index;
        return orderA - orderB;
    });
    
    console.log(`Found ${sessions.length} active sessions for class NPJ30`);
    for (const s of sessions) {
      console.log(`Session ${s.order !== undefined ? s.order : s.index} (${s.id}) - Date: ${s.date} - Time: ${s.time} - Content: ${s.topic || s.content}`);
      const attendanceCount = s.attendance ? s.attendance.length : 0;
      console.log(`   -> Attendance count: ${attendanceCount}`);
    }

  } catch (e) {
    console.error(e);
  }
}

run();
