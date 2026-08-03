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
  
  console.log("Fetching all sessions...");
  const sessionsSnap = await getDocs(collection(db, 'sessions'));
  
  const studentNamesToFind = ['Lê Anh Khoa', 'Nguyễn Xuân Huy', 'Võ Quốc Huy'];
  
  const foundSessions = [];
  
  sessionsSnap.forEach(d => {
    const data = d.data();
    let hasTargetStudent = false;
    
    if (data.attendance) {
       const attArray = Array.isArray(data.attendance) ? data.attendance : Object.values(data.attendance);
       for (const att of attArray) {
           if (studentNamesToFind.some(name => att.studentName === name || att.fullName === name || att.name === name)) {
               hasTargetStudent = true;
               break;
           }
       }
    }
    
    if (hasTargetStudent) {
       foundSessions.push({ id: d.id, classId: data.classId, date: data.date, topic: data.topic, order: data.order, index: data.index });
    }
  });
  
  console.log(`Found ${foundSessions.length} sessions containing NPJ30 students.`);
  
  const byClassId = {};
  for (const s of foundSessions) {
     if (!byClassId[s.classId]) byClassId[s.classId] = 0;
     byClassId[s.classId]++;
  }
  
  console.log("Sessions grouped by classId:", byClassId);
}
run();
