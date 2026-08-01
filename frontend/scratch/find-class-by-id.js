const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
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

const ids = [
  "36aca62f-a849-40eb-8bdf-0843ea79987a",
  "ee62a18a-3663-42f8-b29b-b3df8deb787f"
];

async function run() {
  try {
    console.log("Signing in...");
    await signInWithEmailAndPassword(auth, "test-antigravity@nhanphu.edu.vn", "testPassword123");
    console.log("Signed in successfully!");

    for (const id of ids) {
      console.log(`\nChecking ID: ${id}...`);
      
      const docActive = await getDoc(doc(db, 'classes', id));
      if (docActive.exists()) {
        console.log(`Found in ACTIVE classes:`, JSON.stringify(docActive.data(), null, 2));
      } else {
        console.log(`Not found in active classes.`);
      }

      const docTrash = await getDoc(doc(db, 'trash', `trash_${id}`));
      if (docTrash.exists()) {
        console.log(`Found in TRASH (trash_${id}):`, JSON.stringify(docTrash.data(), null, 2));
      } else {
        const docTrashClass = await getDoc(doc(db, 'trash', `trash_class_${id}`));
        if (docTrashClass.exists()) {
          console.log(`Found in TRASH (trash_class_${id}):`, JSON.stringify(docTrashClass.data(), null, 2));
        } else {
          console.log(`Not found in trash.`);
        }
      }
    }

  } catch (e) {
    console.error(e);
  }
}

run();
