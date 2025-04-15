import mongoose from "mongoose";
import dotenv from 'dotenv'
import { Ride } from "./models/ride.js";
import { SavedRoute } from './models/savedroutes.js'

// Load environment variables from .env.local
dotenv.config({ path: './.env.local' });

const mongoUri = process.env.MONGODB_URI;

export const connectDB = async () => {
    try {
        if (!mongoUri) {
            throw new Error("MongoDB URI is not defined in .env.local file.");
        }

        await mongoose.connect(mongoUri);

        await Ride.init()
        await SavedRoute.init()
        console.log('Connected to MongoDB successfully!');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1); // Exit process with failure
    }
}