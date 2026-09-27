const BASE_URL = 'http://localhost:5000/api';

async function runStressTest() {
  console.log('====================================================');
  console.log('🚀 SMARTBASKET HIGH-CONCURRENCY RACE CONDITION TEST');
  console.log('====================================================\n');

  // 1. Authenticate test customer
  console.log('1. Authenticating test user...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@smartbasket.com', password: 'password123' }),
  });
  const { token } = await loginRes.json();
  if (!token) throw new Error('Authentication failed!');

  // 2. Fetch Gomti Nagar store & targeted test product
  console.log('2. Fetching nearest store catalog...');
  const storeRes = await fetch(`${BASE_URL}/stores/nearest?lat=26.8525&lng=80.9995`);
  const storeData = await storeRes.json();
  const storeId = storeData.data.store._id;

  const productsRes = await fetch(`${BASE_URL}/products/store/${storeId}`);
  const products = (await productsRes.json()).data;
  const targetProduct = products[0]; // Target: First product (e.g., Amul Milk)

  const initialAvailable = targetProduct.availableQuantity;
  console.log(`\n🎯 Target Item: "${targetProduct.name}"`);
  console.log(`📦 Initial Available Stock: ${initialAvailable} units\n`);

  if (initialAvailable <= 0) {
    console.log('⚠️ Target item is already out of stock. Please restart or reseed the database.');
    return;
  }

  // 3. Fire 25 concurrent checkout requests simultaneously
  const CONCURRENT_REQUESTS = 25;
  console.log(`⚡ Bombarding API with ${CONCURRENT_REQUESTS} parallel checkout requests at the exact same millisecond...\n`);

  const requests = Array.from({ length: CONCURRENT_REQUESTS }).map((_, index) => {
    const idempotencyKey = `stress_${Date.now()}_req_${index}_${Math.random()}`;
    return fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        storeId,
        items: [{ productId: targetProduct._id, quantity: 1 }],
        idempotencyKey,
        address: {
          addressLine: `Stress Test Address #${index + 1}`,
          coordinates: [80.9995, 26.8525],
        },
      }),
    }).then(async (res) => {
      const body = await res.json();
      return { status: res.status, body };
    });
  });

  const results = await Promise.all(requests);

  // 4. Analyze Results
  let successfulOrders = 0;
  let rejectedOrders = 0;

  for (const r of results) {
    if (r.status === 201) {
      successfulOrders++;
    } else {
      rejectedOrders++;
    }
  }

  // 5. Verify Database State
  const verifyRes = await fetch(`${BASE_URL}/products/store/${storeId}`);
  const updatedProducts = (await verifyRes.json()).data;
  const updatedProduct = updatedProducts.find((p: any) => p._id === targetProduct._id);
  const finalAvailable = updatedProduct.availableQuantity;

  console.log('------------------ TEST SCOREBOARD ------------------');
  console.log(`Total Concurrent Shoppers  : ${CONCURRENT_REQUESTS}`);
  console.log(`Initial Available Units    : ${initialAvailable}`);
  console.log(`✅ Successful Checkouts     : ${successfulOrders}`);
  console.log(`🛑 Blocked (Out of Stock)   : ${rejectedOrders}`);
  console.log(`📦 Remaining Units in DB    : ${finalAvailable}`);
  console.log('-----------------------------------------------------');

  if (finalAvailable >= 0 && successfulOrders <= initialAvailable) {
    console.log('\n🏆 VERDICT: PASSED! Zero Overselling detected. Database atomicity protected stock integrity.');
  } else {
    console.log('\n❌ VERDICT: FAILED! Overselling detected (Stock is negative or exceeded available).');
  }
}

runStressTest().catch(console.error);
