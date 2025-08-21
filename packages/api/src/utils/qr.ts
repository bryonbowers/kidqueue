import QRCode from 'qrcode';
import { randomBytes } from 'crypto';

export const generateQRCode = async (data: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(data);
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};

export const generateUniqueQRData = (type: 'student' | 'vehicle', id: string): string => {
  const timestamp = Date.now();
  const random = randomBytes(4).toString('hex');
  return `KIDQUEUE_${type.toUpperCase()}_${id}_${timestamp}_${random}`;
};

export const parseQRData = (qrData: string) => {
  const parts = qrData.split('_');
  if (parts.length < 4 || parts[0] !== 'KIDQUEUE') {
    throw new Error('Invalid QR code format');
  }
  
  return {
    type: parts[1].toLowerCase() as 'student' | 'vehicle',
    id: parts[2],
    timestamp: parseInt(parts[3]),
    random: parts[4]
  };
};