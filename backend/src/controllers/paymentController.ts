import { Request, Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { AuthRequest } from '../middleware/auth';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

// Create Razorpay Order
export async function createPaymentOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { amountPaise, currency = 'INR' } = req.body;

    if (!amountPaise || amountPaise <= 0) {
      res.status(400).json({ code: 'INVALID_AMOUNT', message: 'Valid amount is required.' });
      return;
    }

    const options = {
      amount: amountPaise,
      currency,
      receipt: `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({ success: true, order });
  } catch (error: any) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ code: 'PAYMENT_INIT_FAILED', message: error.message || 'Payment initiation failed.' });
  }
}

// Verify Payment Signature
export async function verifyPaymentSignature(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ code: 'MISSING_PARAMS', message: 'Incomplete payment credentials.' });
      return;
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature === razorpay_signature) {
      res.status(200).json({ success: true, message: 'Payment verified successfully.' });
    } else {
      res.status(400).json({ code: 'SIGNATURE_MISMATCH', message: 'Tampered or invalid signature.' });
    }
  } catch (error) {
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Payment verification failed.' });
  }
}
