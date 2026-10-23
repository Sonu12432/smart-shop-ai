import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config, mongoConfigured } from '../config.js';
import { Product, KnowledgeDoc, User } from '../models.js';
import { products } from './products.js';
import { docs } from './docs.js';

export async function seedAll({ force = false } = {}) {
  if (force || (await Product.countDocuments()) === 0) {
    await Product.deleteMany({});
    await Product.insertMany(products);
    console.log(`Seeded ${products.length} products`);
  }
  if (force || (await KnowledgeDoc.countDocuments()) === 0) {
    await KnowledgeDoc.deleteMany({});
    await KnowledgeDoc.insertMany(docs);
    console.log(`Seeded ${docs.length} policy sections`);
  }
  if (force || !(await User.findOne({ email: 'demo@shopsmart.com' }))) {
    await User.deleteOne({ email: 'demo@shopsmart.com' });
    await User.create({
      name: 'Demo User',
      email: 'demo@shopsmart.com',
      passwordHash: await bcrypt.hash('demo1234', 10),
      tier: 'Prime',
      preferences: { budget: 1000, brands: ['Dell', 'Lenovo'], categories: ['Electronics'] },
    });
    console.log('Seeded demo user: demo@shopsmart.com / demo1234');
  }
}

// `npm run seed` => force re-seed
if (process.argv[1] && process.argv[1].endsWith('run.js')) {
  if (!mongoConfigured()) {
    console.error('Set MONGO_HOST (or MONGODB_URI) in server/.env first.');
    process.exit(1);
  }
  await mongoose.connect(config.mongoUri);
  await seedAll({ force: true });
  await mongoose.disconnect();
}
