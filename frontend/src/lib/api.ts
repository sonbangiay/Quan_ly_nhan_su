import { db, auth } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateEmail, updatePassword } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';

// Secondary app to create users without logging out the current admin
const secondaryApp = initializeApp({
  apiKey: "AIzaSyAHiL9n7wG7rSA9DIneQwCfh6lvXKjGofI",
  authDomain: "hrm-nhan-phu.firebaseapp.com",
  projectId: "hrm-nhan-phu",
  storageBucket: "hrm-nhan-phu.firebasestorage.app",
  messagingSenderId: "623974736852",
  appId: "1:623974736852:web:007f7f29b885ccd958ac41"
}, "SecondaryAPI");
const secondaryAuth = getAuth(secondaryApp);

// Helper to mimic Axios response structure since components expect `res.data`
const toRes = (data: any) => ({ data });

// ---------------------------------------------------------
// Auth (Handled by AuthContext directly now, but keeping stubs if needed)
export const authApi = {
  login: async () => { throw new Error("Use AuthContext for login"); },
  refreshToken: async () => { throw new Error("Use AuthContext for refresh"); },
  changePassword: async () => { throw new Error("Use AuthContext for change password"); },
  updateCredentials: async (newEmail?: string, newPassword?: string) => {
    const user = auth.currentUser;
    if (!user) throw { response: { data: { error: 'Chưa đăng nhập' } } };
    try {
      if (newEmail && newEmail !== user.email) {
        await updateEmail(user, newEmail);
      }
      if (newPassword) {
        await updatePassword(user, newPassword);
      }
      return toRes({ success: true });
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        throw { response: { data: { error: 'requires-recent-login' } } };
      }
      throw { response: { data: { error: error.message || 'Lỗi cập nhật tài khoản' } } };
    }
  },
  register: async (data: any) => {
    try {
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
      const id = uuidv4();
      const empData = {
        ...data,
        id,
        authUid: userCred.user.uid,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      delete empData.password;
      await setDoc(doc(db, 'employees', id), empData);
      return toRes({ success: true, user: empData });
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        throw { response: { data: { error: 'Email này đã tồn tại! (Do tài khoản đăng nhập cũ vẫn còn lưu trong hệ thống bảo mật). Vui lòng dùng Email khác.' } } };
      }
      throw { response: { data: { error: error.message || 'Lỗi tạo tài khoản Auth' } } };
    }
  },
};

// ---------------------------------------------------------
// Dashboard
export const dashboardApi = {
  getSummary: async () => {
    // Basic stub - in a real app, you aggregate data here.
    return toRes({});
  },
  getKpiChart: async () => toRes([]),
  getLeadFunnel: async () => toRes([]),
  getLeaderboard: async () => toRes([]),
  getRevenueForecast: async () => toRes([]),
  getDailyActivities: async () => toRes([]),
};

// ---------------------------------------------------------
// Employees
export const employeeApi = {
  getAll: async (departmentId?: string) => {
    let q = collection(db, 'employees');
    if (departmentId) q = query(q, where('departmentId', '==', departmentId)) as any;
    const snap = await getDocs(q);
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  },
  getMe: async () => toRes({}), // handled by auth context
  getById: async (id: string) => {
    const d = await getDoc(doc(db, 'employees', id));
    return toRes(d.exists() ? { id: d.id, ...d.data() } : null);
  },
  update: async (id: string, data: any) => {
    await updateDoc(doc(db, 'employees', id), data);
    return toRes({ success: true });
  },
  delete: async (id: string) => {
    await deleteDoc(doc(db, 'employees', id));
    return toRes({ success: true });
  },
};

// ---------------------------------------------------------
// Departments
export const departmentApi = {
  getAll: async () => {
    const snap = await getDocs(collection(db, 'departments'));
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  },
  getById: async (id: string) => {
    const d = await getDoc(doc(db, 'departments', id));
    return toRes(d.exists() ? { id: d.id, ...d.data() } : null);
  },
  create: async (data: any) => {
    const id = uuidv4();
    await setDoc(doc(db, 'departments', id), { id, ...data, createdAt: new Date().toISOString() });
    return toRes({ success: true, id });
  },
  update: async (id: string, data: any) => {
    await updateDoc(doc(db, 'departments', id), data);
    return toRes({ success: true });
  },
  delete: async (id: string) => {
    await deleteDoc(doc(db, 'departments', id));
    return toRes({ success: true });
  },
};

// ---------------------------------------------------------
// Positions
export const positionApi = {
  getAll: async () => {
    const snap = await getDocs(collection(db, 'positions'));
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  },
  create: async (data: any) => {
    const id = uuidv4();
    await setDoc(doc(db, 'positions', id), { id, ...data, createdAt: new Date().toISOString() });
    return toRes({ success: true, id });
  },
  update: async (id: string, data: any) => {
    await updateDoc(doc(db, 'positions', id), data);
    return toRes({ success: true });
  },
  delete: async (id: string) => {
    await deleteDoc(doc(db, 'positions', id));
    return toRes({ success: true });
  },
};

// ---------------------------------------------------------
// CRM Leads
export const crmApi = {
  getLeads: async (params?: { status?: string; ownerId?: string }) => {
    const snap = await getDocs(collection(db, 'leads'));
    let data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    if (params?.status) data = data.filter(l => l.status === params.status);
    if (params?.ownerId) data = data.filter(l => l.ownerId === params.ownerId);
    return toRes(data);
  },
  getLeadById: async (id: string) => {
    const d = await getDoc(doc(db, 'leads', id));
    return toRes(d.exists() ? { id: d.id, ...d.data() } : null);
  },
  createLead: async (data: any) => {
    const id = uuidv4();
    await setDoc(doc(db, 'leads', id), { id, status: 'New', ...data, createdAt: new Date().toISOString() });
    return toRes({ success: true, id });
  },
  updateLead: async (id: string, data: any) => {
    await updateDoc(doc(db, 'leads', id), data);
    return toRes({ success: true });
  },
  deleteLead: async (id: string) => {
    await deleteDoc(doc(db, 'leads', id));
    return toRes({ success: true });
  },
  addActivity: async (leadId: string, data: any) => {
    const d = await getDoc(doc(db, 'leads', leadId));
    if (d.exists()) {
      const lead = d.data();
      const logs = lead.activityLogs || [];
      
      logs.push({
        id: uuidv4(),
        content: data.content,
        timestamp: new Date().toISOString(),
        employeeName: data.employeeName || 'Nhân viên'
      });
      
      // Sắp xếp lại log mới nhất lên đầu (hoặc tuỳ UI)
      logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      await updateDoc(doc(db, 'leads', leadId), { activityLogs: logs });
    }
    return toRes({ success: true });
  },
  importLeads: async (data: { leads: any[], employeeIds: string[] }) => {
    const { leads, employeeIds } = data;
    if (!leads || leads.length === 0) return toRes({ success: true });
    
    for (let i = 0; i < leads.length; i++) {
      const id = uuidv4();
      const ownerId = employeeIds.length > 0 ? employeeIds[i % employeeIds.length] : undefined;
      await setDoc(doc(db, 'leads', id), {
        id,
        status: 'New',
        ownerId,
        ...leads[i],
        createdAt: new Date().toISOString()
      });
    }
    return toRes({ success: true });
  },
  deleteAllLeads: async () => {
    const snap = await getDocs(collection(db, 'leads'));
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
    return toRes({ success: true });
  },
};

