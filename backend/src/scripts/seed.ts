import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { Inventory } from '../models/Inventory';
import { User } from '../models/User';

dotenv.config();

const sampleProducts = [
  { name: 'Fresh Whole Milk (500ml)', category: 'Dairy & Eggs', brand: 'Amul', pricePaise: 3300 },
  { name: 'Farm Brown Eggs (Pack of 6)', category: 'Dairy & Eggs', brand: 'Eggoz', pricePaise: 6500 },
  { name: 'Whole Wheat Bread (400g)', category: 'Bakery', brand: 'Harvest Gold', pricePaise: 4500 },
  { name: 'Salted Butter (100g)', category: 'Dairy & Eggs', brand: 'Amul', pricePaise: 5800 },
  { name: 'Instant Coffee Powder (50g)', category: 'Beverages', brand: 'Nescafe', pricePaise: 19000 },
  { name: 'Green Tea Bags (25 bags)', category: 'Beverages', brand: 'Tetley', pricePaise: 17500 },
  { name: 'Potato Chips - Classic Salted', category: 'Snacks', brand: "Lay's", pricePaise: 2000 },
  { name: 'Diet Cola Can (300ml)', category: 'Beverages', brand: 'Coca-Cola', pricePaise: 4000 },
  { name: 'Instant Masala Noodles (70g)', category: 'Instant Food', brand: 'Maggi', pricePaise: 1400 },
  { name: 'Fresh Banana (Robusta 500g)', category: 'Fruits & Vegetables', brand: 'Fresh Farms', pricePaise: 3500 },
];

async function seedDatabase() {
  console.log('--- Starting Seed Script ---');
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartbasket';
    console.log(`Connecting to MongoDB at: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.');

    await Store.deleteMany({});
    await Product.deleteMany({});
    await Inventory.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared existing database records.');

    const defaultPassword = await bcrypt.hash('password123', 10);
    const users = await User.insertMany([
      { name: 'Test Customer', email: 'customer@smartbasket.com', passwordHash: defaultPassword, role: 'customer' },
      { name: 'Store Manager', email: 'store@smartbasket.com', passwordHash: defaultPassword, role: 'store_staff' },
      { name: 'Test Rider', email: 'rider@smartbasket.com', passwordHash: defaultPassword, role: 'rider' },
    ]);
    console.log(`Created ${users.length} test users.`);

    const store = await Store.create({
      name: 'SmartBasket Dark Store - Gomti Nagar',
      location: {
        type: 'Point',
        coordinates: [80.9995, 26.8525],
      },
      serviceRadiusKm: 6.0,
      openTime: '06:00',
      closeTime: '23:59',
      timezone: 'Asia/Kolkata',
      lastOrderBeforeCloseMin: 15,
      manualStatus: 'OPEN',
    });
    console.log(`Created Dark Store: ${store.name}`);

    const createdProducts = await Product.insertMany(sampleProducts);
    console.log(`Inserted ${createdProducts.length} catalog products.`);

    const inventoryRecords = createdProducts.map((p) => ({
      storeId: store._id,
      productId: p._id,
      stock: 30,
      reserved: 0,
      lowStockThreshold: 5,
    }));

    await Inventory.insertMany(inventoryRecords);
    console.log(`Initialized inventory for store.`);

    console.log('Database seeding finished successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

seedDatabase();