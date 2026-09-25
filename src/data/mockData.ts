import { Batch, Teacher, Room, Course } from '@/types/schedule';

// Predefined course colors (HSL format)
export const COURSE_COLORS = {
  'ETE-301': '217 91% 50%',   // Blue
  'ETE-302': '262 83% 58%',   // Purple
  'ETE-303': '339 76% 55%',   // Pink
  'ETE-304': '24 95% 53%',    // Orange
  'ETE-305': '142 71% 45%',   // Green
  'ETE-310': '199 89% 48%',   // Cyan
  'ETE-311': '280 68% 55%',   // Violet
  'ETE-312': '351 83% 55%',   // Rose
  'ETE-201': '168 76% 42%',   // Teal
  'ETE-202': '231 77% 60%',   // Indigo
  'ETE-203': '38 92% 50%',    // Amber
  'ETE-210': '172 66% 45%',   // Emerald
  'ETE-211': '221 83% 53%',   // Sky
  'ETE-101': '326 78% 55%',   // Fuchsia
  'ETE-102': '15 85% 55%',    // Coral
  'ETE-103': '250 65% 60%',   // Lavender
  'ETE-110': '185 84% 40%',   // Ocean
};

export const mockTeachers: Teacher[] = [
  { id: '1', shortName: 'MHR', fullName: 'Dr. Md. Habibur Rahman' },
  { id: '2', shortName: 'SKA', fullName: 'Dr. Sk. Alamgir' },
  { id: '3', shortName: 'NAS', fullName: 'Nasrin Akter Sumi' },
  { id: '4', shortName: 'TAH', fullName: 'Tanvir Ahmed Hossain' },
  { id: '5', shortName: 'RKD', fullName: 'Raktim Kumar Das' },
  { id: '6', shortName: 'AKB', fullName: 'Akbar Khan Babu' },
  { id: '7', shortName: 'MSI', fullName: 'Md. Shafiqul Islam' },
  { id: '8', shortName: 'FHA', fullName: 'Farhana Ahmed' },
];

export const mockRooms: Room[] = [
  { id: '1', name: '301', building: 'ETE Building' },
  { id: '2', name: '302', building: 'ETE Building' },
  { id: '3', name: '303', building: 'ETE Building' },
  { id: '4', name: 'Lab-1', building: 'ETE Building' },
  { id: '5', name: 'Lab-2', building: 'ETE Building' },
  { id: '6', name: '201', building: 'Academic Building' },
  { id: '7', name: '202', building: 'Academic Building' },
];

export const mockCourses: Course[] = [
  { id: '1', code: 'ETE-301', name: 'Digital Signal Processing', type: 'theory', color: COURSE_COLORS['ETE-301'] },
  { id: '2', code: 'ETE-302', name: 'Communication Systems', type: 'theory', color: COURSE_COLORS['ETE-302'] },
  { id: '3', code: 'ETE-303', name: 'Microprocessor & Interfacing', type: 'theory', color: COURSE_COLORS['ETE-303'] },
  { id: '4', code: 'ETE-304', name: 'Electromagnetic Fields', type: 'theory', color: COURSE_COLORS['ETE-304'] },
  { id: '5', code: 'ETE-310', name: 'DSP Lab', type: 'sessional', color: COURSE_COLORS['ETE-310'] },
  { id: '6', code: 'ETE-311', name: 'Communication Lab', type: 'sessional', color: COURSE_COLORS['ETE-311'] },
  { id: '7', code: 'ETE-312', name: 'Microprocessor Lab', type: 'sessional', color: COURSE_COLORS['ETE-312'] },
  { id: '8', code: 'ETE-305', name: 'Control Systems', type: 'theory', color: COURSE_COLORS['ETE-305'] },
];

const getColor = (code: string): string => {
  return COURSE_COLORS[code as keyof typeof COURSE_COLORS] || '217 91% 50%';
};