// ---------------------------------------------------------
// Classes
export const classApi = {
  getAll: async () => {
    const snap = await getDocs(collection(db, 'classes'));
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  },
  getById: async (id: string) => {
    const d = await getDoc(doc(db, 'classes', id));
    return toRes(d.exists() ? { id: d.id, ...d.data() } : null);
  },
  getByInstructor: async (instructorId: string) => {
    const q = query(collection(db, 'classes'), where('instructorId', '==', instructorId));
    const snap = await getDocs(q);
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  },
  create: async (data: any) => {
    const id = uuidv4();
    await setDoc(doc(db, 'classes', id), { 
      id, 
      createdAt: new Date().toISOString(), 
      enrollments: [], 
      students: [], 
      schedules: [],
      ...data 
    });
    return toRes({ success: true, id });
  },
  updateClass: async (id: string, data: any) => {
    await updateDoc(doc(db, 'classes', id), data);
    return toRes({ success: true });
  },
  deleteClass: async (id: string) => {
    const classDoc = await getDoc(doc(db, 'classes', id));
    if (classDoc.exists()) {
      await setDoc(doc(db, 'trash', `trash_class_${id}`), {
        id: `trash_class_${id}`,
        type: 'class',
        name: `Lớp học: ${classDoc.data().className}`,
        deletedAt: new Date().toISOString(),
        data: { id, ...classDoc.data() }
      });
    }
    await deleteDoc(doc(db, 'classes', id));
    return toRes({ success: true });
  },
  assignInstructor: async (id: string, instructorId: string, instructorName?: string) => {
    await updateDoc(doc(db, 'classes', id), { instructorId, instructorName: instructorName || null });
    return toRes({ success: true });
  },
  // We keep the rest of class API as stubs or basic implementations for now.
  // In a real scenario, you'd update the specific arrays within the class doc.
  enrollStudent: async (classId: string, data: any) => {
    const classRef = doc(db, 'classes', classId);
    const classDoc = await getDoc(classRef);
    if (!classDoc.exists()) throw new Error('Lớp học không tồn tại');
    const classData = classDoc.data();
    
    let expiresAt = null;
    if (classData.isOnlineCourse) {
      const days = classData.accessDurationDays || 365;
      const d = new Date();
      d.setDate(d.getDate() + days);
      expiresAt = d.toISOString();
    }
    
    const newEnrollment = { id: uuidv4(), classId, studentId: data.studentId, studentName: data.fullName, ...data, expiresAt, createdAt: new Date().toISOString() };
    const newStudent = { id: data.studentId, fullName: data.fullName, phone: data.phone, email: data.email };
    
    await updateDoc(classRef, {
      enrollments: [...(classData.enrollments || []), newEnrollment],
      students: [...(classData.students || []).filter((s:any) => s.id !== data.studentId), newStudent]
    });
    return toRes({ success: true, id: newEnrollment.id });
  },
  updateEnrollment: async (enrollmentId: string, data: any) => {
    // We must find which class has this enrollment. This is inefficient but works for now.
    const classesSnap = await getDocs(collection(db, 'classes'));
    for (const d of classesSnap.docs) {
      const cls = d.data();
      const enrollments = cls.enrollments || [];
      const idx = enrollments.findIndex((e: any) => e.id === enrollmentId);
      if (idx !== -1) {
        enrollments[idx] = { ...enrollments[idx], ...data };
        await updateDoc(d.ref, { enrollments });
        return toRes({ success: true });
      }
    }
    return toRes({ success: false });
  },
  getElearningProgress: async (classId: string, studentId: string) => {
    const id = `${classId}_${studentId}`;
    const snap = await getDoc(doc(db, 'elearning_progress', id));
    if (snap.exists()) return toRes(snap.data());
    return toRes({ id, classId, studentId, progress: [] });
  },
  getAllElearningProgress: async (classId: string) => {
    const q = query(collection(db, 'elearning_progress'), where('classId', '==', classId));
    const snap = await getDocs(q);
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  },
  updateElearningProgress: async (classId: string, studentId: string, progress: string[]) => {
    const id = `${classId}_${studentId}`;
    await setDoc(doc(db, 'elearning_progress', id), { id, classId, studentId, progress, updatedAt: new Date().toISOString() });
    return toRes({ success: true });
  },
  deleteEnrollment: async (enrollmentId: string) => {
    const classesSnap = await getDocs(collection(db, 'classes'));
    for (const d of classesSnap.docs) {
      const cls = d.data();
      const enrollments = cls.enrollments || [];
      const idx = enrollments.findIndex((e: any) => e.id === enrollmentId);
      if (idx !== -1) {
        const enrollment = enrollments[idx];
        const studentId = enrollment.studentId;
        
        await setDoc(doc(db, 'trash', `trash_enroll_${enrollmentId}`), {
          id: `trash_enroll_${enrollmentId}`,
          type: 'enrollment',
          name: `Hủy ghi danh học viên: Khôi phục ${enrollment.studentName || 'Học viên'} vào lớp ${cls.className}`,
          deletedAt: new Date().toISOString(),
          data: {
            classId: d.id,
            enrollment: enrollment,
            studentObj: cls.students?.find((s: any) => s.id === studentId) || { id: studentId, fullName: enrollment.studentName }
          }
        });

        enrollments.splice(idx, 1);
        
        // Also remove from students array if no other enrollments for this student in this class
        let students = cls.students || [];
        if (!enrollments.some((e: any) => e.studentId === studentId)) {
          students = students.filter((s: any) => s.id !== studentId);
        }
        
        await updateDoc(d.ref, { enrollments, students });
        return toRes({ success: true });
      }
    }
    return toRes({ success: false });
  },
  getTuitionAlerts: async () => {
    const snap = await getDocs(collection(db, 'tuitionAlerts'));
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  },
  getStudents: async () => {
    const snap = await getDocs(collection(db, 'students'));
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  },
  createStudent: async (data: any) => {
    const id = uuidv4();
    await setDoc(doc(db, 'students', id), { id, ...data, createdAt: new Date().toISOString() });
    return toRes({ success: true, id });
  },
  updateStudent: async (studentId: string, data: any) => {
    await updateDoc(doc(db, 'students', studentId), data);
    return toRes({ success: true });
  },
  deleteStudent: async (studentId: string) => {
    const studentDoc = await getDoc(doc(db, 'students', studentId));
    if (studentDoc.exists()) {
      const classesSnap = await getDocs(collection(db, 'classes'));
      const studentEnrollments: any[] = [];
      classesSnap.forEach(d => {
        const cls = d.data();
        const enrolls = cls.enrollments || [];
        const match = enrolls.filter((e: any) => e.studentId === studentId);
        if (match.length > 0) {
          studentEnrollments.push({ classId: d.id, enrollments: match });
        }
      });

      await setDoc(doc(db, 'trash', `trash_student_${studentId}`), {
        id: `trash_student_${studentId}`,
        type: 'student',
        name: `Học viên: ${studentDoc.data().fullName || studentDoc.data().name}`,
        deletedAt: new Date().toISOString(),
        data: {
          student: { id: studentId, ...studentDoc.data() },
          enrollments: studentEnrollments
        }
      });
    }
    await deleteDoc(doc(db, 'students', studentId));
    return toRes({ success: true });
  },
  bulkDeleteStudents: async (ids: string[]) => {
    for (const id of ids) {
      await classApi.deleteStudent(id);
    }
    return toRes({ success: true });
  },
  bulkDeleteEnrollments: async (ids: string[]) => {
    for (const id of ids) {
      await classApi.deleteEnrollment(id);
    }
    return toRes({ success: true });
  },
  
  // Sessions & Attendance
  getSessions: async (classId: string) => {
    const snap = await getDocs(query(collection(db, 'sessions'), where('classId', '==', classId)));
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }));
  },
  createSession: async (classId: string, data: any) => {
    const id = uuidv4();
    await setDoc(doc(db, 'sessions', id), { id, classId, ...data, createdAt: new Date().toISOString() });
    return toRes({ success: true, id });
  },
  createSessionBulk: async (classId: string, sessions: any[]) => {
    for (const s of sessions) {
      const id = uuidv4();
      await setDoc(doc(db, 'sessions', id), { id, classId, ...s, createdAt: new Date().toISOString() });
    }
    return toRes({ success: true });
  },
  deleteSession: async (sessionId: string) => {
    const sessionRef = doc(db, 'sessions', sessionId);
    const snap = await getDoc(sessionRef);
    if (snap.exists()) {
      const data = snap.data();
      await setDoc(doc(db, 'trash', `trash_session_${sessionId}`), {
        id: `trash_session_${sessionId}`,
        type: 'session',
        name: `Buổi học ngày ${data.date || 'chưa xếp lịch'} - ${data.topic || 'Không có chủ đề'}`,
        deletedAt: new Date().toISOString(),
        classId: data.classId,
        data: data
      });
      await deleteDoc(sessionRef);
    }
    return toRes({ success: true });
  },
  updateSession: async (sessionId: string, data: any) => {
    await updateDoc(doc(db, 'sessions', sessionId), data);
    return toRes({ success: true });
  },
  deleteAllSessions: async (classId: string) => {
    const snap = await getDocs(query(collection(db, 'sessions'), where('classId', '==', classId)));
    for (const d of snap.docs) {
      const data = d.data();
      await setDoc(doc(db, 'trash', `trash_session_${d.id}`), {
        id: `trash_session_${d.id}`,
        type: 'session',
        name: `Buổi học ngày ${data.date || 'chưa xếp lịch'} - ${data.topic || 'Không có chủ đề'}`,
        deletedAt: new Date().toISOString(),
        classId: classId,
        data: data
      });
      await deleteDoc(d.ref);
    }
    return toRes({ success: true });
  },
  getDeletedSessions: async (classId: string) => {
    const snap = await getDocs(query(collection(db, 'trash'), where('classId', '==', classId), where('type', '==', 'session')));
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  },
  saveAttendance: async (sessionId: string, data: any) => {
    await updateDoc(doc(db, 'sessions', sessionId), { attendance: data });
    return toRes({ success: true });
  },
  
  getTests: async (classId: string) => {
    const snap = await getDocs(query(collection(db, 'tests'), where('classId', '==', classId)));
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  },
  createTest: async (classId: string, data: any) => {
    const id = uuidv4();
    await setDoc(doc(db, 'tests', id), { id, classId, ...data, createdAt: new Date().toISOString() });
    return toRes({ success: true, id });
  },
  deleteTest: async (testId: string) => {
    await deleteDoc(doc(db, 'tests', testId));
    return toRes({ success: true });
  },
  saveTestScores: async (testId: string, scores: any[]) => {
    await updateDoc(doc(db, 'tests', testId), { scores });
    return toRes({ success: true });
  },
  getTestById: async (testId: string) => {
    const d = await getDoc(doc(db, 'tests', testId));
    if (!d.exists()) throw new Error('Test not found');
    return toRes({ id: d.id, ...d.data() });
  },
  updateTest: async (testId: string, data: any) => {
    await updateDoc(doc(db, 'tests', testId), data);
    return toRes({ success: true });
  },
  submitOnlineTest: async (testId: string, studentId: string, score: number, submissionData: any) => {
    // get test to update scores array
    const testDoc = await getDoc(doc(db, 'tests', testId));
    if (!testDoc.exists()) throw new Error('Test not found');
    const testData = testDoc.data();
    let scores = testData.scores || [];
    
    // Check if student already submitted
    const existingIndex = scores.findIndex((s: any) => s.studentId === studentId);
    if (existingIndex >= 0) {
      scores[existingIndex] = { ...scores[existingIndex], score, submissionData, submittedAt: new Date().toISOString() };
    } else {
      scores.push({ studentId, score, submissionData, submittedAt: new Date().toISOString(), feedback: '' });
    }
    
    await updateDoc(doc(db, 'tests', testId), { scores });
    return toRes({ success: true, score });
  },
  splitClass: async (sourceClassId: string, targetClassId: string, studentIds: string[], mergeDuplicates: boolean = false) => {
    // 1. Move enrollments and students from source class to target class
    const sourceRef = doc(db, 'classes', sourceClassId);
    const targetRef = doc(db, 'classes', targetClassId);

    const sourceDoc = await getDoc(sourceRef);
    const targetDoc = await getDoc(targetRef);

    if (!sourceDoc.exists() || !targetDoc.exists()) {
      throw new Error('Không tìm thấy lớp học nguồn hoặc lớp học đích');
    }

    const sourceData = sourceDoc.data();
    const targetData = targetDoc.data();

    let sourceEnrollments = sourceData.enrollments || [];
    let sourceStudents = sourceData.students || [];

    let targetEnrollments = targetData.enrollments || [];
    let targetStudents = targetData.students || [];

    // Filter out student details and enrollments from source class
    const transferringEnrollments = sourceEnrollments.filter((e: any) => studentIds.includes(e.studentId));

    // Save backup to trash for potential undo/restore operations
    const splitId = uuidv4();
    const studentNames = sourceData.students
      .filter((s: any) => studentIds.includes(s.id))
      .map((s: any) => s.fullName || s.name)
      .join(', ');
      
    await setDoc(doc(db, 'trash', `trash_split_${splitId}`), {
      id: `trash_split_${splitId}`,
      type: 'split',
      name: `Tách lớp: Chuyển ${studentIds.length} học viên [${studentNames}] từ ${sourceData.className} sang ${targetData.className}`,
      deletedAt: new Date().toISOString(),
      data: {
        sourceClassId,
        targetClassId,
        studentIds,
        originalSourceEnrollments: transferringEnrollments,
        mergeDuplicates
      }
    });
    
    sourceEnrollments = sourceEnrollments.filter((e: any) => !studentIds.includes(e.studentId));
    sourceStudents = sourceStudents.filter((s: any) => !studentIds.includes(s.id));

    // Update target class enrollments and students
    transferringEnrollments.forEach((oldEnrollment: any) => {
      const isAlreadyEnrolled = targetEnrollments.some((e: any) => e.studentId === oldEnrollment.studentId);
      
      if (!isAlreadyEnrolled) {
        // Create new enrollment for target class
        const newEnrollment = {
          ...oldEnrollment,
          id: uuidv4(),
          classId: targetClassId,
          createdAt: new Date().toISOString()
        };
        targetEnrollments.push(newEnrollment);

        // Find student in source students list to add to target
        const studentObj = sourceData.students.find((s: any) => s.id === oldEnrollment.studentId);
        if (studentObj && !targetStudents.some((s: any) => s.id === studentObj.id)) {
          targetStudents.push(studentObj);
        }
      }
    });

    // Save classes
    await updateDoc(sourceRef, { enrollments: sourceEnrollments, students: sourceStudents });
    await updateDoc(targetRef, { enrollments: targetEnrollments, students: targetStudents });

    // 2. Migrate Attendance (Sessions)
    // Get all sessions for source and target
    const sourceSessionsSnap = await getDocs(query(collection(db, 'sessions'), where('classId', '==', sourceClassId)));
    const targetSessionsSnap = await getDocs(query(collection(db, 'sessions'), where('classId', '==', targetClassId)));

    const sourceSessions = sourceSessionsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    const targetSessions = targetSessionsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Match sessions by index i
    const minSessionsLen = Math.min(sourceSessions.length, targetSessions.length);
    for (let i = 0; i < minSessionsLen; i++) {
      const sSess: any = sourceSessions[i];
      const tSess: any = targetSessions[i];

      const sAtt = sSess.attendance || [];
      const tAtt = tSess.attendance || [];

      // For each student, find their attendance in source session i and migrate to target session i
      let updatedTargetAtt = [...tAtt];
      studentIds.forEach(studentId => {
        const studentRecordSource = sAtt.find((a: any) => a.studentId === studentId);
        if (studentRecordSource) {
          const studentRecordTargetIndex = updatedTargetAtt.findIndex((a: any) => a.studentId === studentId);
          
          if (studentRecordTargetIndex >= 0) {
            // Student has attendance in both source and target sessions
            if (mergeDuplicates) {
              const recordTarget = updatedTargetAtt[studentRecordTargetIndex];
              // Merge rules: Present > AbsentExcused > Absent > empty
              let finalStatus = recordTarget.status;
              let finalExcusedReason = recordTarget.excusedReason || '';
              
              if (studentRecordSource.status === 'Present' || recordTarget.status === 'Present') {
                finalStatus = 'Present';
              } else if (studentRecordSource.status === 'AbsentExcused' || recordTarget.status === 'AbsentExcused') {
                finalStatus = 'AbsentExcused';
                finalExcusedReason = recordTarget.excusedReason || studentRecordSource.excusedReason || '';
              } else if (studentRecordSource.status === 'Absent' || recordTarget.status === 'Absent') {
                finalStatus = 'Absent';
              }

              updatedTargetAtt[studentRecordTargetIndex] = {
                ...recordTarget,
                status: finalStatus,
                excusedReason: finalExcusedReason,
                checkInTime: recordTarget.checkInTime || studentRecordSource.checkInTime || null
              };
            }
          } else {
            // Not in target session yet, simply add it
            updatedTargetAtt.push({
              ...studentRecordSource,
              sessionId: tSess.id
            });
          }
        }
      });

      // Update target session document
      await updateDoc(doc(db, 'sessions', tSess.id), { attendance: updatedTargetAtt });

      // Clean up source session (remove the student's attendance records)
      const updatedSourceAtt = sAtt.filter((a: any) => !studentIds.includes(a.studentId));
      await updateDoc(doc(db, 'sessions', sSess.id), { attendance: updatedSourceAtt });
    }

    // 3. Migrate Tests
    const sourceTestsSnap = await getDocs(query(collection(db, 'tests'), where('classId', '==', sourceClassId)));
    const targetTestsSnap = await getDocs(query(collection(db, 'tests'), where('classId', '==', targetClassId)));

    const sourceTests = sourceTestsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });

    const targetTests = targetTestsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });

    // Match tests by index i
    const minTestsLen = Math.min(sourceTests.length, targetTests.length);
    for (let i = 0; i < minTestsLen; i++) {
      const sTest: any = sourceTests[i];
      const tTest: any = targetTests[i];

      const sScores = sTest.scores || [];
      const tScores = tTest.scores || [];

      let updatedTargetScores = [...tScores];
      studentIds.forEach(studentId => {
        const scoreRecordSource = sScores.find((sc: any) => sc.studentId === studentId);
        if (scoreRecordSource) {
          const scoreRecordTargetIndex = updatedTargetScores.findIndex((sc: any) => sc.studentId === studentId);
          
          if (scoreRecordTargetIndex >= 0) {
            if (mergeDuplicates) {
              const recordTarget = updatedTargetScores[scoreRecordTargetIndex];
              // Merge rules: take higher score, combine feedbacks
              const finalScore = Math.max(Number(recordTarget.score || 0), Number(scoreRecordSource.score || 0));
              let finalFeedback = recordTarget.feedback || '';
              if (scoreRecordSource.feedback) {
                finalFeedback = finalFeedback 
                  ? `${finalFeedback} | Lớp cũ: ${scoreRecordSource.feedback}` 
                  : scoreRecordSource.feedback;
              }
              updatedTargetScores[scoreRecordTargetIndex] = {
                ...recordTarget,
                score: finalScore,
                feedback: finalFeedback,
                submittedAt: recordTarget.submittedAt || scoreRecordSource.submittedAt || new Date().toISOString()
              };
            }
          } else {
            updatedTargetScores.push(scoreRecordSource);
          }
        }
      });

      // Update target test document
      await updateDoc(doc(db, 'tests', tTest.id), { scores: updatedTargetScores });

      // Clean up source test document
      const updatedSourceScores = sScores.filter((sc: any) => !studentIds.includes(sc.studentId));
      await updateDoc(doc(db, 'tests', sTest.id), { scores: updatedSourceScores });
    }

    // 4. Migrate E-learning Progress
    for (const studentId of studentIds) {
      const sourceProgressId = `${sourceClassId}_${studentId}`;
      const targetProgressId = `${targetClassId}_${studentId}`;

      const sourceProgressSnap = await getDoc(doc(db, 'elearning_progress', sourceProgressId));
      const targetProgressSnap = await getDoc(doc(db, 'elearning_progress', targetProgressId));

      if (sourceProgressSnap.exists()) {
        const sourceProgressData = sourceProgressSnap.data();
        let finalProgress = sourceProgressData.progress || [];

        if (targetProgressSnap.exists() && mergeDuplicates) {
          const targetProgressData = targetProgressSnap.data();
          const targetProgress = targetProgressData.progress || [];
          // Merge unique progress values
          finalProgress = [...new Set([...finalProgress, ...targetProgress])];
        }

        await setDoc(doc(db, 'elearning_progress', targetProgressId), {
          ...sourceProgressData,
          id: targetProgressId,
          classId: targetClassId,
          progress: finalProgress,
          updatedAt: new Date().toISOString()
        });

        // Delete source progress document
        await deleteDoc(doc(db, 'elearning_progress', sourceProgressId));
      }
    }

    return toRes({ success: true });
  }
};

