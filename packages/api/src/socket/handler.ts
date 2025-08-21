import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';

export const socketHandler = (io: Server, prisma: PrismaClient) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join school room for real-time updates
    socket.on('join-school', (schoolId: string) => {
      socket.join(`school:${schoolId}`);
      console.log(`Socket ${socket.id} joined school room: ${schoolId}`);
    });

    // Leave school room
    socket.on('leave-school', (schoolId: string) => {
      socket.leave(`school:${schoolId}`);
      console.log(`Socket ${socket.id} left school room: ${schoolId}`);
    });

    // Join parent room for personal updates
    socket.on('join-parent', (parentId: string) => {
      socket.join(`parent:${parentId}`);
      console.log(`Socket ${socket.id} joined parent room: ${parentId}`);
    });

    // Leave parent room
    socket.on('leave-parent', (parentId: string) => {
      socket.leave(`parent:${parentId}`);
      console.log(`Socket ${socket.id} left parent room: ${parentId}`);
    });

    // Get current queue status for a school
    socket.on('get-queue-status', async (schoolId: string) => {
      try {
        const queue = await prisma.queueEntry.findMany({
          where: {
            schoolId,
            status: { in: ['waiting', 'called'] }
          },
          include: {
            student: true,
            parent: {
              select: { id: true, name: true }
            },
            vehicle: true
          },
          orderBy: { queuePosition: 'asc' }
        });

        socket.emit('queue-status', queue);
      } catch (error) {
        console.error('Get queue status error:', error);
        socket.emit('error', { message: 'Failed to fetch queue status' });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // Helper function to emit to school room
  const emitToSchool = (schoolId: string, event: string, data: any) => {
    io.to(`school:${schoolId}`).emit(event, data);
  };

  // Helper function to emit to parent room
  const emitToParent = (parentId: string, event: string, data: any) => {
    io.to(`parent:${parentId}`).emit(event, data);
  };

  // Make helper functions available globally
  (io as any).emitToSchool = emitToSchool;
  (io as any).emitToParent = emitToParent;
};