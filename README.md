# SmartBasket

# 🛒 SmartBasket — Quick Commerce Platform

High-concurrency quick-commerce delivery system modeled after Blinkit & Zepto, featuring zero-overselling database atomicity, geospatial dark store discovery, real-time WebSocket fulfillment, and an offline-to-online machine learning recommendation tray.

---

## 🚀 How to Run the Project

Open **two separate terminals** to run the backend and frontend simultaneously:

### 1. Start Backend (Terminal 1)
```bash
cd backend
npm install
npm run seed     # Run once to seed store catalog and inventory
npm run dev      # Runs Express + Socket.IO on http://localhost:5000
---
### Start Frontend (Terminal 2)

cd frontend
npm install
npm run dev      # Runs Next.js application on http://localhost:3000

3. Optional Commands

Train ML Recommender Engine:

cd ml-recommender && pip install pandas pymongo python-dotenv && python train_recommender.py


Run Concurrency Stress Test (25 Parallel Checkouts):

cd backend && npm run stress-test

Customer App	http://localhost:3000

Store Packing Queue	http://localhost:3000/store

Rider Partner App	http://localhost:3000/rider