// ---------------------------------------------------------
// Init API (crucial for initial page loads)
export const initApi = {
  getClassesData: async () => {
    const classesSnap = await getDocs(collection(db, 'classes'));
    const studentsSnap = await getDocs(collection(db, 'students'));
    const employeesSnap = await getDocs(collection(db, 'employees'));
    const alertsSnap = await getDocs(collection(db, 'tuitionAlerts'));
    
    return toRes({
      classes: classesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      students: studentsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      employees: employeesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      alerts: alertsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    });
  },
  getEmployeesData: async () => {
    const emps = await getDocs(collection(db, 'employees'));
    const depts = await getDocs(collection(db, 'departments'));
    const pos = await getDocs(collection(db, 'positions'));
    return toRes({
      employees: emps.docs.map(d => ({ id: d.id, ...d.data() })),
      departments: depts.docs.map(d => ({ id: d.id, ...d.data() })),
      positions: pos.docs.map(d => ({ id: d.id, ...d.data() }))
    });
  },
  getDepartmentsData: async () => {
    const depts = await getDocs(collection(db, 'departments'));
    const emps = await getDocs(collection(db, 'employees'));
    return toRes({
      departments: depts.docs.map(d => ({ id: d.id, ...d.data() })),
      employees: emps.docs.map(d => ({ id: d.id, ...d.data() }))
    });
  },
  getDashboardData: async () => {
    // 1. Employees
    const empSnap = await getDocs(collection(db, 'employees'));
    const employees = empSnap.docs.map(d => d.data());
    const totalEmployees = employees.filter(e => e.isActive !== false).length;
    
    // 2. Attendance
    const today = new Date().toISOString().split('T')[0];
    const attSnap = await getDocs(query(collection(db, 'attendance'), where('date', '==', today)));
    const checkedInToday = attSnap.size;
    const attendanceRate = totalEmployees > 0 ? Math.round((checkedInToday / totalEmployees) * 100) : 0;
    
    // 3. Leads (new this week)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const leadsSnap = await getDocs(collection(db, 'leads'));
    const leads = leadsSnap.docs.map(d => d.data());
    const newLeadsThisWeek = leads.filter(l => new Date(l.createdAt || l.updatedAt || new Date()) >= sevenDaysAgo).length;
    
    // 4. Leave Requests (pending)
    const leaveSnap = await getDocs(query(collection(db, 'leaveRequests'), where('status', '==', 'Pending')));
    const pendingLeaveRequests = leaveSnap.size;
    
    // 5. KPIs
    const kpiSnap = await getDocs(collection(db, 'kpis'));
    const kpis = kpiSnap.docs.map(d => d.data());
    const totalProgress = kpis.reduce((acc: number, k: any) => acc + (Number(k.progress) || 0), 0);
    const avgKpiProgress = kpis.length > 0 ? Math.round(totalProgress / kpis.length) : 0;

    // KPI Chart Data
    const kpiChart = kpis.slice(0, 5).map(k => ({ employee: k.employeeName || 'Nhân viên', targets: [{ targetName: k.title, targetValue: 100, currentValue: k.progress || 0, unit: '%', progress: k.progress || 0 }] }));

    // Lead Funnel
    const funnelCounts = leads.reduce((acc: any, l: any) => {
       const status = l.status || 'New';
       acc[status] = (acc[status] || 0) + 1;
       return acc;
    }, {});
    const leadFunnel = Object.keys(funnelCounts).map(k => ({ status: k, count: funnelCounts[k] }));
    
    // Dept Stats
    const deptsSnap = await getDocs(collection(db, 'departments'));
    const departmentStats = deptsSnap.docs.map(d => {
      const dept = d.data();
      const count = employees.filter(e => e.departmentId === d.id).length;
      return { name: dept.name, count };
    });

    return toRes({
      summary: { role: 'Admin', totalEmployees, checkedInToday, attendanceRate, newLeadsThisWeek, pendingLeaveRequests, avgKpiProgress, departmentStats },
      kpiChart,
      leadFunnel,
      revenueForecast: null,
      dailyActivities: []
    });
  },
  getStudentDashboardData: async (phone: string) => {
    const stuSnap = await getDocs(query(collection(db, 'students'), where('phone', '==', phone)));
    if (stuSnap.empty) throw new Error('Student not found');
    const studentId = stuSnap.docs[0].id;
    
    const classesSnap = await getDocs(collection(db, 'classes'));
    const enrolledClasses = [];
    for (const d of classesSnap.docs) {
      const classData = d.data();
      const enrollments = classData.enrollments || [];
      const myEnrollment = enrollments.find((e: any) => e.studentId === studentId);
      if (myEnrollment) {
        const sessSnap = await getDocs(query(collection(db, 'sessions'), where('classId', '==', d.id)));
        const testsSnap = await getDocs(query(collection(db, 'tests'), where('classId', '==', d.id)));
        enrolledClasses.push({
          id: d.id,
          ...classData,
          enrollment: myEnrollment,
          sessions: sessSnap.docs.map(s => ({ id: s.id, ...s.data() })),
          tests: testsSnap.docs.map(t => ({ id: t.id, ...t.data() }))
        });
      }
    }
    return toRes({ enrolledClasses });
  },
};

