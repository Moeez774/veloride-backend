import { Router } from 'express'
import { Ride } from '../models/ride.js'
import { connectDB } from '../ConnectDB.js'
import { User } from '../models/user.js'
import { jwtVerify } from 'jose'

const rideRouter = Router()

connectDB()

rideRouter.post('/offer-ride', async (req, res) => {
    const { data } = req.body

    // returning error if all fields are not filled properly
    if (data.pickupName === '' || data.dropoffLocation === '' || data.date === '' || data.time === '' || data.vehicle === '' || data.totalBudget === '' || (!data.number && !data.email)) {
        return res.status(404).send({ message: "Please fill out all required fields for proceeding.", statusCode: 404 })
    }

    // for checking date mean if user selected past date or not
    const currentDate = new Date()

    const isDatePassed = new Date(data.date) < currentDate;
    if (isDatePassed) return res.status(404).send({ message: "Please choose upcoming date.", statusCode: 404 })

    //for budget type, is it string or number
    for (let i = 0; i < data.totalBudget.length; i++) {
        const n = parseInt(data.totalBudget.charAt(i))
        if (Number.isNaN(n)) return res.status(404).send({ message: "Only number type is allowed in total budget field.", statusCode: 404 })
    }

    // if all required fields are filled properly then proceed the process
    const rideInfo = {
        _id: data._id,
        userId: data.userId,
        driverName: data.driverName,

        // ride details
        rideDetails: {
            pickupLocation: {
                type: 'Point',
                pickupName: data.pickupName,
                coordinates: data.coordinates,
            },
            dropoffLocation: {
                type: 'Point',
                dropoffName: data.dropoffLocation,
                coordinates: data.dropLocationCoordinates,
            },
            date: data.date,
            seats: data.seats,
            time: data.time,
            vehicle: data.vehicle,
            distance: data.distance,
            duration: data.duration
        },

        //preferencess
        preferences: {
            rideType: data.rideType,
            ridePreferences: {
                luggageAllowed: data.luggageAllowed,
                petAllowed: data.petAllowed,
                smokingAllowed: data.smokingAllowed,
            },
            needs: {
                wheelchairAccess: data.wheelchairAccess
            },
            gender: data.gender,
        },

        //budget details
        budget: {
            totalBudget: parseInt(data.totalBudget, 10),
            negotiate: data.negotiate,
            recurring: data.recurring,
            recurringVal: data.recurringVal,
        },

        //additonal info
        additionalInfo: {
            photo: data.photo,
            note: data.note,
            verfication: {
                email: data.email,
                number: data.number,
            }
        }
    }

    try {
        await Ride.create(rideInfo)

        return res.status(200).send({ message: "Ride created successfully. Your ride is now public to all.", statusCode: 200 })

    } catch (err) {
        return res.status(500).send({ message: "Error creating ride, Please try again" + err, statusCode: 500 })
    }
})

// for fecthing rides near user's location
rideRouter.post("/fetchRides", async (req, res) => {
    const { userLocation, userId } = req.body

    if (!userLocation) return res.status(404).send({ message: "Invalid user's location.", statusCode: 404 })

    // fetching rides near user's location
    try {
        const rides = await Ride.find({$and: [{'userId': {$ne: userId}},
            {'rideDetails.pickupLocation.coordinates': {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: userLocation,
                    },
                    $maxDistance: 100000,
                }
            }}]
        })

        return res.status(200).send({ message: "Rides fetched.", statusCode: 200, data: rides })
    } catch (err) {
        return res.status(500).send({ message: "Error fetching rides." + err, statusCode: 500, data: "Error" })
    }
})

// for cheking user own any ride or not
rideRouter.get('/check-user-ride', async (req, res) => {
    const cookie = req.cookies?.token;

    // Return if cookie is not present meaning the user is not logged in
    if (!cookie) {
        return res.status(404).send({ message: "User not verified. Please sign in.", statusCode: 404 });
    }

    try {
        const secret = new TextEncoder().encode(process.env.SECRET_KEY)
        const { payload } = await jwtVerify(cookie, secret)

        const user = await Ride.findOne({ 'userId': payload._id })

        if (!user) {
            return res.status(404).send({ message: "User not found.", data: 'No', statusCode: 404 })
        }

        return res.status(200).send({ message: "Fetched", data: user, statusCode: 200 })
    } catch (err) {
        console.error("Error in fetching user's data:", err);
        return res.status(500).send({ message: "Error in fetching user's data", statusCode: 500 })
    }
})

// for fetching data of specific ride
rideRouter.post("/fetchRide", async (req, res) => {
    const { rideId } = req.body

    if (!rideId) return res.status(404).send({ message: "Ride Id not found.", statusCode: 404 })

    try {

        const ride = await Ride.findOne({ '_id': rideId })

        return res.status(200).send({ message: "Ride data fetched.", data: ride, statusCode: 200 })

    } catch (err) {
        return res.status(500).send({ message: "Error in fetching ride's data, Please try again.", statusCode: 500 })
    }

})

//for fetching user's owned rides
rideRouter.post('/owned-rides', async(req, res) => {
    const { userId } = req.body
    
    if(!userId) return res.status(404).send({ message: "Invalid user id.", statusCode: 404 })
        try {
            const rides = await Ride.find({ 'userId': userId })
            return res.status(200).send({ message: "Rides Fethced.", data: rides, statusCode: 200 })
        } catch(err) {
            return res.status(500).send({ message: "Error in fetching user's rides: "+err, statusCode: 500 })
        }
})

export default rideRouter