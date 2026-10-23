import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const productSchema = new Schema(
  {
    productId: { type: String, unique: true, index: true },
    name: String,
    category: { type: String, index: true },
    subCategory: { type: String, index: true },
    brand: { type: String, index: true },
    description: String,
    price: Number,
    rating: Number,
    reviews: Number,
    stock: Number,
    emoji: String,
    images: [String],
    tags: [String],
    specs: Schema.Types.Mixed,
  },
  { timestamps: true }
);

const userSchema = new Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true },
    passwordHash: String,
    tier: { type: String, enum: ['Basic', 'Prime', 'Premium'], default: 'Basic' },
    preferences: {
      budget: Number,
      brands: [String],
      categories: [String],
    },
    wishlist: [String],
    cart: [{ _id: false, productId: String, qty: { type: Number, default: 1 } }],
  },
  { timestamps: true }
);

const orderSchema = new Schema(
  {
    orderId: String,
    userId: Schema.Types.ObjectId,
    items: [{ _id: false, productId: String, name: String, price: Number, qty: Number }],
    total: Number,
    status: { type: String, default: 'PLACED' },
    eta: String,
    events: [{ _id: false, status: String, at: Date }],
  },
  { timestamps: true }
);

// One document per policy section (this is the "chunk" used for retrieval)
const docSchema = new Schema({
  document: String,
  section: String,
  version: String,
  effectiveDate: String,
  category: String,
  region: String,
  text: String,
});

export const Product = model('Product', productSchema);
export const User = model('User', userSchema);
export const Order = model('Order', orderSchema);
export const KnowledgeDoc = model('KnowledgeDoc', docSchema);