// Other modules migrated to Firestore
export const workPlanApi = {
  getPlans: async (week?: any, year?: any) => {
    const snap = await getDocs(collection(db, 'workPlans'));
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  },
  getMyPlan: async (week?: any, year?: any, employeeId?: any) => {
    const q = query(collection(db, 'workPlans'), where('employeeId', '==', employeeId || ''));
    const snap = await getDocs(q);
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  },
  savePlan: async (data: any) => {
    const id = data.id || uuidv4();
    await setDoc(doc(db, 'workPlans', id), { ...data, id, updatedAt: new Date().toISOString() });
    return toRes({ success: true, id });
  },
  updateItem: async (planId: string, itemId: string, data: any) => {
    const d = await getDoc(doc(db, 'workPlans', planId));
    if (d.exists()) {
      const plan = d.data();
      const items = plan.items || [];
      const idx = items.findIndex((i:any) => i.id === itemId);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...data };
        await updateDoc(doc(db, 'workPlans', planId), { items });
      }
    }
    return toRes({ success: true });
  },
  deleteItem: async (planId: string, itemId: string) => {
    const d = await getDoc(doc(db, 'workPlans', planId));
    if (d.exists()) {
      const plan = d.data();
      const items = (plan.items || []).filter((i:any) => i.id !== itemId);
      await updateDoc(doc(db, 'workPlans', planId), { items });
    }
    return toRes({ success: true });
  },
  addFeedback: async (planId: string, text: string) => {
    await updateDoc(doc(db, 'workPlans', planId), { adminFeedback: text });
    return toRes({ success: true });
  },
};

