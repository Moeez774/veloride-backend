import mongoose from 'mongoose'

const SavedRoutes = new mongoose.Schema({
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    token: String,
    rideId: String,
    from: {
        name: String,
        type: { type: String, required: true, default: 'Point' },
        coordinates: [Number]
    },
    to: {
        name: String,
        type: { type: String, required: true, default: 'Point' },
        coordinates: [Number]
    },
    date: Date,
    time: String,
    vehicle: String,
    currentFare: Number,
    seats: Number,
    bookedSeats: Number,
    isCompleted: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
})
// Adding Geospatial Indexes
SavedRoutes.index({ "from.coordinates": "2dsphere" })
SavedRoutes.index({ "to.coordinates": "2dsphere" })

export const SavedRoute = mongoose.models.SavedRoute || mongoose.model("SavedRoute", SavedRoutes)