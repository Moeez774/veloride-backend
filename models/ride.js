import mongoose, { mongo } from "mongoose";

const Rides = new mongoose.Schema({
    _id: String,
    userId: String,
    driverName: { type: String, required: true },

    rideDetails: {
        pickupLocation: {
            type: { type: String, required: true, default: 'Point' },
            pickupName: { type: String, required: true },
            coordinates: { type: [Number], required: true }
        },
        dropoffLocation: {
            type: { type: String, required: true, default: 'Point' },
            dropoffName: { type: String, required: true },
            coordinates: { type: [Number], required: true }
        },
        date: { type: Date, required: true },
        seats: { type: Number, required: true },
        bookedSeats: { type: Number, required: true },
        time: { type: String, required: true },
        vehicle: { type: String, required: true },
        distance: { type: String, required: true },
        duration: { type: String, required: true }
    },

    preferences: {
        rideType: String,
        ridePreferences: {
            luggageAllowed: { type: Boolean, default: true },
            petAllowed: { type: Boolean, default: false },
            smokingAllowed: { type: Boolean, default: false },
        },
        needs: {
            wheelchairAccess: { type: Boolean, default: false },
        },
        gender: { type: String, default: 'Any' }
    },
    budget: {
        totalBudget: { type: Number, required: true },
        negotiate: { type: Boolean, default: false },
        recurring: { type: Boolean, default: false },
        recurringVal: { type: String, default: '' }
    },
    additionalInfo: {
        photo: { type: String, default: '' },
        note: { type: String, default: '' },
        verfication: {
            email: Boolean,
            number: Boolean
        }
    }
})
// Adding Geospatial Indexes
Rides.index({ "rideDetails.pickupLocation.coordinates": "2dsphere" })

export const Ride = mongoose.models.Ride || mongoose.model("Ride", Rides)