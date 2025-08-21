import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get current user profile
router.get('/profile', async (req: AuthenticatedRequest, res) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user?.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        schoolId: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.patch('/profile', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, schoolId } = req.body;
    
    const updateData: any = {};
    if (name) updateData.name = name;
    if (schoolId) updateData.schoolId = schoolId;

    const user = await req.prisma.user.update({
      where: { id: req.user?.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        schoolId: true,
        createdAt: true
      }
    });

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

export default router;