export const reportApi = {
  getDailyReports: async (params?: any) => {
    const snap = await getDocs(collection(db, 'dailyReports'));
    let data = snap.docs.map(d => ({ ...d.data(), id: d.id })) as any[];
    if (params?.date) data = data.filter(r => r.date === params.date);
    if (params?.employeeId) data = data.filter(r => r.employeeId === params.employeeId);
    return toRes(data);
  },
  createDailyReport: async (data: any) => {
    const id = uuidv4();
    await setDoc(doc(db, 'dailyReports', id), { ...data, id, createdAt: new Date().toISOString() });
    return toRes({ success: true });
  },
  getWeeklyReports: async () => {
    const snap = await getDocs(collection(db, 'weeklyReports'));
    return toRes(snap.docs.map(d => ({ ...d.data(), id: d.id })));
  },
  createWeeklyReport: async (data: any) => {
    const id = uuidv4();
    await setDoc(doc(db, 'weeklyReports', id), { ...data, id, createdAt: new Date().toISOString() });
    return toRes({ success: true });
  },
  addDailyFeedback: async (reportId: string, text: string) => {
    await updateDoc(doc(db, 'dailyReports', reportId), { adminFeedback: text });
    return toRes({ success: true });
  },
  addWeeklyFeedback: async (reportId: string, data: any) => {
    const d = await getDoc(doc(db, 'weeklyReports', reportId));
    if (d.exists()) {
      const feedbacks = [...(d.data().feedbacks || []), { id: uuidv4(), createdAt: new Date().toISOString(), ...data }];
      await updateDoc(doc(db, 'weeklyReports', reportId), { feedbacks });
    }
    return toRes({ success: true });
  },
};

