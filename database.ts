import mongoose from 'mongoose';
import { Subscription, UserSession } from './types';

// Connect to MongoDB
export async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    console.log('MONGODB_URI not set, skipping database connection');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

// Define the Subscription schema with proper typing
interface SubscriptionDocument extends Subscription, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new mongoose.Schema<SubscriptionDocument>(
  {
    userId: { type: Number, required: true },
    symbol: { type: String, required: true },
    threshold: { type: Number, required: true },
    direction: { type: String, enum: ['up', 'down'], required: true }
  },
  {
    timestamps: true // This automatically adds createdAt and updatedAt fields
  }
);

// Define the UserSession schema
const userSessionSchema = new mongoose.Schema<UserSession>({
  userId: { type: Number, required: true, unique: true },
  subscribedSymbols: { type: [String], default: [] }
});

// Create models
export const SubscriptionModel = mongoose.model<SubscriptionDocument>('Subscription', subscriptionSchema);
export const UserSessionModel = mongoose.model<UserSession>('UserSession', userSessionSchema);