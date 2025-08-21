import { Router } from 'express';
import { generateQRCode, parseQRData } from '../utils/qr';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Scan QR code (no auth required for teacher scanning)
router.post('/scan', async (req: AuthenticatedRequest, res) => {
  try {
    const { qrCode, schoolId, teacherId } = req.body;

    if (!qrCode || !schoolId || !teacherId) {
      return res.status(400).json({ 
        success: false, 
        error: 'QR code, school ID, and teacher ID are required' 
      });
    }

    // Verify teacher exists and has permission
    const teacher = await req.prisma.user.findFirst({
      where: { 
        id: teacherId, 
        role: { in: ['teacher', 'admin'] },
        schoolId: schoolId 
      }
    });

    if (!teacher) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized teacher or invalid school' 
      });
    }

    // Parse QR code to determine if it's for a student or vehicle
    let qrData;
    try {
      qrData = parseQRData(qrCode);
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid QR code format' 
      });
    }

    if (qrData.type === 'student') {
      // Find student by QR code
      const student = await req.prisma.student.findUnique({
        where: { qrCode },
        include: { parent: true, school: true }
      });

      if (!student || student.schoolId !== schoolId) {
        return res.status(404).json({ 
          success: false, 
          error: 'Student not found or wrong school' 
        });
      }

      // Check if student is already in queue
      const existingEntry = await req.prisma.queueEntry.findFirst({
        where: {
          studentId: student.id,
          status: { in: ['waiting', 'called'] }
        }
      });

      if (existingEntry) {
        if (existingEntry.status === 'waiting') {
          // Mark as called
          await req.prisma.queueEntry.update({
            where: { id: existingEntry.id },
            data: { 
              status: 'called',
              calledAt: new Date(),
              teacherId: teacherId
            }
          });

          // Emit socket event
          req.io.emit('queue:student-called', { 
            studentId: student.id, 
            queueEntry: existingEntry 
          });

          return res.json({ 
            success: true, 
            message: `${student.name} has been called for pickup`,
            action: 'called'
          });
        } else if (existingEntry.status === 'called') {
          // Mark as picked up
          await req.prisma.queueEntry.update({
            where: { id: existingEntry.id },
            data: { 
              status: 'picked_up',
              pickedUpAt: new Date(),
              teacherId: teacherId
            }
          });

          // Emit socket event
          req.io.emit('queue:student-picked-up', { 
            studentId: student.id, 
            queueEntry: existingEntry 
          });

          return res.json({ 
            success: true, 
            message: `${student.name} has been picked up`,
            action: 'picked_up'
          });
        }
      } else {
        // Add to queue
        const queuePosition = await req.prisma.queueEntry.count({
          where: { 
            schoolId,
            status: { in: ['waiting', 'called'] }
          }
        }) + 1;

        const newEntry = await req.prisma.queueEntry.create({
          data: {
            studentId: student.id,
            parentId: student.parentId,
            schoolId: schoolId,
            status: 'waiting',
            queuePosition
          }
        });

        // Emit socket event
        req.io.emit('queue:updated', { schoolId });

        return res.json({ 
          success: true, 
          message: `${student.name} added to pickup queue (position ${queuePosition})`,
          action: 'added_to_queue',
          position: queuePosition
        });
      }
    } else if (qrData.type === 'vehicle') {
      // Find vehicle by QR code and add all associated students to queue
      const vehicle = await req.prisma.vehicle.findUnique({
        where: { qrCode },
        include: { 
          parent: { 
            include: { 
              students: { 
                where: { schoolId }
              }
            }
          }
        }
      });

      if (!vehicle) {
        return res.status(404).json({ 
          success: false, 
          error: 'Vehicle not found' 
        });
      }

      const students = vehicle.parent.students;
      if (students.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'No students found for this vehicle at this school' 
        });
      }

      const addedStudents = [];
      for (const student of students) {
        // Check if student is already in queue
        const existingEntry = await req.prisma.queueEntry.findFirst({
          where: {
            studentId: student.id,
            status: { in: ['waiting', 'called'] }
          }
        });

        if (!existingEntry) {
          const queuePosition = await req.prisma.queueEntry.count({
            where: { 
              schoolId,
              status: { in: ['waiting', 'called'] }
            }
          }) + 1;

          await req.prisma.queueEntry.create({
            data: {
              studentId: student.id,
              parentId: student.parentId,
              schoolId: schoolId,
              vehicleId: vehicle.id,
              status: 'waiting',
              queuePosition
            }
          });

          addedStudents.push({ name: student.name, position: queuePosition });
        }
      }

      if (addedStudents.length > 0) {
        // Emit socket event
        req.io.emit('queue:updated', { schoolId });

        return res.json({ 
          success: true, 
          message: `Added ${addedStudents.length} student(s) to pickup queue`,
          action: 'added_to_queue',
          students: addedStudents
        });
      } else {
        return res.json({ 
          success: true, 
          message: 'All students for this vehicle are already in queue',
          action: 'already_in_queue'
        });
      }
    }

    return res.status(400).json({ 
      success: false, 
      error: 'Unknown QR code type' 
    });

  } catch (error) {
    console.error('QR scan error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process QR code scan' 
    });
  }
});

// Generate QR code for student
router.get('/student/:studentId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { studentId } = req.params;
    
    const student = await req.prisma.student.findUnique({
      where: { id: studentId },
      include: { parent: true }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Check if user has permission to access this student
    if (req.user?.role === 'parent' && student.parentId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const qrCodeImage = await generateQRCode(student.qrCode);
    
    res.json({ 
      success: true, 
      data: { 
        qrCode: qrCodeImage,
        studentName: student.name,
        qrData: student.qrCode
      }
    });
  } catch (error) {
    console.error('Generate student QR error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate QR code' });
  }
});

// Generate QR code for vehicle
router.get('/vehicle/:vehicleId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { vehicleId } = req.params;
    
    const vehicle = await req.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { parent: true }
    });

    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    // Check if user has permission to access this vehicle
    if (req.user?.role === 'parent' && vehicle.parentId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const qrCodeImage = await generateQRCode(vehicle.qrCode);
    
    res.json({ 
      success: true, 
      data: { 
        qrCode: qrCodeImage,
        vehicleInfo: `${vehicle.make} ${vehicle.model} - ${vehicle.licensePlate}`,
        qrData: vehicle.qrCode
      }
    });
  } catch (error) {
    console.error('Generate vehicle QR error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate QR code' });
  }
});

export default router;