export const kpiApi = {
  getKpis: async (period?: string) => {
    const snap = await getDocs(collection(db, 'kpis'));
    let kpis = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    if (period) kpis = kpis.filter((k: any) => k.period === period);
    return toRes(kpis);
  },
  createKpi: async (data: any) => {
    const id = uuidv4();
    await setDoc(doc(db, 'kpis', id), {
      id,
      ...data,
      currentValue: 0,      // Khoi tao gia tri hien tai = 0
      createdAt: new Date().toISOString()
    });
    return toRes({ success: true });
  },
  updateValue: async (id: string, currentValue: number) => {
    await updateDoc(doc(db, 'kpis', id), { currentValue });
    return toRes({ success: true });
  },
  deleteKpi: async (id: string) => {
    await deleteDoc(doc(db, 'kpis', id));
    return toRes({ success: true });
  },
};

export const attendanceApi = {
  getAttendanceLogs: async (params?: any) => {
    let q = collection(db, 'attendance');
    const snap = await getDocs(q);
    let logs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    if (params?.startDate) logs = logs.filter(l => l.date >= params.startDate);
    if (params?.endDate) logs = logs.filter(l => l.date <= params.endDate);
    if (params?.employeeId) logs = logs.filter(l => l.employeeId === params.employeeId);
    return toRes(logs);
  },
  getTodayStatus: async (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const snap = await getDocs(query(collection(db, 'attendance'), where('employeeId', '==', employeeId), where('date', '==', today)));
    if (!snap.empty) {
      const d = snap.docs[0];
      return toRes({ id: d.id, ...d.data() });
    }
    return toRes({});
  },
  checkIn: async (data: any) => {
    const id = uuidv4();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Không làm việc chủ nhật (0)
    if (now.getDay() === 0) {
      throw { response: { data: { error: 'Hôm nay là Chủ nhật, không có ca làm việc.' } } };
    }
    
    const timeIn = now.toLocaleTimeString('vi-VN', { hour12: false });
    const h = now.getHours();
    const m = now.getMinutes();
    
    // Giờ làm việc: 07:30 - 17:00
    const isLate = (h > 7) || (h === 7 && m > 30);
    const status = isLate ? 'Late' : 'Present';

    await setDoc(doc(db, 'attendance', id), { 
      id, 
      date: today, 
      timeIn, 
      status, 
      employeeId: data.employeeId, 
      employeeName: data.employeeName || '',
      createdAt: now.toISOString() 
    });
    return toRes({ success: true });
  },
  checkOut: async (attendanceId: string, data: any) => {
    await updateDoc(doc(db, 'attendance', attendanceId), { 
      timeOut: new Date().toLocaleTimeString('vi-VN', { hour12: false }), 
      ...data 
    });
    return toRes({ success: true });
  },
  updateLog: async (id: string, data: any) => {
    await updateDoc(doc(db, 'attendance', id), data);
    return toRes({ success: true });
  },
};

export const leaveApi = {
  getRequests: async () => {
    const snap = await getDocs(collection(db, 'leaveRequests'));
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  },
  submitRequest: async (data: any) => {
    const id = uuidv4();
    await setDoc(doc(db, 'leaveRequests', id), { id, status: 'Pending', ...data, createdAt: new Date().toISOString() });
    return toRes({ success: true });
  },
  approveRequest: async (id: string, data: any) => {
    await updateDoc(doc(db, 'leaveRequests', id), { ...data, updatedAt: new Date().toISOString() });
    return toRes({ success: true });
  },
  deleteRequest: async (id: string) => {
    await deleteDoc(doc(db, 'leaveRequests', id));
    return toRes({ success: true });
  },
};

export const notificationApi = {
  getNotifications: async () => {
    const snap = await getDocs(collection(db, 'notifications'));
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  },
  markAsRead: async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { isRead: true });
    return toRes({ success: true });
  },
  createNotification: async (data: any) => {
    const id = uuidv4();
    await setDoc(doc(db, 'notifications', id), { id, isRead: false, ...data, createdAt: new Date().toISOString() });
    return toRes({ success: true });
  },
};

// ---------------------------------------------------------
// Chat & Omnichannel
export const chatApi = {
  getConversations: async () => {
    const snap = await getDocs(collection(db, 'conversations'));
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()));
  },
  getMessages: async (conversationId: string) => {
    const q = query(collection(db, 'messages'), where('conversationId', '==', conversationId));
    const snap = await getDocs(q);
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
  },
  sendMessage: async (conversationId: string, messageText: string, senderId: string, senderName: string, platform?: string, imageUrl?: string) => {
    if (platform === 'Zalo') {
      const res = await fetch('/api/zalo/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: conversationId, text: messageText, userId: senderId, userName: senderName, imageUrl: imageUrl })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      return toRes({ success: true });
    }

    // Default Facebook / internal fallback
    const msgId = uuidv4();
    const msgData = {
      id: msgId,
      conversationId,
      text: messageText,
      imageUrl: imageUrl || '',
      senderId,
      senderName,
      type: 'outbound',
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'messages', msgId), msgData);
    
    // Update conversation lastMessage
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: messageText,
      lastMessageTime: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return toRes({ success: true, message: msgData });
  },
  markAsRead: async (conversationId: string) => {
    await updateDoc(doc(db, 'conversations', conversationId), { unreadCount: 0 });
    return toRes({ success: true });
  }
};

