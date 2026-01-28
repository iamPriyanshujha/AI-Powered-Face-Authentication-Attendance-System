import { User, AttendanceRecord } from '../types';

const USERS_KEY = 'faceauth_users';
const ATTENDANCE_KEY = 'faceauth_logs';

export const getUsers = (): User[] => {
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveUser = (user: User): void => {
  const users = getUsers();
  // Optional: Check if ID already exists to prevent duplicates
  const existingIndex = users.findIndex(u => u.employeeId === user.employeeId);
  if (existingIndex >= 0) {
      users[existingIndex] = user; // Update existing
  } else {
      users.push(user);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const deleteUser = (userId: string): void => {
  let users = getUsers();
  users = users.filter(u => u.id !== userId);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getAttendanceLogs = (): AttendanceRecord[] => {
  const data = localStorage.getItem(ATTENDANCE_KEY);
  return data ? JSON.parse(data) : [];
};

export const getLastRecordForUser = (userId: string): AttendanceRecord | undefined => {
    const logs = getAttendanceLogs();
    // Logs are stored with newest first (unshift), so find first match
    return logs.find(log => log.userId === userId);
};

export const logAttendance = (record: AttendanceRecord): void => {
  const logs = getAttendanceLogs();
  logs.unshift(record); // Add to beginning
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(logs));
};

export const clearData = () => {
  localStorage.removeItem(USERS_KEY);
  localStorage.removeItem(ATTENDANCE_KEY);
}