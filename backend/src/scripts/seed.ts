import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { Inventory } from '../models/Inventory';
import { User } from '../models/User';

dotenv.config();

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('Connected to MongoDB Atlas...');

  await Promise.all([
    Store.deleteMany({}),
    Product.deleteMany({}),
    Inventory.deleteMany({}),
    User.deleteMany({}),
  ]);

  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  const storePasswordHash = await bcrypt.hash('store123', 10);

  // 1. Create Dark Store with specific ID & Password
  const store = await Store.create({
    storeCode: 'STORE_LKO_01',
    passwordHash: storePasswordHash,
    name: 'SmartBasket Gomti Nagar Dark Store',
    addressLine: 'Plot 14, Near Cyber Heights, Vibhuti Khand, Gomti Nagar, Lucknow',
    phone: '+91 9876543210',
    location: { type: 'Point', coordinates: [80.9995, 26.8525] },
    serviceRadiusKm: 6,
    openTime: '06:00',
    closeTime: '23:30',
  });

  // 2. Users (Customer & Rider)
  await User.create([
    {
      name: 'Anshu Kumar Rishabh',
      email: 'customer@smartbasket.com',
      passwordHash: defaultPasswordHash,
      phone: '+91 9839012345',
      role: 'customer',
    },
    {
      name: 'Ravi Kumar (Speed Rider)',
      email: 'rider@smartbasket.com',
      passwordHash: defaultPasswordHash,
      phone: '+91 9140987654',
      role: 'rider',
      vehicleNo: 'UP-32-SB-2026',
    },
  ]);

  // 3. Products
  const products = await Product.create([
    { name: 'Fresh Whole Milk (500ml)', category: 'Dairy', brand: 'Amul', pricePaise: 3300, isActive: true },
    { name: 'Whole Wheat Bread (400g)', category: 'Bakery', brand: 'Harvest Gold', pricePaise: 4500, isActive: true },
    { name: 'Salted Butter (100g)', category: 'Dairy', brand: 'Amul', pricePaise: 5800, isActive: true },
    { name: 'Farm Brown Eggs (Pack of 6)', category: 'Eggs & Meat', brand: 'Eggoz', pricePaise: 6500, isActive: true },
    { name: 'Instant Coffee Powder (50g)', category: 'Beverages', brand: 'Nescafe', pricePaise: 18500, isActive: true },
    { name: 'Green Tea Bags (25 bags)', category: 'Beverages', brand: 'Tetley', pricePaise: 16000, isActive: true },
    { name: 'Instant Masala Noodles (70g)', category: 'Instant Food', brand: 'Maggi', pricePaise: 1400, isActive: true },
    { name: 'Diet Cola Can (300ml)', category: 'Beverages', brand: 'Coca-Cola', pricePaise: 4000, isActive: true },
    { name: 'Potato Chips - Classic Salted', category: 'Snacks', brand: 'Lay\'s', pricePaise: 2000, isActive: true },
    { name: 'Fresh Banana (Robusta 500g)', category: 'Fruits', brand: 'Fresh Farms', pricePaise: 4000, isActive: true },
  ]);

  // 4. Inventory
  for (const p of products) {
    await Inventory.create({
      storeId: store._id,
      productId: p._id,
      stock: 40,
      reserved: 0,
    });
  }

  console.log('✅ SEED SUCCESSFUL!');
  console.log('👉 Store ID: STORE_LKO_01 | Store Password: store123');
  console.log('👉 Customer: customer@smartbasket.com | password123');
  console.log('👉 Rider: rider@smartbasket.com | password123');
  process.exit(0);
}

seed().catch(console.error);
