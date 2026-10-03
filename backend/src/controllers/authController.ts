import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Store } from '../models/Store';

const JWT_SECRET = process.env.JWT_SECRET || 'smartbasket_secure_jwt_secret_key_2026';

// Customer / Rider Signup
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, phone, role = 'customer', vehicleNo = '' } = req.body;

    if (!name || !email || !password || !phone) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Name, email, password and phone are required.' });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({ code: 'USER_EXISTS', message: 'User with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone,
      role: role === 'rider' ? 'rider' : 'customer',
      vehicleNo,
    });

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role, name: user.name, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, vehicleNo: user.vehicleNo },
    });
  } catch (error) {
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Registration failed.' });
  }
}

// Customer / Rider Login
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) {
      res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' });
      return;
    }

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role, name: user.name, phone: user.phone, vehicleNo: user.vehicleNo },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, vehicleNo: user.vehicleNo },
    });
  } catch (error) {
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Login failed.' });
  }
}

// Store Admin Login with Store Code (ID) + Password
export async function storeAdminLogin(req: Request, res: Response): Promise<void> {
  try {
    const { storeCode, password } = req.body;

    if (!storeCode || !password) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Store ID and Password are required.' });
      return;
    }

    const store = await Store.findOne({ storeCode: storeCode.toUpperCase() });
    if (!store) {
      res.status(401).json({ code: 'INVALID_STORE', message: 'Invalid Store ID or Store does not exist.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, store.passwordHash);
    if (!isMatch) {
      res.status(401).json({ code: 'INVALID_PASSWORD', message: 'Incorrect Store Password.' });
      return;
    }

    const token = jwt.sign(
      { storeId: store._id.toString(), storeCode: store.storeCode, role: 'store_admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      token,
      store: {
        id: store._id,
        storeCode: store.storeCode,
        name: store.name,
        addressLine: store.addressLine,
        phone: store.phone,
        openTime: store.openTime,
        closeTime: store.closeTime,
      },
    });
  } catch (error) {
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Store admin login failed.' });
  }
}
