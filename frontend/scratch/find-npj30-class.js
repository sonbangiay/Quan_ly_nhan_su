const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query } = require('firebase/firestore');
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

    const classesSnap = await getDocs(collection(db, 'classes'));
    classesSnap.forEach(d => {
      const data = d.data();
      if (data.className && data.className.includes("NPJ30")) {
        console.log(`Found class: ${data.className} (ID: ${d.id})`);
        console.log(`Instructor: ${data.instructorName}`);
      }
    });

  } catch (e) {
    console.error(e);
  }
}

run();
