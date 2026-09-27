import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import storeRoutes from './routes/storeRoutes';
import productRoutes from './routes/productRoutes';
import authRoutes from './routes/authRoutes';
import orderRoutes from './routes/orderRoutes';
import recommendationRoutes from './routes/recommendationRoutes';
import paymentRoutes from './routes/paymentRoutes';

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());

io.on('connection', (socket) => {
  socket.on('join_order_room', (orderId: string) => {
    socket.join(`order:${orderId}`);
  });
  socket.on('join_store_room', (storeId: string) => {
    socket.join(`store:${storeId}`);
  });
});

app.set('io', io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'HEALTHY', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`SmartBasket server running on port ${PORT}`);
  });
}

bootstrap();