export const auditLogApi = {
  getLogs: async (filters?: any) => toRes([]),
};
export const aiApi = {
  getDailyBrief: async () => toRes({ message: "Chào bạn, hệ thống Firebase đã sẵn sàng." }),
};
export const studentAuthApi = {
  login: async (data: any) => {
    const { phone, password } = data;
    if (password !== 'NhanPhu2026') {
      throw { response: { data: { error: 'Mật khẩu không chính xác' } } };
    }
    
    // Normalize phone to check multiple formats (with 0, without 0, with +84)
    const normalizedPhone = phone.replace(/^(\+84|84)/, '0');
    const phoneWithoutZero = normalizedPhone.startsWith('0') ? normalizedPhone.slice(1) : normalizedPhone;
    const phoneWithZero = `0${phoneWithoutZero}`;
    const phoneWith84 = `84${phoneWithoutZero}`;
    const phoneWithPlus84 = `+84${phoneWithoutZero}`;
    
    const phoneVariants = [phone, normalizedPhone, phoneWithoutZero, phoneWithZero, phoneWith84, phoneWithPlus84];
    // Remove duplicates
    const uniqueVariants = Array.from(new Set(phoneVariants)).slice(0, 10); // Firestore 'in' limit is 10

    const snap = await getDocs(query(collection(db, 'students'), where('phone', 'in', uniqueVariants)));
    if (snap.empty) {
      throw { response: { data: { error: 'Không tìm thấy học viên với số điện thoại này' } } };
    }
    
    const student = { id: snap.docs[0].id, ...snap.docs[0].data() };
    return toRes({ token: 'student-token', user: student });
  },
  checkIn: async (sessionId: string) => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('student_user') : null;
    if (!userStr) throw new Error('Chưa đăng nhập');
    const student = JSON.parse(userStr);
    
    const sessRef = doc(db, 'sessions', sessionId);
    const sessDoc = await getDoc(sessRef);
    if (!sessDoc.exists()) throw new Error('Buổi học không tồn tại');
    
    const sessData = sessDoc.data();
    let attArray = sessData.attendance || [];
    if (attArray && attArray.attendance) attArray = attArray.attendance;
    if (!Array.isArray(attArray)) attArray = [];
    
    const existingIdx = attArray.findIndex((a: any) => a.studentId === student.id);
    if (existingIdx >= 0) {
      if (attArray[existingIdx].status === 'NotMarked') {
         attArray[existingIdx].status = 'Present';
         attArray[existingIdx].checkInTime = new Date().toISOString();
      }
    } else {
      attArray.push({ studentId: student.id, status: 'Present', checkInTime: new Date().toISOString() });
    }
    
    await updateDoc(sessRef, { attendance: attArray });
    return toRes({ success: true });
  },
};

export const classLessonsApi = {
  getLessons: async (classId: string) => {
    const q = query(collection(db, 'class_lessons'), where('classId', '==', classId), orderBy('lessonNumber', 'asc'));
    const snap = await getDocs(q);
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  },
  createLesson: async (data: any) => {
    const id = uuidv4();
    await setDoc(doc(db, 'class_lessons', id), { id, ...data, createdAt: new Date().toISOString() });
    return toRes({ id, ...data });
  },
  updateLesson: async (id: string, data: any) => {
    await updateDoc(doc(db, 'class_lessons', id), { ...data, updatedAt: new Date().toISOString() });
    return toRes({ success: true });
  },
  deleteLesson: async (id: string) => {
    await deleteDoc(doc(db, 'class_lessons', id));
    return toRes({ success: true });
  }
};

