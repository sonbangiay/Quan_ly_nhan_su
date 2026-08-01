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

// Student ID of Nguyễn Đình Nhật
const studentId = "143f77a1-bd72-495b-9d89-2e108ededf2c";

async function run() {
  try {
    console.log("Signing in...");
    await signInWithEmailAndPassword(auth, "test-antigravity@nhanphu.edu.vn", "testPassword123");
    console.log("Signed in successfully!");

    const sessionsSnap = await getDocs(collection(db, 'sessions'));
    console.log("Total sessions:", sessionsSnap.size);

    const classStats = {};
    let totalAttendanceRecords = 0;

    sessionsSnap.forEach(d => {
      const data = d.data();
      let attArray = data.attendance || [];
      if (attArray && attArray.attendance) attArray = attArray.attendance;
      if (!Array.isArray(attArray)) attArray = [];

      const record = attArray.find(a => a.studentId === studentId);
      if (record) {
        const cId = data.classId || 'undefined';
        if (!classStats[cId]) {
          classStats[cId] = [];
        }
        classStats[cId].push({
          sessionId: d.id,
          date: data.date,
          topic: data.topic,
          status: record.status
        });
        totalAttendanceRecords++;
      }
    });

    console.log(`Found ${totalAttendanceRecords} attendance records for Nguyễn Đình Nhật:`);
    for (const [cId, records] of Object.entries(classStats)) {
      console.log(`\nClass ID: ${cId} => Records count: ${records.length}`);
      // Print first 5 records as example
      records.slice(0, 5).forEach(r => {
        console.log(`  - Session: ${r.sessionId} | Date: ${r.date} | Topic: ${r.topic} | Status: ${r.status}`);
      });
    }

  } catch (e) {
    console.error(e);
  }
}

run();
