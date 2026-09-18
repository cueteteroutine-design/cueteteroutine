import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Batch, CellSlots } from '@/types/schedule';
import { isSingleSlot, isDualSlot, getFirstSlot, getSlotsArray } from './scheduleHelpers';
import { fetchEffectiveTimeSlots, formatTimeSlotsForPdf } from './timeSlots';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU'];
const DAY_MAP: Record<string, string> = {
  'Sunday': 'SUN',
  'Monday': 'MON',
  'Tuesday': 'TUE',
  'Wednesday': 'WED',
  'Thursday': 'THU',
};

const TIME_SLOTS = [
  '8:10 to\n9:00',
  '9:00 to\n9:50',
  '9:50 to\n10:40',
  '',  // BREAK column - no header text
  '11:00 to\n11:50',
  '11:50 to\n12:40',
  '12:40 to\n1:30',
  '',  // LUNCH column - no header text
  '2:30 to\n3:20',
  '3:20 to\n4:10',
  '4:10 to\n5:00',
];

interface CourseInfo {
  code: string;
  name: string;
  teacherShortName: string;
  teacherFullName: string;
  type: 'theory' | 'sessional';
  color: string;
  credit?: number;
}

interface DualSlotInfo {
  slot0: {
    courseCode: string;
    teacherShortName: string;
    groupName: string | null;
    room: string | null;
    color: string;
  };
  slot1: {
    courseCode: string;
    teacherShortName: string;
    groupName: string | null;
    room: string | null;
    color: string;
  };
}

const hslToRgb = (hslString: string): [number, number, number] => {
  try {
    const parts = hslString.split(' ');
    const h = parseFloat(parts[0]) / 360;
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  } catch (e) {
    return [52, 152, 219];
  }
};

const lightenColor = (rgb: [number, number, number], factor: number = 0.75): [number, number, number] => {
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * factor),
    Math.round(rgb[1] + (255 - rgb[1]) * factor),
    Math.round(rgb[2] + (255 - rgb[2]) * factor),
  ];
};

// Helper to compare dual slots for merging
const areDualSlotsEqual = (cell1: CellSlots, cell2: CellSlots): boolean => {
  if (!isDualSlot(cell1) || !isDualSlot(cell2)) return false;
  const s1_0 = cell1[0];
  const s1_1 = cell1[1];
  const s2_0 = cell2[0];
  const s2_1 = cell2[1];
  return s1_0.courseCode === s2_0.courseCode &&
         s1_0.teacherShortName === s2_0.teacherShortName &&
         s1_0.groupName === s2_0.groupName &&
         s1_0.room === s2_0.room &&
         s1_1.courseCode === s2_1.courseCode &&
         s1_1.teacherShortName === s2_1.teacherShortName &&
         s1_1.groupName === s2_1.groupName &&
         s1_1.room === s2_1.room;
};

