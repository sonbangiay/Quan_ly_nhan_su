const { initializeApp } = require('firebase/app');
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

async function run() {
  const userCred = await signInWithEmailAndPassword(auth, 'test-antigravity@nhanphu.edu.vn', 'testPassword123');
  const token = await userCred.user.getIdToken();
  
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery`;
  
  // We cannot list collections via REST easily without Google Auth (Service Account).
  // The REST API listCollectionIds requires the Google Cloud OAuth2 token, not Firebase Auth token.
  // But we can try to fetch a known document and see what happens, or just attempt a bad query to see if it leaks collections.
  
  // Let's try to query 'sessions' to see if there's any other session
  
  console.log("No way to list collections with just Firebase Auth Token via REST API.");
  console.log("This means if there's a backup collection, we can't find its name unless we guess it.");
}
run();
