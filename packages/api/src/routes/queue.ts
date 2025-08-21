import { Router } from 'express';
import { AuthenticatedRequest, requireRole } from '../middleware/auth';

const router = Router();

// Get queue for a school (teachers and admins only)
router.get('/school/:schoolId', requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { schoolId } = req.params;

    // Verify teacher belongs to this school
    if (req.user?.schoolId !== schoolId) {
      return res.status(403).json({ success: false, error: 'Unauthorized for this school' });
    }

    const queue = await req.prisma.queueEntry.findMany({
      where: {
        schoolId,
        status: { in: ['waiting', 'called'] }
      },
      include: {
        student: true,
        parent: {
          select: { id: true, name: true, email: true }
        },
        vehicle: true
      },
      orderBy: { queuePosition: 'asc' }
    });

    res.json({ success: true, data: queue });
  } catch (error) {
    console.error('Get school queue error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch queue' });
  }
});

// Get queue entries for current user (parents)
router.get('/my-entries', async (req: AuthenticatedRequest, res) => {
  try {
    const entries = await req.prisma.queueEntry.findMany({
      where: {
        parentId: req.user?.id,
        status: { in: ['waiting', 'called'] }
      },
      include: {
        student: true,
        school: {
          select: { id: true, name: true }
        },
        vehicle: true
      },
      orderBy: { enteredAt: 'desc' }
    });

    res.json({ success: true, data: entries });
  } catch (error) {
    console.error('Get my queue entries error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch queue entries' });
  }
});

// Add student to queue manually (parents only)
router.post('/add', async (req: AuthenticatedRequest, res) => {
  try {
    const { studentId, vehicleId } = req.body;

    if (!studentId) {
      return res.status(400).json({ success: false, error: 'Student ID is required' });
    }

    // Verify student belongs to current user
    const student = await req.prisma.student.findUnique({
      where: { id: studentId },
      include: { school: true }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    if (student.parentId !== req.user?.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Check if student is already in queue
    const existingEntry = await req.prisma.queueEntry.findFirst({
      where: {
        studentId,
        status: { in: ['waiting', 'called'] }
      }
    });

    if (existingEntry) {
      return res.status(400).json({ 
        success: false, 
        error: 'Student is already in the pickup queue' 
      });
    }

    // Verify vehicle belongs to user if provided
    if (vehicleId) {
      const vehicle = await req.prisma.vehicle.findUnique({
        where: { id: vehicleId }
      });

      if (!vehicle || vehicle.parentId !== req.user?.id) {
        return res.status(403).json({ success: false, error: 'Invalid vehicle' });
      }
    }

    // Get queue position
    const queuePosition = await req.prisma.queueEntry.count({
      where: {
        schoolId: student.schoolId,
        status: { in: ['waiting', 'called'] }
      }
    }) + 1;

    // Create queue entry
    const queueEntry = await req.prisma.queueEntry.create({
      data: {
        studentId,
        parentId: req.user?.id as string,
        schoolId: student.schoolId,
        vehicleId,
        status: 'waiting',
        queuePosition
      },
      include: {
        student: true,
        school: {
          select: { id: true, name: true }
        },
        vehicle: true
      }
    });

    // Emit socket event
    req.io.emit('queue:updated', { schoolId: student.schoolId });

    res.status(201).json({ 
      success: true, 
      data: queueEntry,
      message: `${student.name} added to pickup queue (position ${queuePosition})`
    });
  } catch (error) {
    console.error('Add to queue error:', error);
    res.status(500).json({ success: false, error: 'Failed to add student to queue' });
  }
});

// Remove student from queue (parents can remove their own, teachers can remove any)
router.delete('/:entryId', async (req: AuthenticatedRequest, res) => {
  try {
    const { entryId } = req.params;

    const queueEntry = await req.prisma.queueEntry.findUnique({
      where: { id: entryId },
      include: { student: true }
    });

    if (!queueEntry) {
      return res.status(404).json({ success: false, error: 'Queue entry not found' });
    }

    // Check permissions
    const isOwner = queueEntry.parentId === req.user?.id;
    const isTeacherAtSchool = req.user?.role === 'teacher' && req.user?.schoolId === queueEntry.schoolId;
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isTeacherAtSchool && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Delete the queue entry
    await req.prisma.queueEntry.delete({
      where: { id: entryId }
    });

    // Update positions for remaining entries
    await req.prisma.queueEntry.updateMany({
      where: {
        schoolId: queueEntry.schoolId,
        queuePosition: { gt: queueEntry.queuePosition },
        status: { in: ['waiting', 'called'] }
      },
      data: {
        queuePosition: { decrement: 1 }
      }
    });

    // Emit socket event
    req.io.emit('queue:updated', { schoolId: queueEntry.schoolId });

    res.json({ 
      success: true, 
      message: `${queueEntry.student.name} removed from pickup queue` 
    });
  } catch (error) {
    console.error('Remove from queue error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove from queue' });
  }
});

// Get queue history for a school (teachers and admins only)
router.get('/history/:schoolId', requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { schoolId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify teacher belongs to this school
    if (req.user?.schoolId !== schoolId) {
      return res.status(403).json({ success: false, error: 'Unauthorized for this school' });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const history = await req.prisma.queueEntry.findMany({
      where: {
        schoolId,
        status: 'picked_up'
      },
      include: {
        student: true,
        parent: {
          select: { id: true, name: true, email: true }
        },
        vehicle: true,
        teacher: {
          select: { id: true, name: true }
        }
      },
      orderBy: { pickedUpAt: 'desc' },
      skip,
      take: Number(limit)
    });

    const total = await req.prisma.queueEntry.count({
      where: {
        schoolId,
        status: 'picked_up'
      }
    });

    res.json({ 
      success: true, 
      data: {
        entries: history,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get queue history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch queue history' });
  }
});

export default router;