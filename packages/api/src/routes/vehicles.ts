import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateUniqueQRData } from '../utils/qr';

const router = Router();

// Get all vehicles for the current user
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const vehicles = await req.prisma.vehicle.findMany({
      where: { parentId: req.user?.id }
    });

    res.json({ success: true, data: vehicles });
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch vehicles' });
  }
});

// Create a new vehicle
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { licensePlate, make, model, color } = req.body;

    if (!licensePlate) {
      return res.status(400).json({ 
        success: false, 
        error: 'License plate is required' 
      });
    }

    // Create vehicle with unique QR code
    const vehicle = await req.prisma.vehicle.create({
      data: {
        parentId: req.user?.id as string,
        licensePlate,
        make,
        model,
        color,
        qrCode: generateUniqueQRData('vehicle', 'temp')
      }
    });

    // Update QR code with actual vehicle ID
    const updatedVehicle = await req.prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        qrCode: generateUniqueQRData('vehicle', vehicle.id)
      }
    });

    res.status(201).json({ success: true, data: updatedVehicle });
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({ success: false, error: 'Failed to create vehicle' });
  }
});

// Update a vehicle
router.patch('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { licensePlate, make, model, color } = req.body;

    // Verify ownership
    const existingVehicle = await req.prisma.vehicle.findUnique({
      where: { id }
    });

    if (!existingVehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    if (existingVehicle.parentId !== req.user?.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const updateData: any = {};
    if (licensePlate) updateData.licensePlate = licensePlate;
    if (make) updateData.make = make;
    if (model) updateData.model = model;
    if (color) updateData.color = color;

    const vehicle = await req.prisma.vehicle.update({
      where: { id },
      data: updateData
    });

    res.json({ success: true, data: vehicle });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ success: false, error: 'Failed to update vehicle' });
  }
});

// Delete a vehicle
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existingVehicle = await req.prisma.vehicle.findUnique({
      where: { id }
    });

    if (!existingVehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    if (existingVehicle.parentId !== req.user?.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Delete the vehicle
    await req.prisma.vehicle.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete vehicle' });
  }
});

export default router;