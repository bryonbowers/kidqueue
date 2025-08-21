import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Generate JWT token
const generateToken = (user: any) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      schoolId: user.schoolId 
    },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '24h' }
  );
};

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const authUser = req.user as any;
      
      // Find or create user in database
      let user = await req.prisma.user.findUnique({
        where: { email: authUser.email }
      });

      if (!user) {
        user = await req.prisma.user.create({
          data: {
            email: authUser.email,
            name: authUser.name,
            provider: authUser.provider,
            providerId: authUser.providerId,
            role: 'parent' // Default role
          }
        });
      }

      const token = generateToken(user);
      
      // Redirect to frontend with token
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      res.redirect(`${clientUrl}/auth/callback?token=${token}`);
    } catch (error) {
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/error`);
    }
  }
);

// Facebook OAuth routes
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback',
  passport.authenticate('facebook', { session: false }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const authUser = req.user as any;
      
      let user = await req.prisma.user.findUnique({
        where: { email: authUser.email }
      });

      if (!user) {
        user = await req.prisma.user.create({
          data: {
            email: authUser.email,
            name: authUser.name,
            provider: authUser.provider,
            providerId: authUser.providerId,
            role: 'parent'
          }
        });
      }

      const token = generateToken(user);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      res.redirect(`${clientUrl}/auth/callback?token=${token}`);
    } catch (error) {
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/error`);
    }
  }
);

// Apple OAuth routes
router.get('/apple', passport.authenticate('apple'));

router.post('/apple/callback',
  passport.authenticate('apple', { session: false }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const authUser = req.user as any;
      
      let user = await req.prisma.user.findUnique({
        where: { email: authUser.email }
      });

      if (!user) {
        user = await req.prisma.user.create({
          data: {
            email: authUser.email,
            name: authUser.name,
            provider: authUser.provider,
            providerId: authUser.providerId,
            role: 'parent'
          }
        });
      }

      const token = generateToken(user);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      res.redirect(`${clientUrl}/auth/callback?token=${token}`);
    } catch (error) {
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/error`);
    }
  }
);

// Verify token endpoint
router.get('/verify', (req: AuthenticatedRequest, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', async (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid token' });
    }

    try {
      const user = await req.prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, name: true, role: true, schoolId: true }
      });

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });
});

export default router;