export const classMaterialsApi = {
  getMaterials: async (lessonId: string) => {
    const q = query(collection(db, 'class_materials'), where('lessonId', '==', lessonId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  },
  createMaterial: async (data: any) => {
    const id = uuidv4();
    await setDoc(doc(db, 'class_materials', id), { id, ...data, createdAt: new Date().toISOString() });
    return toRes({ id, ...data });
  },
  deleteMaterial: async (id: string) => {
    await deleteDoc(doc(db, 'class_materials', id));
    return toRes({ success: true });
  }
};

export const courseApi = {
  getAll: async () => {
    const snap = await getDocs(query(collection(db, 'courses'), orderBy('createdAt', 'desc')));
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  },
  getById: async (id: string) => {
    const snap = await getDoc(doc(db, 'courses', id));
    if (!snap.exists()) throw new Error('Not found');
    return toRes({ id: snap.id, ...snap.data() });
  },
  create: async (data: any) => {
    const id = data.id || uuidv4();
    await setDoc(doc(db, 'courses', id), { id, ...data, createdAt: new Date().toISOString() });
    return toRes({ id, ...data });
  },
  update: async (id: string, data: any) => {
    await updateDoc(doc(db, 'courses', id), { ...data, updatedAt: new Date().toISOString() });
    return toRes({ success: true });
  },
  delete: async (id: string) => {
    await deleteDoc(doc(db, 'courses', id));
    return toRes({ success: true });
  },
  getCurriculum: async (courseId: string) => {
    const q = query(collection(db, 'course_lessons'), where('courseId', '==', courseId));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    return toRes(data.sort((a, b) => (a.order || 0) - (b.order || 0)));
  },
  saveLesson: async (courseId: string, data: any) => {
    const id = data.id || uuidv4();
    await setDoc(doc(db, 'course_lessons', id), { id, courseId, ...data, updatedAt: new Date().toISOString() });
    return toRes({ id, ...data });
  },
  deleteLesson: async (lessonId: string) => {
    await deleteDoc(doc(db, 'course_lessons', lessonId));
    return toRes({ success: true });
  },
  enrollStudent: async (courseId: string, studentId: string) => {
    const id = `${courseId}_${studentId}`;
    await setDoc(doc(db, 'course_enrollments', id), { id, courseId, studentId, progress: [], enrolledAt: new Date().toISOString() });
    return toRes({ success: true });
  },
  getEnrollments: async (courseId: string) => {
    const q = query(collection(db, 'course_enrollments'), where('courseId', '==', courseId));
    const snap = await getDocs(q);
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  },
  getStudentEnrollments: async (studentId: string) => {
    const q = query(collection(db, 'course_enrollments'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  },
  updateProgress: async (enrollmentId: string, completedLessons: string[]) => {
    await updateDoc(doc(db, 'course_enrollments', enrollmentId), { progress: completedLessons, updatedAt: new Date().toISOString() });
    return toRes({ success: true });
  }
};

export const knowledgeApi = {
  getDocuments: async () => {
    const snap = await getDocs(query(collection(db, 'knowledge'), orderBy('createdAt', 'desc')));
    return toRes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  },
  createDocument: async (data: any) => {
    const id = uuidv4();
    await setDoc(doc(db, 'knowledge', id), { id, ...data, createdAt: new Date().toISOString(), views: 0 });
    return toRes({ success: true, id });
  },
  deleteDocument: async (id: string) => {
    await deleteDoc(doc(db, 'knowledge', id));
    return toRes({ success: true });
  }
};

export const trashApi = {
  getTrash: async () => {
    const now = new Date();
    const snap = await getDocs(collection(db, 'trash'));
    const items = [];
    for (const d of snap.docs) {
      const data = d.data();
      if (data.deletedAt) {
        const deletedDate = new Date(data.deletedAt);
        const diffTime = Math.abs(now.getTime() - deletedDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const limitDays = data.type === 'session' ? 14 : 30;
        if (diffDays > limitDays) {
          await deleteDoc(d.ref);
          continue;
        }
      }
      items.push({ id: d.id, ...data });
    }
    return toRes(items.sort((a: any, b: any) => new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime()));
  },

  deletePermanently: async (trashId: string) => {
    await deleteDoc(doc(db, 'trash', trashId));
    return toRes({ success: true });
  },

  restore: async (trashId: string) => {
    const trashDoc = await getDoc(doc(db, 'trash', trashId));
    if (!trashDoc.exists()) throw new Error('Không tìm thấy dữ liệu khôi phục');
    
    const { type, data } = trashDoc.data();
    
    if (type === 'class') {
      await setDoc(doc(db, 'classes', data.id), data);
    } 
    else if (type === 'session') {
      await setDoc(doc(db, 'sessions', data.id), data);
    }
    else if (type === 'enrollment') {
      const { classId, enrollment, studentObj } = data;
      const classRef = doc(db, 'classes', classId);
      const classDoc = await getDoc(classRef);
      if (classDoc.exists()) {
        const classData = classDoc.data();
        let currentEnrollments = classData.enrollments || [];
        let currentStudents = classData.students || [];
        
        if (!currentEnrollments.some((x: any) => x.id === enrollment.id)) {
          currentEnrollments.push(enrollment);
        }
        if (!currentStudents.some((x: any) => x.id === studentObj.id)) {
          currentStudents.push(studentObj);
        }
        await updateDoc(classRef, { enrollments: currentEnrollments, students: currentStudents });
      }
    }
    else if (type === 'student') {
      await setDoc(doc(db, 'students', data.student.id), data.student);
      
      const enrollments = data.enrollments || [];
      for (const item of enrollments) {
        const classRef = doc(db, 'classes', item.classId);
        const classDoc = await getDoc(classRef);
        if (classDoc.exists()) {
          const classData = classDoc.data();
          let currentEnrollments = classData.enrollments || [];
          let currentStudents = classData.students || [];
          
          item.enrollments.forEach((e: any) => {
            if (!currentEnrollments.some((x: any) => x.id === e.id)) {
              currentEnrollments.push(e);
            }
          });
          
          if (!currentStudents.some((s: any) => s.id === data.student.id)) {
            currentStudents.push({
              id: data.student.id,
              fullName: data.student.fullName || data.student.name,
              phone: data.student.phone,
              email: data.student.email
            });
          }
          await updateDoc(classRef, { enrollments: currentEnrollments, students: currentStudents });
        }
      }
    }
    else if (type === 'split') {
      const { sourceClassId, targetClassId, studentIds, originalSourceEnrollments } = data;
      
      const sourceRef = doc(db, 'classes', sourceClassId);
      const targetRef = doc(db, 'classes', targetClassId);

      const sourceDoc = await getDoc(sourceRef);
      const targetDoc = await getDoc(targetRef);

      if (sourceDoc.exists() && targetDoc.exists()) {
        const sourceData = sourceDoc.data();
        const targetData = targetDoc.data();

        let sourceEnrollments = sourceData.enrollments || [];
        let sourceStudents = sourceData.students || [];

        let targetEnrollments = targetData.enrollments || [];
        let targetStudents = targetData.students || [];

        targetEnrollments = targetEnrollments.filter((e: any) => !studentIds.includes(e.studentId));
        targetStudents = targetStudents.filter((s: any) => !studentIds.includes(s.id));

        originalSourceEnrollments.forEach((oldEnrollment: any) => {
          if (!sourceEnrollments.some((e: any) => e.studentId === oldEnrollment.studentId)) {
            sourceEnrollments.push(oldEnrollment);
          }
          
          const studentObj = targetData.students.find((s: any) => s.id === oldEnrollment.studentId) || { id: oldEnrollment.studentId, fullName: oldEnrollment.studentName };
          if (!sourceStudents.some((s: any) => s.id === studentObj.id)) {
            sourceStudents.push(studentObj);
          }
        });

        await updateDoc(sourceRef, { enrollments: sourceEnrollments, students: sourceStudents });
        await updateDoc(targetRef, { enrollments: targetEnrollments, students: targetStudents });

        const sourceSessionsSnap = await getDocs(query(collection(db, 'sessions'), where('classId', '==', sourceClassId)));
        const targetSessionsSnap = await getDocs(query(collection(db, 'sessions'), where('classId', '==', targetClassId)));

        const sourceSessions = sourceSessionsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
          if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        const targetSessions = targetSessionsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
          if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        const minSessionsLen = Math.min(sourceSessions.length, targetSessions.length);
        for (let i = 0; i < minSessionsLen; i++) {
          const sSess: any = sourceSessions[i];
          const tSess: any = targetSessions[i];

          const sAtt = sSess.attendance || [];
          const tAtt = tSess.attendance || [];

          let updatedSourceAtt = [...sAtt];
          studentIds.forEach((studentId: any) => {
            const studentRecordTarget = tAtt.find((a: any) => a.studentId === studentId);
            if (studentRecordTarget) {
              updatedSourceAtt = updatedSourceAtt.filter((a: any) => a.studentId !== studentId);
              updatedSourceAtt.push({
                ...studentRecordTarget,
                sessionId: sSess.id
              });
            }
          });

          await updateDoc(doc(db, 'sessions', sSess.id), { attendance: updatedSourceAtt });

          const updatedTargetAtt = tAtt.filter((a: any) => !studentIds.includes(a.studentId));
          await updateDoc(doc(db, 'sessions', tSess.id), { attendance: updatedTargetAtt });
        }

        const sourceTestsSnap = await getDocs(query(collection(db, 'tests'), where('classId', '==', sourceClassId)));
        const targetTestsSnap = await getDocs(query(collection(db, 'tests'), where('classId', '==', targetClassId)));

        const sourceTests = sourceTestsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        });

        const targetTests = targetTestsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        });

        const minTestsLen = Math.min(sourceTests.length, targetTests.length);
        for (let i = 0; i < minTestsLen; i++) {
          const sTest: any = sourceTests[i];
          const tTest: any = targetTests[i];

          const sScores = sTest.scores || [];
          const tScores = tTest.scores || [];

          let updatedSourceScores = [...sScores];
          studentIds.forEach((studentId: any) => {
            const scoreRecordTarget = tScores.find((sc: any) => sc.studentId === studentId);
            if (scoreRecordTarget) {
              updatedSourceScores = updatedSourceScores.filter((sc: any) => sc.studentId !== studentId);
              updatedSourceScores.push(scoreRecordTarget);
            }
          });

          await updateDoc(doc(db, 'tests', sTest.id), { scores: updatedSourceScores });

          const updatedTargetScores = tScores.filter((sc: any) => !studentIds.includes(sc.studentId));
          await updateDoc(doc(db, 'tests', tTest.id), { scores: updatedTargetScores });
        }

        for (const studentId of studentIds) {
          const sourceProgressId = `${sourceClassId}_${studentId}`;
          const targetProgressId = `${targetClassId}_${studentId}`;

          const targetProgressSnap = await getDoc(doc(db, 'elearning_progress', targetProgressId));
          if (targetProgressSnap.exists()) {
            const progressData = targetProgressSnap.data();
            await setDoc(doc(db, 'elearning_progress', sourceProgressId), {
              ...progressData,
              id: sourceProgressId,
              classId: sourceClassId
            });
            await deleteDoc(doc(db, 'elearning_progress', targetProgressId));
          }
        }
      }
    }

    await deleteDoc(doc(db, 'trash', trashId));
    return toRes({ success: true });
  }
};
