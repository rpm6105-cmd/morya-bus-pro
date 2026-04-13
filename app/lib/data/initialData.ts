export interface Branch {
  id: string;
  name: string;
  manager: string;
  incentiveType: 'FIXED' | 'PERCENTAGE';
  incentiveValue: number;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  department: string;
  branchId: string;
  salary: number;
  pfEnabled: boolean;
  esicEnabled: boolean;
  joiningDate: string;
}

export interface Attendance {
  [empId: string]: {
    [date: string]: 'PRESENT' | 'PAID_LEAVE' | 'SICK_LEAVE' | 'LOP';
  };
}

export const DEPARTMENTS = ['Operations', 'Maintenance', 'Accounts', 'HR', 'Security', 'Management'];

export const INITIAL_BRANCHES: Branch[] = [
  { id: 'B01', name: 'Main Depot - Mumbai', manager: 'Rajesh More', incentiveType: 'PERCENTAGE', incentiveValue: 5 },
  { id: 'B02', name: 'Pune East Depot', manager: 'Amit Patil', incentiveType: 'FIXED', incentiveValue: 2000 },
  { id: 'B03', name: 'Nagpur Central Hub', manager: 'Sunil Deshmukh', incentiveType: 'PERCENTAGE', incentiveValue: 8 },
  { id: 'B04', name: 'Nashik Depot', manager: 'Vijay Chavan', incentiveType: 'FIXED', incentiveValue: 1500 },
  { id: 'B05', name: 'Thane North Depot', manager: 'Sanjay Shinde', incentiveType: 'PERCENTAGE', incentiveValue: 3 },
  // ... will generate more dynamically in service
];

// Seed for more branches for the demo
for (let i = 6; i <= 30; i++) {
  INITIAL_BRANCHES.push({
    id: `B${i.toString().padStart(2, '0')}`,
    name: `Depot ${i} - Maharashtra`,
    manager: `Manager ${i}`,
    incentiveType: i % 2 === 0 ? 'FIXED' : 'PERCENTAGE',
    incentiveValue: i % 2 === 0 ? 1000 : 4
  });
}

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'E001', name: 'Sandeep Varma', phone: '+91 9988776655', department: 'Operations', branchId: 'B01', salary: 35000, pfEnabled: true, esicEnabled: true, joiningDate: '2023-01-15' },
  { id: 'E002', name: 'Priya Joshi', phone: '+91 9977665544', department: 'Accounts', branchId: 'B01', salary: 45000, pfEnabled: true, esicEnabled: false, joiningDate: '2023-05-20' },
  { id: 'E003', name: 'Rahul Kulkarni', phone: '+91 9966554433', department: 'Maintenance', branchId: 'B02', salary: 28000, pfEnabled: false, esicEnabled: true, joiningDate: '2023-08-10' },
  { id: 'E004', name: 'Snehal Bhide', phone: '+91 9955443322', department: 'HR', branchId: 'B02', salary: 55000, pfEnabled: true, esicEnabled: true, joiningDate: '2022-11-01' },
];

const names = ['Kishor', 'Amol', 'Vinay', 'Prasad', 'Anjali', 'Deepali', 'Swati', 'Manish', 'Siddharth', 'Varun'];
const surnames = ['Gaikwad', 'Jadhav', 'Pawar', 'Desai', 'Patil', 'Sawant', 'Kulkarni', 'Bhosale', 'More', 'Chavan'];

// Generate 50 random employees
for (let i = 5; i <= 50; i++) {
  const branchIdx = Math.floor(Math.random() * INITIAL_BRANCHES.length);
  const deptIdx = Math.floor(Math.random() * DEPARTMENTS.length);
  INITIAL_EMPLOYEES.push({
    id: `E${i.toString().padStart(3, '0')}`,
    name: `${names[i % names.length]} ${surnames[Math.floor(Math.random() * surnames.length)]}`,
    phone: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    department: DEPARTMENTS[deptIdx],
    branchId: INITIAL_BRANCHES[branchIdx].id,
    salary: Math.floor(Math.random() * 50000) + 15000,
    pfEnabled: Math.random() > 0.3,
    esicEnabled: Math.random() > 0.5,
    joiningDate: `2023-0${Math.floor(Math.random() * 9) + 1}-10`
  });
}
