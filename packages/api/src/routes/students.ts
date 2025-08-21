import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateUniqueQRData } from '../utils/qr';

const router = Router();

// Get all students for the current user
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const students = await req.prisma.student.findMany({
      where: { parentId: req.user?.id },
      include: {
        school: true
      }
    });

    res.json({ success: true, data: students });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch students' });
  }
});

// Create a new student
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, grade, schoolId } = req.body;

    if (!name || !grade || !schoolId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, grade, and school ID are required' 
      });
    }

    // Verify the school exists
    const school = await req.prisma.school.findUnique({
      where: { id: schoolId }
    });

    if (!school) {
      return res.status(404).json({ success: false, error: 'School not found' });
    }

    // Create student with unique QR code
    const student = await req.prisma.student.create({
      data: {
        name,
        grade,
        parentId: req.user?.id as string,
        schoolId,
        qrCode: generateUniqueQRData('student', 'temp')
      },
      include: {
        school: true
      }
    });

    // Update QR code with actual student ID
    const updatedStudent = await req.prisma.student.update({
      where: { id: student.id },
      data: {
        qrCode: generateUniqueQRData('student', student.id)
      },
      include: {
        school: true
      }
    });

    res.status(201).json({ success: true, data: updatedStudent });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ success: false, error: 'Failed to create student' });
  }
});

// Update a student
router.patch('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { name, grade, schoolId } = req.body;

    // Verify ownership
    const existingStudent = await req.prisma.student.findUnique({
      where: { id }
    });

    if (!existingStudent) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    if (existingStudent.parentId !== req.user?.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (grade) updateData.grade = grade;
    if (schoolId) {
      // Verify the school exists
      const school = await req.prisma.school.findUnique({
        where: { id: schoolId }
      });
      if (!school) {
        return res.status(404).json({ success: false, error: 'School not found' });
      }
      updateData.schoolId = schoolId;
    }

    const student = await req.prisma.student.update({
      where: { id },
      data: updateData,
      include: {
        school: true
      }
    });

    res.json({ success: true, data: student });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ success: false, error: 'Failed to update student' });
  }
});

// Delete a student
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existingStudent = await req.prisma.student.findUnique({
      where: { id }
    });

    if (!existingStudent) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    if (existingStudent.parentId !== req.user?.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Delete related queue entries first
    await req.prisma.queueEntry.deleteMany({
      where: { studentId: id }
    });

    // Delete the student
    await req.prisma.student.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete student' });
  }
});

export default router;