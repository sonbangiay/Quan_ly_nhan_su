const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc } = require('firebase/firestore');
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

const classId = "75e3c127-c1b8-46cf-9bdc-cada410f633e";

const targetStudentIds = [
  "0c74f057-9802-429b-a390-350004237a54", // Lê Diệu Thiện
  "143f77a1-bd72-495b-9d89-2e108ededf2c", // Nguyễn Đình Nhật
  "21571da1-288b-4a22-ac7e-6a1fb07c5c03", // Lê Anh Khoa
  "27726b75-8d92-479e-bf48-68f61c54ae28", // Nguyễn Thị Quỳnh Ý
  "5c623b79-f654-43aa-9e07-1ec4ca9daf8b", // Võ Quốc Huy
  "640983c3-92c0-4258-800c-d4d3145ab9bc", // Nguyễn Châu Tuấn
  "7b741ee3-fc88-4e27-b10c-cef64b544b11", // Nguyễn Đoàn Ngọc Trường
  "8335df98-58e4-4a34-8aa8-9e0ceba62beb", // Trần Thị Ánh Hồng
  "9802aa9c-d48a-495e-838e-cd85965e06c0", // Đào Quang Duy
  "aa3b8c9f-94e7-4b6a-ab94-d532e5f2651f", // Trần Thái Thiên
  "b52d898a-1849-4b2b-ab82-afc32add5940", // Mai Nguyễn Bích Truyền
  "de8e1030-1064-40bf-85c2-50ddffcae125", // Nguyễn Xuân Huy
  "f3227b78-4127-4db1-bfb2-4fff4ce27a27", // Võ Quang Huy
  "f3c981c5-7af6-403c-bb6a-8bf6720cfff5"  // Phan Thị Thanh Hoa
];

async function run() {
  try {
    console.log("Signing in...");
    await signInWithEmailAndPassword(auth, "test-antigravity@nhanphu.edu.vn", "testPassword123");
    console.log("Signed in successfully!");

    const studentList = [];
    for (const id of targetStudentIds) {
      const studentDoc = await getDoc(doc(db, 'students', id));
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        studentList.push({
          id: id,
          name: data.fullName || data.name || '',
          phone: data.phone || '',
          email: data.email || ''
        });
        console.log(`Fetched student: ${data.fullName || data.name}`);
      } else {
        console.log(`Student ID ${id} not found in DB!`);
      }
    }

    console.log(`Updating class ${classId} with ${studentList.length} students...`);
    await updateDoc(doc(db, 'classes', classId), {
      students: studentList
    });
    console.log("Update completed successfully!");

  } catch (e) {
    console.error(e);
  }
}

run();