export const mockBatches: Batch[] = [
  {
    id: '1',
    name: '19 Batch',
    semesterInfo: {
      level: 4,
      term: 1,
      totalWeeks: 13,
      startDate: '2024-11-10', // Semester started Nov 10, 2024
      midBreakStart: '2024-12-22',
      midBreakEnd: '2024-12-28',
    },
    schedule: {
      Sunday: {
        0: { id: '1', courseCode: 'ETE-301', courseName: 'Digital Signal Processing', teacherShortName: 'MHR', teacherFullName: 'Dr. Md. Habibur Rahman', room: '301', type: 'theory', color: getColor('ETE-301') },
        1: { id: '2', courseCode: 'ETE-302', courseName: 'Communication Systems', teacherShortName: 'SKA', teacherFullName: 'Dr. Sk. Alamgir', room: '301', type: 'theory', color: getColor('ETE-302') },
        2: null,
        4: { id: '3', courseCode: 'ETE-310', courseName: 'DSP Lab', teacherShortName: 'MHR', teacherFullName: 'Dr. Md. Habibur Rahman', room: 'Lab-1', type: 'sessional', color: getColor('ETE-310') },
        5: { id: '4', courseCode: 'ETE-310', courseName: 'DSP Lab', teacherShortName: 'MHR', teacherFullName: 'Dr. Md. Habibur Rahman', room: 'Lab-1', type: 'sessional', color: getColor('ETE-310') },
        6: { id: '5', courseCode: 'ETE-310', courseName: 'DSP Lab', teacherShortName: 'MHR', teacherFullName: 'Dr. Md. Habibur Rahman', room: 'Lab-1', type: 'sessional', color: getColor('ETE-310') },
      },
      Monday: {
        0: { id: '6', courseCode: 'ETE-303', courseName: 'Microprocessor & Interfacing', teacherShortName: 'NAS', teacherFullName: 'Nasrin Akter Sumi', room: '302', type: 'theory', color: getColor('ETE-303') },
        1: { id: '7', courseCode: 'ETE-304', courseName: 'Electromagnetic Fields', teacherShortName: 'TAH', teacherFullName: 'Tanvir Ahmed Hossain', room: '302', type: 'theory', color: getColor('ETE-304') },
        2: { id: '8', courseCode: 'ETE-305', courseName: 'Control Systems', teacherShortName: 'RKD', teacherFullName: 'Raktim Kumar Das', room: '302', type: 'theory', color: getColor('ETE-305') },
        7: { id: '9', courseCode: 'ETE-311', courseName: 'Communication Lab', teacherShortName: 'SKA', teacherFullName: 'Dr. Sk. Alamgir', room: 'Lab-2', type: 'sessional', color: getColor('ETE-311') },
        8: { id: '10', courseCode: 'ETE-311', courseName: 'Communication Lab', teacherShortName: 'SKA', teacherFullName: 'Dr. Sk. Alamgir', room: 'Lab-2', type: 'sessional', color: getColor('ETE-311') },
        9: { id: '11', courseCode: 'ETE-311', courseName: 'Communication Lab', teacherShortName: 'SKA', teacherFullName: 'Dr. Sk. Alamgir', room: 'Lab-2', type: 'sessional', color: getColor('ETE-311') },
      },
      Tuesday: {
        0: { id: '12', courseCode: 'ETE-301', courseName: 'Digital Signal Processing', teacherShortName: 'MHR', teacherFullName: 'Dr. Md. Habibur Rahman', room: '301', type: 'theory', color: getColor('ETE-301') },
        1: { id: '13', courseCode: 'ETE-302', courseName: 'Communication Systems', teacherShortName: 'SKA', teacherFullName: 'Dr. Sk. Alamgir', room: '301', type: 'theory', color: getColor('ETE-302') },
        2: { id: '14', courseCode: 'ETE-303', courseName: 'Microprocessor & Interfacing', teacherShortName: 'NAS', teacherFullName: 'Nasrin Akter Sumi', room: '301', type: 'theory', color: getColor('ETE-303') },
        4: { id: '15', courseCode: 'ETE-304', courseName: 'Electromagnetic Fields', teacherShortName: 'TAH', teacherFullName: 'Tanvir Ahmed Hossain', room: '303', type: 'theory', color: getColor('ETE-304') },
        5: { id: '16', courseCode: 'ETE-305', courseName: 'Control Systems', teacherShortName: 'RKD', teacherFullName: 'Raktim Kumar Das', room: '303', type: 'theory', color: getColor('ETE-305') },
      },
      Wednesday: {
        0: { id: '17', courseCode: 'ETE-304', courseName: 'Electromagnetic Fields', teacherShortName: 'TAH', teacherFullName: 'Tanvir Ahmed Hossain', room: '301', type: 'theory', color: getColor('ETE-304') },
        1: { id: '18', courseCode: 'ETE-305', courseName: 'Control Systems', teacherShortName: 'RKD', teacherFullName: 'Raktim Kumar Das', room: '301', type: 'theory', color: getColor('ETE-305') },
        4: { id: '19', courseCode: 'ETE-312', courseName: 'Microprocessor Lab', teacherShortName: 'NAS', teacherFullName: 'Nasrin Akter Sumi', room: 'Lab-1', type: 'sessional', color: getColor('ETE-312') },
        5: { id: '20', courseCode: 'ETE-312', courseName: 'Microprocessor Lab', teacherShortName: 'NAS', teacherFullName: 'Nasrin Akter Sumi', room: 'Lab-1', type: 'sessional', color: getColor('ETE-312') },
        6: { id: '21', courseCode: 'ETE-312', courseName: 'Microprocessor Lab', teacherShortName: 'NAS', teacherFullName: 'Nasrin Akter Sumi', room: 'Lab-1', type: 'sessional', color: getColor('ETE-312') },
      },
      Thursday: {
        0: { id: '22', courseCode: 'ETE-301', courseName: 'Digital Signal Processing', teacherShortName: 'MHR', teacherFullName: 'Dr. Md. Habibur Rahman', room: '302', type: 'theory', color: getColor('ETE-301') },
        1: { id: '23', courseCode: 'ETE-302', courseName: 'Communication Systems', teacherShortName: 'SKA', teacherFullName: 'Dr. Sk. Alamgir', room: '302', type: 'theory', color: getColor('ETE-302') },
        2: { id: '24', courseCode: 'ETE-303', courseName: 'Microprocessor & Interfacing', teacherShortName: 'NAS', teacherFullName: 'Nasrin Akter Sumi', room: '302', type: 'theory', color: getColor('ETE-303') },
      },
    },
  },
  {
    id: '2',
    name: '20 Batch',
    semesterInfo: {
      level: 3,
      term: 2,
      totalWeeks: 13,
      startDate: '2024-11-03', // Started earlier
      midBreakStart: '2024-12-22',
      midBreakEnd: '2025-01-04', // Currently in mid break
    },
    schedule: {
      Sunday: {
        0: { id: '25', courseCode: 'ETE-201', courseName: 'Electronics I', teacherShortName: 'AKB', teacherFullName: 'Akbar Khan Babu', room: '201', type: 'theory', color: getColor('ETE-201') },
        1: { id: '26', courseCode: 'ETE-202', courseName: 'Signals & Systems', teacherShortName: 'MSI', teacherFullName: 'Md. Shafiqul Islam', room: '201', type: 'theory', color: getColor('ETE-202') },
        2: { id: '27', courseCode: 'ETE-203', courseName: 'Circuit Analysis', teacherShortName: 'FHA', teacherFullName: 'Farhana Ahmed', room: '201', type: 'theory', color: getColor('ETE-203') },
      },
      Monday: {
        4: { id: '28', courseCode: 'ETE-210', courseName: 'Electronics Lab', teacherShortName: 'AKB', teacherFullName: 'Akbar Khan Babu', room: 'Lab-2', type: 'sessional', color: getColor('ETE-210') },
        5: { id: '29', courseCode: 'ETE-210', courseName: 'Electronics Lab', teacherShortName: 'AKB', teacherFullName: 'Akbar Khan Babu', room: 'Lab-2', type: 'sessional', color: getColor('ETE-210') },
        6: { id: '30', courseCode: 'ETE-210', courseName: 'Electronics Lab', teacherShortName: 'AKB', teacherFullName: 'Akbar Khan Babu', room: 'Lab-2', type: 'sessional', color: getColor('ETE-210') },
      },
      Tuesday: {
        0: { id: '31', courseCode: 'ETE-201', courseName: 'Electronics I', teacherShortName: 'AKB', teacherFullName: 'Akbar Khan Babu', room: '202', type: 'theory', color: getColor('ETE-201') },
        1: { id: '32', courseCode: 'ETE-202', courseName: 'Signals & Systems', teacherShortName: 'MSI', teacherFullName: 'Md. Shafiqul Islam', room: '202', type: 'theory', color: getColor('ETE-202') },
        7: { id: '33', courseCode: 'ETE-203', courseName: 'Circuit Analysis', teacherShortName: 'FHA', teacherFullName: 'Farhana Ahmed', room: '202', type: 'theory', color: getColor('ETE-203') },
      },
      Wednesday: {
        0: { id: '34', courseCode: 'ETE-202', courseName: 'Signals & Systems', teacherShortName: 'MSI', teacherFullName: 'Md. Shafiqul Islam', room: '201', type: 'theory', color: getColor('ETE-202') },
        1: { id: '35', courseCode: 'ETE-203', courseName: 'Circuit Analysis', teacherShortName: 'FHA', teacherFullName: 'Farhana Ahmed', room: '201', type: 'theory', color: getColor('ETE-203') },
      },
      Thursday: {
        4: { id: '36', courseCode: 'ETE-211', courseName: 'Signals Lab', teacherShortName: 'MSI', teacherFullName: 'Md. Shafiqul Islam', room: 'Lab-1', type: 'sessional', color: getColor('ETE-211') },
        5: { id: '37', courseCode: 'ETE-211', courseName: 'Signals Lab', teacherShortName: 'MSI', teacherFullName: 'Md. Shafiqul Islam', room: 'Lab-1', type: 'sessional', color: getColor('ETE-211') },
        6: { id: '38', courseCode: 'ETE-211', courseName: 'Signals Lab', teacherShortName: 'MSI', teacherFullName: 'Md. Shafiqul Islam', room: 'Lab-1', type: 'sessional', color: getColor('ETE-211') },
      },
    },
  },
  {
    id: '3',
    name: '21 Batch',
    semesterInfo: {
      level: 2,
      term: 1,
      totalWeeks: 13,
      startDate: '2024-09-15', // Started in September
      midBreakStart: '2024-10-27',
      midBreakEnd: '2024-11-02',
    },
    schedule: {
      Sunday: {
        7: { id: '39', courseCode: 'ETE-101', courseName: 'Basic Electronics', teacherShortName: 'RKD', teacherFullName: 'Raktim Kumar Das', room: '303', type: 'theory', color: getColor('ETE-101') },
        8: { id: '40', courseCode: 'ETE-102', courseName: 'Engineering Math', teacherShortName: 'TAH', teacherFullName: 'Tanvir Ahmed Hossain', room: '303', type: 'theory', color: getColor('ETE-102') },
      },
      Monday: {
        0: { id: '41', courseCode: 'ETE-101', courseName: 'Basic Electronics', teacherShortName: 'RKD', teacherFullName: 'Raktim Kumar Das', room: '201', type: 'theory', color: getColor('ETE-101') },
        1: { id: '42', courseCode: 'ETE-102', courseName: 'Engineering Math', teacherShortName: 'TAH', teacherFullName: 'Tanvir Ahmed Hossain', room: '201', type: 'theory', color: getColor('ETE-102') },
        2: { id: '43', courseCode: 'ETE-103', courseName: 'Programming Fundamentals', teacherShortName: 'FHA', teacherFullName: 'Farhana Ahmed', room: '201', type: 'theory', color: getColor('ETE-103') },
      },
      Tuesday: {
        4: { id: '44', courseCode: 'ETE-110', courseName: 'Basic Electronics Lab', teacherShortName: 'RKD', teacherFullName: 'Raktim Kumar Das', room: 'Lab-2', type: 'sessional', color: getColor('ETE-110') },
        5: { id: '45', courseCode: 'ETE-110', courseName: 'Basic Electronics Lab', teacherShortName: 'RKD', teacherFullName: 'Raktim Kumar Das', room: 'Lab-2', type: 'sessional', color: getColor('ETE-110') },
      },
      Wednesday: {
        7: { id: '46', courseCode: 'ETE-103', courseName: 'Programming Fundamentals', teacherShortName: 'FHA', teacherFullName: 'Farhana Ahmed', room: '202', type: 'theory', color: getColor('ETE-103') },
        8: { id: '47', courseCode: 'ETE-101', courseName: 'Basic Electronics', teacherShortName: 'RKD', teacherFullName: 'Raktim Kumar Das', room: '202', type: 'theory', color: getColor('ETE-101') },
      },
      Thursday: {
        0: { id: '48', courseCode: 'ETE-102', courseName: 'Engineering Math', teacherShortName: 'TAH', teacherFullName: 'Tanvir Ahmed Hossain', room: '303', type: 'theory', color: getColor('ETE-102') },
        1: { id: '49', courseCode: 'ETE-103', courseName: 'Programming Fundamentals', teacherShortName: 'FHA', teacherFullName: 'Farhana Ahmed', room: '303', type: 'theory', color: getColor('ETE-103') },
      },
    },
  },
];