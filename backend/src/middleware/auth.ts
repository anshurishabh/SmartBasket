import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    id?: string;
    role?: string;
    name?: string;
    phone?: string;
    storeId?: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'smartbasket_secure_jwt_secret_key_2026';

export function protect(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authorization token missing.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      ...decoded,
      userId: decoded.userId || decoded.id || decoded._id,
    };
    next();
  } catch (error) {
    res.status(401).json({ code: 'INVALID_TOKEN', message: 'Token expired or invalid.' });
  }
}
