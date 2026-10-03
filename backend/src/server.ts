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
import storeAdminRoutes from './routes/storeAdminRoutes';

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH'] },
});

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());

io.on('connection', (socket) => {
  socket.on('join_order_room', (orderId: string) => socket.join(`order:${orderId}`));
  socket.on('join_store_room', (storeId: string) => socket.join(`store:${storeId}`));
});

app.set('io', io);

// Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/store-admin', storeAdminRoutes);

app.get('/api/health', (req, res) => res.status(200).json({ status: 'HEALTHY' }));

const PORT = process.env.PORT || 5000;
async function bootstrap() {
  await connectDB();
  server.listen(PORT, () => console.log(`SmartBasket server active on port ${PORT}`));
}
bootstrap();
