'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { authApi, classApi, crmApi, employeeApi, departmentApi, positionApi, initApi } from '@/lib/api'; // Old Google Sheets APIs
import axios from 'axios';

// Create a secondary app to create users without logging out the current admin
const firebaseConfig = {
  apiKey: "AIzaSyAHiL9n7wG7rSA9DIneQwCfh6lvXKjGofI",
  authDomain: "hrm-nhan-phu.firebaseapp.com",
  projectId: "hrm-nhan-phu",
  storageBucket: "hrm-nhan-phu.firebasestorage.app",
  messagingSenderId: "623974736852",
  appId: "1:623974736852:web:007f7f29b885ccd958ac41"
};

export default function MigrationPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
    console.log(msg);
  };

  const runMigration = async () => {
    if (!confirm('Bạn có chắc chắn muốn bắt đầu tiến trình Migration từ Google Sheets sang Firebase? (Thao tác này có thể mất vài phút)')) return;
    setIsMigrating(true);
    setLogs([]);
    
    try {
      addLog('Đang khởi tạo Secondary Firebase App để tạo tài khoản Auth...');
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);

      // 1. Fetch data from Google Sheets
      addLog('Đang kéo dữ liệu từ Google Sheets (Employees, Departments, Positions)...');
      
      // We use the existing API layer which handles proxying and authentication automatically
      const fetchApi = async (apiCall: Promise<any>) => {
        const res = await apiCall;
        return res.data?.data || res.data || [];
      };

      // Tải dữ liệu
      const employees = await fetchApi(employeeApi.getAll());
      const departments = await fetchApi(departmentApi.getAll());
      const positions = await fetchApi(positionApi.getAll());
      const leads = await fetchApi(crmApi.getLeads());
      
      // Classes & Students
      addLog('Đang kéo dữ liệu Lớp học và Học viên...');
      const initRes = await fetchApi(initApi.getClassesData());
      const { classes, students, alerts } = initRes;

      // 2. Migrate Departments
      addLog(`Bắt đầu đẩy ${departments.length} phòng ban lên Firestore...`);
      for (const dept of departments) {
        await setDoc(doc(db, 'departments', dept.id), dept);
      }

      // 3. Migrate Positions
      addLog(`Bắt đầu đẩy ${positions.length} chức vụ lên Firestore...`);
      for (const pos of positions) {
        await setDoc(doc(db, 'positions', pos.id), pos);
      }

      // 4. Migrate Employees & Create Auth
      addLog(`Bắt đầu tạo Auth và đẩy ${employees.length} nhân viên lên Firestore...`);
      let successCount = 0;
      for (const emp of employees) {
        try {
          // Chỉ tạo auth nếu có email
          let authUid = emp.id;
          if (emp.email) {
            try {
              // Mật khẩu mặc định là nhanphu@123
              const userCred = await createUserWithEmailAndPassword(secondaryAuth, emp.email, 'nhanphu@123');
              authUid = userCred.user.uid;
              addLog(`Đã tạo Auth cho: ${emp.email} (UID: ${authUid})`);
            } catch (authErr: any) {
              if (authErr.code === 'auth/email-already-in-use') {
                addLog(`Email ${emp.email} đã tồn tại trong Auth, bỏ qua tạo mới.`);
              } else {
                addLog(`Lỗi tạo Auth cho ${emp.email}: ${authErr.message}`);
              }
            }
          }
          
          // Đẩy vào Firestore collection 'employees'
          const empData = { ...emp, authUid };
          await setDoc(doc(db, 'employees', emp.id), empData);
          successCount++;
        } catch (e: any) {
          addLog(`Lỗi khi xử lý nhân viên ${emp.fullName}: ${e.message}`);
        }
      }
      addLog(`Hoàn tất đẩy ${successCount} nhân viên.`);

      // 5. Migrate Leads
      addLog(`Bắt đầu đẩy ${leads.length} leads lên Firestore...`);
      for (const lead of leads) {
        await setDoc(doc(db, 'leads', lead.id), lead);
      }

      // 6. Migrate Students
      addLog(`Bắt đầu đẩy ${students?.length || 0} học viên lên Firestore...`);
      if (students) {
        for (const stu of students) {
          await setDoc(doc(db, 'students', stu.id), stu);
        }
      }

      // 7. Migrate Classes (including enrollments & schedules as nested arrays to simplify NoSQL)
      addLog(`Bắt đầu đẩy ${classes?.length || 0} lớp học lên Firestore...`);
      if (classes) {
        for (const cls of classes) {
          await setDoc(doc(db, 'classes', cls.id), cls);
        }
      }
      
      // 8. Tuition Alerts
      addLog(`Bắt đầu đẩy ${alerts?.length || 0} cảnh báo học phí lên Firestore...`);
      if (alerts) {
        for (const al of alerts) {
          await setDoc(doc(db, 'tuitionAlerts', al.id), al);
        }
      }

      addLog('🎉 QUÁ TRÌNH MIGRATION HOÀN TẤT THÀNH CÔNG!');
      addLog('Mật khẩu đăng nhập mặc định cho tất cả nhân viên là: nhanphu@123');
      
    } catch (err: any) {
      addLog(`❌ LỖI NGHIÊM TRỌNG: ${err.message}`);
      console.error(err);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Migration Tool: Google Sheets -&gt; Firebase</h1>
      <p className="mb-6 text-gray-600">
        Công cụ này sẽ tự động tải dữ liệu từ Google Sheets cũ và đẩy toàn bộ lên Firestore,
        đồng thời tạo tài khoản Firebase Authentication cho các nhân sự có email.
      </p>

      <button 
        onClick={runMigration} 
        disabled={isMigrating}
        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow disabled:opacity-50"
        style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer' }}
      >
        {isMigrating ? 'Đang Migration...' : 'Bắt đầu Migration'}
      </button>

      <div className="mt-8 bg-gray-900 text-green-400 p-4 rounded-lg overflow-y-auto font-mono text-sm h-96" style={{ background: '#111', color: '#4ade80', padding: 16, borderRadius: 8, height: 400, overflowY: 'auto', fontFamily: 'monospace' }}>
        {logs.length === 0 && <span className="text-gray-500">Chưa có log nào. Bấm nút Bắt đầu.</span>}
        {logs.map((l, i) => (
          <div key={i} className="mb-1">{l}</div>
        ))}
      </div>
    </div>
  );
}