const findConsecutiveSlots = (daySlots: any, startIndex: number, cellSlots: Record<number, CellSlots>): number => {
  const startCell = cellSlots[startIndex];
  const startSlot = getFirstSlot(startCell);
  if (!startSlot || startSlot.type !== 'sessional') return 1;
  
  let count = 1;
  
  for (let i = startIndex + 1; i < 11; i++) {
    const nextCell = cellSlots[i];
    const nextSlot = getFirstSlot(nextCell);
    
    // Check if both are dual slots and equal
    if (isDualSlot(startCell) && isDualSlot(nextCell)) {
      if (areDualSlotsEqual(startCell, nextCell)) {
        count++;
      } else {
        break;
      }
    } 
    // Check if both are single slots and equal
    else if (isSingleSlot(startCell) && isSingleSlot(nextCell)) {
      if (nextSlot && 
          nextSlot.courseCode === startSlot.courseCode && 
          nextSlot.type === 'sessional' &&
          nextSlot.groupName === startSlot.groupName &&
          nextSlot.room === startSlot.room &&
          nextSlot.teacherShortName === startSlot.teacherShortName) {
        count++;
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return count;
};

export const generateRoutinePDF = async (batch: Batch) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const effectiveSlots = await fetchEffectiveTimeSlots();
  const TIME_SLOTS = formatTimeSlotsForPdf(effectiveSlots);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  // Load and add logo - shifted right
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = () => reject();
      logoImg.src = '/Cuet_logo.png';
    });
    doc.addImage(logoImg, 'PNG', margin + 5, 5, 20, 20);
  } catch (e) {
    console.log('Logo could not be loaded');
  }

  // Header
  doc.setFontSize(13);
  doc.setFont('times', 'bold');
  doc.setTextColor(25, 42, 86);
  doc.text('DEPARTMENT OF ELECTRONICS AND TELECOMMUNICATION ENGINEERING', pageWidth / 2, 10, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('times', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.text('CHITTAGONG UNIVERSITY OF ENGINEERING AND TECHNOLOGY', pageWidth / 2, 16, { align: 'center' });

  // Helper to check if room is valid (not null, empty, or "_ _ _")
  const isValidRoom = (room: string | null | undefined): boolean => {
    if (!room) return false;
    const trimmed = room.trim();
    if (trimmed === '' || trimmed === '_ _ _' || trimmed === '___') return false;
    return true;
  };

  // Find the most commonly assigned room
  const roomCounts = new Map<string, number>();
  Object.values(batch.schedule).forEach((daySlots) => {
    Object.values(daySlots).forEach((cell) => {
      const slots = getSlotsArray(cell);
      slots.forEach((slot) => {
        if (slot && isValidRoom(slot.room)) {
          const room = slot.room!.trim();
          roomCounts.set(room, (roomCounts.get(room) || 0) + 1);
        }
      });
    });
  });

  let assignedRoom = '';
  if (roomCounts.size > 0) {
    // Get the most frequently used room
    let maxCount = 0;
    roomCounts.forEach((count, room) => {
      if (count > maxCount) {
        maxCount = count;
        assignedRoom = room;
      }
    });
  }

  doc.setFontSize(12);
  doc.setFont('times', 'bold');
  doc.setTextColor(120, 40, 31);
  const titleText = assignedRoom 
    ? `Class Routine for Level-${batch.semesterInfo.level} Term-${batch.semesterInfo.term} '${batch.name}    Assigned Room: ${assignedRoom}`
    : `Class Routine for Level-${batch.semesterInfo.level} Term-${batch.semesterInfo.term} '${batch.name}`;
  doc.text(titleText, pageWidth / 2, 22, { align: 'center' });

  // Extract unique courses
  const courseMap = new Map<string, CourseInfo>();
  Object.values(batch.schedule).forEach((daySlots) => {
    Object.values(daySlots).forEach((cell) => {
      const slots = getSlotsArray(cell);
      slots.forEach((slot) => {
        if (slot && !courseMap.has(slot.courseCode)) {
          courseMap.set(slot.courseCode, {
            code: slot.courseCode,
            name: slot.courseName,
            teacherShortName: slot.teacherShortName,
            teacherFullName: slot.teacherFullName,
            type: slot.type,
            color: slot.color || '210 95% 53%',
            credit: slot.credit,
          });
        }
      });
    });
  });

  // Build schedule table with detailed cell info
  const scheduleBody: any[][] = [];
  const cellStyles: Record<string, any> = {};
  const mergedCellsInfo: Record<string, { colSpan: number }> = {};
  const cellDetailInfo: Record<string, { 
    courseCode: string; 
    groupName: string | null; 
    teacherShortName: string;
    room: string | null;
  }> = {};

  // Track which rows have dual slots (need increased height)
  const rowsWithDualSlots = new Set<number>();
  const dualSlotCells: Record<string, DualSlotInfo> = {};

  ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].forEach((day, dayIndex) => {
    const row: string[] = [DAY_MAP[day]];
    const daySlots = batch.schedule[day] || {};
    
    // Initialize all 11 columns
    for (let i = 0; i < 11; i++) {
      row.push('');
    }
    
    // Check for dual slots in this row
    for (let scheduleIndex = 0; scheduleIndex < 11; scheduleIndex++) {
      if (scheduleIndex === 3) continue;
      const cell = daySlots[scheduleIndex] as CellSlots;
      if (isDualSlot(cell)) {
        rowsWithDualSlots.add(dayIndex);
        break;
      }
    }
    
    const processedSlots = new Set<number>();
    
    // Build cellSlots map for this day
    const cellSlotsMap: Record<number, CellSlots> = {};
    for (let i = 0; i < 11; i++) {
      cellSlotsMap[i] = daySlots[i] as CellSlots;
    }
    
    for (let scheduleIndex = 0; scheduleIndex < 11; scheduleIndex++) {
      if (processedSlots.has(scheduleIndex)) continue;
      
      // Skip break slot from database
      if (scheduleIndex === 3) {
        continue;
      }
      
      const cell = daySlots[scheduleIndex] as CellSlots;
      const slot = getFirstSlot(cell); // For PDF, use first slot if dual
      
      // Calculate correct table column
      let tableColIndex;
      if (scheduleIndex <= 2) {
        tableColIndex = scheduleIndex + 1;
      } else if (scheduleIndex <= 6) {
        tableColIndex = scheduleIndex + 1;
      } else {
        tableColIndex = scheduleIndex + 2;
      }
      
      if (slot) {
        const spanCount = findConsecutiveSlots(daySlots, scheduleIndex, cellSlotsMap);
        
        // Handle dual slots separately
        if (isDualSlot(cell)) {
          const slot0 = cell[0];
          const slot1 = cell[1];
          
          // Store dual slot info for custom rendering
          dualSlotCells[`${dayIndex}-${tableColIndex}`] = {
            slot0: {
              courseCode: slot0.courseCode,
              teacherShortName: slot0.teacherShortName,
              groupName: slot0.groupName || null,
              room: slot0.room || null,
              color: slot0.color || '210 95% 53%',
            },
            slot1: {
              courseCode: slot1.courseCode,
              teacherShortName: slot1.teacherShortName,
              groupName: slot1.groupName || null,
              room: slot1.room || null,
              color: slot1.color || '210 95% 53%',
            },
          };
          
          // Use placeholder text (will be replaced by custom drawing)
          row[tableColIndex] = 'DUAL';
          
          // Use first slot's color for cell background
          const rgb = hslToRgb(slot0.color || '210 95% 53%');
          const lightRgb = lightenColor(rgb, 0.85);
          cellStyles[`${dayIndex}-${tableColIndex}`] = {
            fillColor: lightRgb,
            textColor: [0, 0, 0],
            isDual: true,
          };
        } else {
          // Single slot handling - no room in cells
          let groupDisplay = '';
          // if (slot.groupName) {
          //   groupDisplay = `ㅤㅤ${slot.groupName}`;
          // }
          
          const cellContent = `${slot.courseCode}${groupDisplay}\n(${slot.teacherShortName})`;
          
          row[tableColIndex] = cellContent;
          
          // Store detailed cell info for custom rendering
          cellDetailInfo[`${dayIndex}-${tableColIndex}`] = {
            courseCode: slot.courseCode,
            groupName: slot.groupName || null,
            teacherShortName: slot.teacherShortName,
            room: slot.room || null,
          };
          
          const rgb = hslToRgb(slot.color || '210 95% 53%');
          const lightRgb = lightenColor(rgb, 0.78);
          cellStyles[`${dayIndex}-${tableColIndex}`] = {
            fillColor: lightRgb,
            textColor: [0, 0, 0],
          };
        }
        
        if (spanCount > 1) {
          mergedCellsInfo[`${dayIndex}-${tableColIndex}`] = {
            colSpan: spanCount,
          };
          
          for (let i = 1; i < spanCount; i++) {
            processedSlots.add(scheduleIndex + i);
          }
        }
      }
    }
    
    scheduleBody.push(row);
  });

  // Calculate column widths
  const availableWidth = pageWidth - 2 * margin - 14;
  const breakWidth = 8;
  const regularColumnWidth = (availableWidth - 2 * breakWidth) / 9;

  // Generate main schedule table
  autoTable(doc, {
    head: [['Day', ...TIME_SLOTS]],
    body: scheduleBody,
    startY: 26,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      halign: 'center',
      valign: 'middle',
      lineColor: [90, 90, 90],
      lineWidth: 0.25,
      minCellHeight: 12,
      font: 'times',
    },
    headStyles: {
      fillColor: [34, 87, 122],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 1.5,
      font: 'times',
    },
    columnStyles: {
      0: { 
        fontStyle: 'bold', 
        halign: 'center', 
        cellWidth: 14, 
        fillColor: [71, 85, 119],
        textColor: [255, 255, 255],
        fontSize: 8.5,
      },
      1: { cellWidth: regularColumnWidth },
      2: { cellWidth: regularColumnWidth },
      3: { cellWidth: regularColumnWidth },
      4: { cellWidth: breakWidth, fillColor: [255, 250, 205] },
      5: { cellWidth: regularColumnWidth },
      6: { cellWidth: regularColumnWidth },
      7: { cellWidth: regularColumnWidth },
      8: { cellWidth: breakWidth, fillColor: [255, 228, 196] },
      9: { cellWidth: regularColumnWidth },
      10: { cellWidth: regularColumnWidth },
      11: { cellWidth: regularColumnWidth },
    },
    didParseCell: (data) => {
      // Increase row height for rows with dual slots (1.5x = 18mm)
      if (data.section === 'body' && rowsWithDualSlots.has(data.row.index)) {
        data.cell.styles.minCellHeight = 18;
      }
      
      // Apply styles to regular cells
      if (data.section === 'body' && data.column.index > 0) {
        const styleKey = `${data.row.index}-${data.column.index}`;
        
        if (cellStyles[styleKey]) {
          data.cell.styles.fillColor = cellStyles[styleKey].fillColor;
          data.cell.styles.textColor = cellStyles[styleKey].textColor || [0, 0, 0];
        }
        
        if (mergedCellsInfo[styleKey]) {
          data.cell.colSpan = mergedCellsInfo[styleKey].colSpan;
        }
        
        // Merge break column vertically
        if (data.column.index === 4 && data.row.index === 0) {
          data.cell.rowSpan = 5;
        }
        
        // Merge lunch column vertically
        if (data.column.index === 8 && data.row.index === 0) {
          data.cell.rowSpan = 5;
        }
      }
      
      // Style header break/lunch cells
      if (data.section === 'head') {
        if (data.column.index === 4) {
          data.cell.styles.fillColor = [255, 250, 205];
        }
        if (data.column.index === 8) {
          data.cell.styles.fillColor = [255, 228, 196];
        }
      }
    },
    didDrawCell: (data) => {
      // Draw vertical BREAK text in the merged body cell
      if (data.section === 'body' && data.column.index === 4 && data.row.index === 0) {
        doc.saveGraphicsState();
        
        const x = data.cell.x + data.cell.width / 2;
        const y = data.cell.y + data.cell.height / 2;
        
        doc.setFont('times', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        
        const text = '10:40-11:00  TEA BREAK';
        const textWidth = doc.getTextWidth(text);
        
        doc.text(text, x + 1, y + textWidth / 2, {
          angle: 90
        });
        
        doc.restoreGraphicsState();
      }
      
      // Draw vertical LUNCH text in the merged body cell
      if (data.section === 'body' && data.column.index === 8 && data.row.index === 0) {
        doc.saveGraphicsState();
        
        const x = data.cell.x + data.cell.width / 2;
        const y = data.cell.y + data.cell.height / 2;
        
        doc.setFont('times', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        
        const text = '1:30-2:30 LUNCH BREAK';
        const textWidth = doc.getTextWidth(text);
        
        doc.text(text, x + 1, y + textWidth / 2, {
          angle: 90
        });
        
        doc.restoreGraphicsState();
      }
      
      // Custom rendering for course cells
      if (data.section === 'body' && data.column.index > 0 && 
          data.column.index !== 4 && data.column.index !== 8) {
        const styleKey = `${data.row.index}-${data.column.index}`;
        const dualInfo = dualSlotCells[styleKey];
        const cellInfo = cellDetailInfo[styleKey];
        
        // Handle dual slot cells
        if (dualInfo && data.cell.text.length > 0) {
          doc.saveGraphicsState();
          
          const cellX = data.cell.x;
          const cellY = data.cell.y;
          const cellWidth = data.cell.width;
          const cellHeight = data.cell.height;
          const halfHeight = cellHeight / 2;
          const padding = 0.25;
          
          // Draw upper slot (slot0)
          const rgb0 = hslToRgb(dualInfo.slot0.color);
          const lightRgb0 = lightenColor(rgb0, 0.78);
          doc.setFillColor(lightRgb0[0], lightRgb0[1], lightRgb0[2]);
          doc.rect(cellX + padding, cellY + padding, cellWidth - padding * 2, halfHeight - padding, 'F');
          
          // Draw divider line
          doc.setDrawColor(100, 100, 100);
          doc.setLineWidth(0.15);
          doc.line(cellX + 0.3, cellY + halfHeight, cellX + cellWidth - 0.3, cellY + halfHeight);
          
          // Draw lower slot (slot1)
          const rgb1 = hslToRgb(dualInfo.slot1.color);
          const lightRgb1 = lightenColor(rgb1, 0.78);
          doc.setFillColor(lightRgb1[0], lightRgb1[1], lightRgb1[2]);
          doc.rect(cellX + padding, cellY + halfHeight, cellWidth - padding * 2, halfHeight - padding, 'F');
          
          const centerX = cellX + cellWidth / 2;
          
          // Draw upper slot text - check if room differs from assigned room
          const showRoom0 = isValidRoom(dualInfo.slot0.room) && dualInfo.slot0.room!.trim() !== assignedRoom;
          const textY0Line1 = showRoom0 ? cellY + halfHeight / 2 - 0.8 : cellY + halfHeight / 2 + 0.8;
          doc.setFont('times', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(0, 0, 0);
          
          const upperText = dualInfo.slot0.groupName 
            ? `${dualInfo.slot0.courseCode}-${dualInfo.slot0.groupName} (${dualInfo.slot0.teacherShortName})`
            : `${dualInfo.slot0.courseCode} (${dualInfo.slot0.teacherShortName})`;
          doc.text(upperText, centerX, textY0Line1, { align: 'center' });
          
          // Show room only if different from assigned room
          if (showRoom0) {
            const textY0Line2 = textY0Line1 + 2.8;
            doc.setFont('times', 'normal');
            doc.setFontSize(5.5);
            doc.text(`Room: ${dualInfo.slot0.room}`, centerX, textY0Line2, { align: 'center' });
          }
          
          // Draw lower slot text - check if room differs from assigned room
          const showRoom1 = isValidRoom(dualInfo.slot1.room) && dualInfo.slot1.room!.trim() !== assignedRoom;
          const textY1Line1 = showRoom1 ? cellY + halfHeight + halfHeight / 2 - 0.8 : cellY + halfHeight + halfHeight / 2 + 0.8;
          doc.setFont('times', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(0, 0, 0);
          
          const lowerText = dualInfo.slot1.groupName 
            ? `${dualInfo.slot1.courseCode}-${dualInfo.slot1.groupName} (${dualInfo.slot1.teacherShortName})`
            : `${dualInfo.slot1.courseCode} (${dualInfo.slot1.teacherShortName})`;
          doc.text(lowerText, centerX, textY1Line1, { align: 'center' });
          
          // Show room only if different from assigned room
          if (showRoom1) {
            const textY1Line2 = textY1Line1 + 2.8;
            doc.setFont('times', 'normal');
            doc.setFontSize(5.5);
            doc.text(`Room: ${dualInfo.slot1.room}`, centerX, textY1Line2, { align: 'center' });
          }
          
          doc.restoreGraphicsState();
        }
        // Handle single slot cells
        else if (cellInfo && data.cell.text.length > 0) {
          doc.saveGraphicsState();
          
          // Clear the cell content area
          const bgColor = cellStyles[styleKey]?.fillColor || [255, 255, 255];
          doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
          doc.rect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, 'F');
          
          const centerX = data.cell.x + data.cell.width / 2;
          const centerY = data.cell.y + data.cell.height / 2;
          let currentY = centerY - 3;
          
          // Line 1: Course Code (Bold, 9pt) + Group (Bold, 9pt, Blue)
          doc.setFont('times', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          
          const courseCodeWidth = doc.getTextWidth(cellInfo.courseCode);
          
          if (cellInfo.groupName) {
            const groupText = `-${cellInfo.groupName}`;
            const groupWidth = doc.getTextWidth(groupText);
            const totalWidth = courseCodeWidth + groupWidth;
            const startX = centerX - totalWidth / 2;
            
            // Draw course code
            doc.text(cellInfo.courseCode, startX, currentY);
            
            // Draw group in blue
            doc.setTextColor(30, 100, 180);
            doc.text(groupText, startX + courseCodeWidth, currentY);
          } else {
            doc.text(cellInfo.courseCode, centerX, currentY, { align: 'center' });
          }
          
          currentY += 4;
          
          // Line 2: Teacher Short Name (Normal, 8.5pt)
          doc.setFont('times', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(0, 0, 0);
          doc.text(`(${cellInfo.teacherShortName})`, centerX, currentY, { align: 'center' });
          
          // Show room only if different from assigned room
          const showRoomSingle = isValidRoom(cellInfo.room) && cellInfo.room!.trim() !== assignedRoom;
          if (showRoomSingle) {
            currentY += 3.5;
            doc.setFontSize(7.5);
            doc.text(`Room: ${cellInfo.room}`, centerX, currentY, { align: 'center' });
          }
          
          doc.restoreGraphicsState();
        }
      }
    },
  });

  // Course Details Section
  const firstTableEndY = (doc as any).lastAutoTable?.finalY || 90;

  doc.setFontSize(10.5);
  doc.setFont('times', 'bold');
  doc.setTextColor(25, 42, 86);
  doc.text('Course Details:', margin, firstTableEndY + 7);

  const courseData: any[][] = [];
  const courseStyles: Record<number, any> = {};
  let courseIndex = 0;

  const sortedCourses = Array.from(courseMap.values()).sort((a, b) => a.code.localeCompare(b.code));

  sortedCourses.forEach((course) => {
    courseData.push([
      course.code,
      course.name,
      course.type === 'theory' ? 'Theory' : 'Sessional',
      course.credit !== undefined && course.credit !== null ? Number(course.credit).toFixed(2) : '-',
      course.teacherFullName,
      course.teacherShortName,
    ]);
    
    const rgb = hslToRgb(course.color);
    const lightRgb = lightenColor(rgb, 0.78);
    courseStyles[courseIndex] = { fillColor: lightRgb };
    courseIndex++;
  });

  autoTable(doc, {
    head: [['Course No.', 'Course Title', 'Type', 'Credit', 'Course Teacher', 'Initial']],
    body: courseData,
    startY: firstTableEndY + 10,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [90, 90, 90],
      lineWidth: 0.25,
      halign: 'left',
      font: 'times',
    },
    headStyles: {
      fillColor: [34, 87, 122],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8.5,
      font: 'times',
    },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 80 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 48 },
      5: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && courseStyles[data.row.index]) {
        data.cell.styles.fillColor = courseStyles[data.row.index].fillColor;
      }
    },
  });

  // Footer
  const secondTableEndY = (doc as any).lastAutoTable?.finalY || firstTableEndY + 50;
  const downloadDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  doc.setFontSize(7.5);
  doc.setFont('times', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(`Downloaded on: ${downloadDate}`, pageWidth / 2, pageHeight - 5, { align: 'center' });

  // Save the PDF
  const fileName = `${batch.name.replace(/\s+/g, '_')}_Routine_L${batch.semesterInfo.level}T${batch.semesterInfo.term}.pdf`;
  doc.save(fileName);
};
