const { admin, db } = require("../admin.js");

// Sample products to add
const products = [
  {
    name: "Royal Banarasi Silk Saree",
    nameBangla: "রয়্যাল বেনারসি সিল্ক শাড়ি",
    category: "silk",
    price: 4500,
    originalPrice: 5000,
    discount: 10,
    stock: 15,
    isNewArrival: true,
    isFeatured: true,
    description: "Exquisite hand-woven Banarasi silk saree perfect for weddings and special occasions. Made from the finest silk with intricate gold zari work."
  },
  {
    name: "Traditional Jamdani Saree",
    nameBangla: "ঐতিহ্যবাহী জামদানি শাড়ি",
    category: "jamdani",
    price: 8500,
    originalPrice: 9000,
    discount: 5,
    stock: 8,
    isNewArrival: true,
    isFeatured: false,
    description: "Heritage handloom Jamdani — a timeless piece of Bangladeshi artistry. Recognised by UNESCO as an Intangible Cultural Heritage."
  },
  {
    name: "Premium Eid Panjabi",
    nameBangla: "প্রিমিয়াম ঈদ পাঞ্জাবি",
    category: "panjabi",
    price: 2200,
    originalPrice: 2500,
    discount: 12,
    stock: 20,
    isNewArrival: false,
    isFeatured: true,
    description: "Elegant premium Panjabi for Eid and special celebrations. Lightweight fabric, comfortable for all-day wear."
  },
  {
    name: "Handcrafted Suti Bag",
    nameBangla: "হাতে বোনা সুতি ব্যাগ",
    category: "handbag",
    price: 850,
    originalPrice: 1000,
    discount: 15,
    stock: 30,
    isNewArrival: true,
    isFeatured: false,
    description: "Beautiful handcrafted ladies handbag made from authentic Suti Kapor fabric. Spacious, durable, and uniquely designed."
  },
  {
    name: "Kanjivaram Silk Saree",
    nameBangla: "কাঞ্জিভরম সিল্ক শাড়ি",
    category: "silk",
    price: 6500,
    originalPrice: 7000,
    discount: 7,
    stock: 5,
    isNewArrival: false,
    isFeatured: true,
    description: "South Indian Kanjivaram silk with rich gold zari work. Perfect for weddings and grand celebrations."
  },
  {
    name: "Muslin Jamdani Saree",
    nameBangla: "মসলিন জামদানি শাড়ি",
    category: "jamdani",
    price: 5500,
    originalPrice: 6000,
    discount: 8,
    stock: 12,
    isNewArrival: true,
    isFeatured: false,
    description: "Lightweight muslin Jamdani perfect for casual and formal occasions. Breathable fabric ideal for Bangladesh's climate."
  }
];

async function addAllProducts() {
  console.log("Adding products to Firestore...\n");

  for (const product of products) {
    const docRef = await db.collection("PRODUCTS").add({
      ...product,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`✓ Added: ${product.name} (ID: ${docRef.id})`);
  }

  console.log("\n✅ All products added successfully!");
}

async function listProducts() {
  console.log("Fetching all products...\n");

  const snapshot = await db.collection("PRODUCTS").get();

  if (snapshot.empty) {
    console.log("No products found.");
    return;
  }

  snapshot.docs.forEach((doc, index) => {
    const p = doc.data();
    console.log(`${index + 1}. ${p.name} — ৳${p.price} (${p.category})`);
    console.log(`   ID: ${doc.id}\n`);
  });

  console.log(`Total: ${snapshot.size} products`);
}

async function deleteAllProducts() {
  console.log("Deleting all products...\n");

  const snapshot = await db.collection("PRODUCTS").get();
  const batch = db.batch();

  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`✓ Deleted ${snapshot.size} products`);
}

// Get command line argument
const command = process.argv[2];

if (command === "add") {
  addAllProducts();
} else if (command === "list") {
  listProducts();
} else if (command === "delete") {
  deleteAllProducts();
} else {
  console.log(`
SK Fashion - Product Management
=================================
Usage: node products.js <command>

Commands:
  add     - Add sample products to Firestore
  list    - List all products
  delete  - Delete all products

Example:
  node scripts/products.js add
  node scripts/products.js list
  `);
}