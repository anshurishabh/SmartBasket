import os
from collections import defaultdict
from itertools import combinations
from pymongo import MongoClient
from dotenv import load_dotenv

# Load backend .env for MongoDB connection
load_dotenv(dotenv_path="../backend/.env")

MONGO_URI = os.getenv("MONGODB_URI")
if not MONGO_URI:
    raise ValueError("MONGODB_URI not found in backend/.env")

print("--- SmartBasket Recommendation Pipeline ---")
client = MongoClient(MONGO_URI)
db = client.get_database()

# 1. Fetch all products from MongoDB
products = list(db["products"].find({}, {"_id": 1, "name": 1}))
product_map = {p["name"]: p["_id"] for p in products}

print(f"Loaded {len(products)} catalog products from database.")

# 2. Grocery Basket Training Data (Instacart-style Co-occurrence Patterns)
# Baskets representing real-world grocery buying patterns:
# (Milk + Bread + Butter), (Eggs + Bread), (Coffee + Milk), (Noodles + Chips + Cola)
synthetic_baskets = [
    ["Fresh Whole Milk (500ml)", "Whole Wheat Bread (400g)", "Salted Butter (100g)"],
    ["Fresh Whole Milk (500ml)", "Whole Wheat Bread (400g)"],
    ["Farm Brown Eggs (Pack of 6)", "Whole Wheat Bread (400g)", "Salted Butter (100g)"],
    ["Farm Brown Eggs (Pack of 6)", "Whole Wheat Bread (400g)"],
    ["Instant Coffee Powder (50g)", "Fresh Whole Milk (500ml)"],
    ["Instant Coffee Powder (50g)", "Fresh Whole Milk (500ml)", "Whole Wheat Bread (400g)"],
    ["Green Tea Bags (25 bags)", "Farm Brown Eggs (Pack of 6)"],
    ["Instant Masala Noodles (70g)", "Diet Cola Can (300ml)", "Potato Chips - Classic Salted"],
    ["Instant Masala Noodles (70g)", "Diet Cola Can (300ml)"],
    ["Potato Chips - Classic Salted", "Diet Cola Can (300ml)"],
    ["Fresh Banana (Robusta 500g)", "Fresh Whole Milk (500ml)", "Farm Brown Eggs (Pack of 6)"],
    ["Fresh Banana (Robusta 500g)", "Whole Wheat Bread (400g)"]
]

# 3. Calculate Item Co-occurrence Counts
co_occurrence = defaultdict(lambda: defaultdict(int))
item_counts = defaultdict(int)

for basket in synthetic_baskets:
    valid_items = [item for item in basket if item in product_map]
    for item in valid_items:
        item_counts[item] += 1
    for item1, item2 in combinations(valid_items, 2):
        co_occurrence[item1][item2] += 1
        co_occurrence[item2][item1] += 1

print("Calculated item-to-item co-occurrence rules.")

# 4. Generate Top-N Recommendations and Save to MongoDB Atlas
recommendations_col = db["recommendations"]
recommendations_col.delete_many({})  # Clear old entries

records_to_insert = []

for item_name, related_items in co_occurrence.items():
    product_id = product_map[item_name]
    
    # Sort related products by highest co-occurrence frequency
    sorted_recommendations = sorted(related_items.items(), key=lambda x: x[1], reverse=True)
    
    top_items = [
        {
            "productId": product_map[name],
            "name": name,
            "score": score
        }
        for name, score in sorted_recommendations
    ]

    records_to_insert.append({
        "key": str(product_id),
        "type": "FREQUENTLY_BOUGHT_TOGETHER",
        "items": top_items
    })

if records_to_insert:
    recommendations_col.insert_many(records_to_insert)
    print(f"Successfully exported {len(records_to_insert)} recommendation rules to MongoDB Atlas!")
else:
    print("No recommendations generated.")

client.close()
print("Recommendation pipeline completed.")
