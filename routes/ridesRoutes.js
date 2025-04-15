import { Router } from 'express'
import { Ride } from '../models/ride.js'
import { connectDB } from '../ConnectDB.js'
import { jwtVerify } from 'jose'
import { SavedRoute } from '../models/savedroutes.js'
import { CompletedRide } from '../models/completedrides.js'
import { v4 as uuidv4 } from 'uuid'

const rideRouter = Router()

connectDB()

rideRouter.post('/offer-ride', async (req, res) => {
    const { data } = req.body

    // returning error if all fields are not filled properly
    if (data.pickupName === '' || data.dropoffLocation === '' || data.date === '' || data.time === '' || data.vehicle === '' || (!data.number && !data.email)) {
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
            bookedSeats: 0,
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
            gender: data.gender,
        },

        //budget details
        budget: {
            totalBudget: data.totalBudget,
            negotiate: data.negotiate,
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
        const rides = await Ride.find({
            $and: [{ 'userId': { $ne: userId } },
            {
                'rideDetails.pickupLocation.coordinates': {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: userLocation,
                        },
                        $maxDistance: 100000,
                    }
                }
            }]
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
        const completedRide = await CompletedRide.findOne({ 'rideId': rideId })

        return res.status(200).send({ message: "Ride data fetched.", data: ride, completedRide: completedRide, statusCode: 200 })

    } catch (err) {
        return res.status(500).send({ message: "Error in fetching ride's data, Please try again.", statusCode: 500 })
    }

})

//for fetching user's owned rides
rideRouter.post('/owned-rides', async (req, res) => {
    const { userId } = req.body

    if (!userId) return res.status(404).send({ message: "Invalid user id.", statusCode: 404 })
    try {
        const rides = await Ride.find({ 'userId': userId })
        return res.status(200).send({ message: "Rides Fethced.", data: rides, statusCode: 200 })
    } catch (err) {
        return res.status(500).send({ message: "Error in fetching user's rides: " + err, statusCode: 500 })
    }
})

//for caluclating average price of two routes
rideRouter.post('/fetchPrice', async (req, res) => {
    const { pickupLocation, dropOffLocation, vehicle } = req.body

    const vehicles = { Compact_Car: 13, Sedan: 11, SUVs: 10, Luxury_Cars: 10 }

    if (vehicle === '') return res.status(404).send({ message: "Vehicle type not selected. Please choose one to proceed.", statusCode: 404 })

    const accessToken = 'pk.eyJ1IjoibW9lZXoxMjMiLCJhIjoiY204Z3p3cHNrMDUxbjJrcjhvbGYxanU2MyJ9.ErFjedlF8xF7QZQmyTnIiw';

    try {
        // fetching distance from pickup route to dropoff
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupLocation.long},${pickupLocation.lat};${dropOffLocation.long},${dropOffLocation.lat}?access_token=${accessToken}`

        const info = await fetch(url)
        const jsonInfo = await info.json()

        if (jsonInfo.code === 'Ok') {
            const route = jsonInfo.routes[0];
            const distance = (route.distance / 1000).toFixed(2)
            const fuelPrice = 256.63
            const realVehicle = vehicle.split(" ").join("_")

            //calculating fuel prices
            const totalFuelInLitre = distance / vehicles[realVehicle]
            const fuelCost = totalFuelInLitre * fuelPrice
            const price = Math.round(fuelCost * 1.10)

            //fare by bookedSeats
            const withZero = Math.round(price / (0 + 1.5))
            const withOne = Math.round(price / (1 + 1.5))
            const withTwo = Math.round(price / (2 + 1.5))
            const withThree = Math.round(price / (3 + 1.5))
            const withFour = Math.round(price / (4 + 1.5))

            const allFares = [
                {
                bookedSeats: 0,
                fare: withZero
            },
            {
                bookedSeats: 1,
                fare: withOne
            },
            {
                bookedSeats: 2,
                fare: withTwo
            },
            {
                bookedSeats: 3,
                fare: withThree
            },
            {
                bookedSeats: 4,
                fare: withFour
            }
            ]

            return res.status(200).send({ message: "Price fetched", price: price, allFares: allFares, statusCode: 200 })
        }
        else {
            return res.status(500).send({ message: "No average fare found for these routes. Please select valid locations.", statusCode: 500 })
        }
    } catch (err) {
        return res.status(500).send({ message: "Error fetching price for these routes, Please select your locations again." + err, statusCode: 500 })
    }
})

//function for macthing best ride
function findRide(rides, data) {
    const bestRides = rides.filter(ride => {
        const rideDate = new Date(ride.rideDetails.date).toISOString().split("T")[0]
        const preferredDate = String(data.date).split("T")[0]
        const rideTime = `${rideDate} ${ride.rideDetails.time}`
        const preferredTime = `${preferredDate} ${data.time}`

        //comverting in milliseconds for checking near user's time rides
        const rideDateInMs = new Date(rideTime).getTime()
        const preferredDateInMs = new Date(preferredTime).getTime()

        //appliying conditions for best match
        const withInTimeRange = (rideDateInMs >= preferredDateInMs) && (rideDateInMs - preferredDateInMs <= 86400000)
        const validBudget = Math.round(data.price * 1.10)
        const activeFare = ride.budget.totalBudget / (ride.rideDetails.bookedSeats + 1.5)
        const withinBudget = activeFare <= validBudget
        const withinSeats = (ride.rideDetails.seats - ride.rideDetails.bookedSeats) >= data.passengers

        return withInTimeRange && withinBudget && withinSeats
    })

    return bestRides
}

//for fetching cheapest rides
function fetchCheapest(rides) {
    // for taking cheapest rides
    let sortedRides = rides.filter(ride => ride)
    sortedRides.sort((a, b) => a.budget.totalBudget - b.budget.totalBudget)

    const cheapestRides = sortedRides.length / 2
    sortedRides = sortedRides.map((ride, index) => {
        if (sortedRides.length === 1 || index + 1 <= cheapestRides) return ride
    })
    return sortedRides
}

//for fetching preference based rides
function fetchPreferred(rides, data) {
    const preferredRides = rides.filter((ride) => {
        const luggageAllowed = ride.preferences.ridePreferences.luggageAllowed === data.luggage
        const petAllowed = ride.preferences.ridePreferences.petAllowed === data.petFriendly
        const smokingAllowed = ride.preferences.ridePreferences.smokingAllowed === data.smoking
        const rideType = ride.preferences.rideType===data.rideType

        if(data.gender==="Female") {
            const isFemale = data.gender===ride.preferences.gender

            return luggageAllowed && petAllowed && smokingAllowed && rideType && isFemale
        }

        return luggageAllowed && petAllowed && smokingAllowed && rideType
    })

    return preferredRides
}

//for saving searched rides
async function saveSearched(data, rides) {
    const searched = rides.map(async(ride) => {
        const token = uuidv4() // generating unqiue token for ride

        const searchedRoute = {
            _id: `${data.userId}-${ride._id}`,
            userId: data.userId,
            token: token,
            rideId: ride._id,
            from: {
                type: "Point",
                name: ride.rideDetails.pickupLocation.pickupName,
                coordinates: ride.rideDetails.pickupLocation.coordinates
            },
            to: {
                type: "Point",
                name: ride.rideDetails.dropoffLocation.dropoffName,
                coordinates: ride.rideDetails.dropoffLocation.coordinates
            },
            date: ride.rideDetails.date,
            time: ride.rideDetails.time,
            vehicle: ride.rideDetails.vehicle,
            currentFare: ride.budget.totalBudget / (ride.rideDetails.bookedSeats + 1.5),
            seats: ride.rideDetails.seats,
            bookedSeats: ride.rideDetails.bookedSeats,
            isCompleted: false,
            isFavorite: false
        }

        await SavedRoute.updateOne({ '_id': `${data.userId}-${ride._id}` }, {
            $set: searchedRoute
        }, { upsert: true })
    })

    await Promise.all(searched)
}

//finding best ride according to user's search
rideRouter.post('/find-ride', async (req, res) => {
    const { data } = req.body

    try {

        const pickupCoordinates = [data.location.long, data.location.lat]
        const dropoffCoordinates = [data.dropLocation.long, data.dropLocation.lat]

        // first checking any ride mathcing these coordinates
        const rides = await Ride.find({ $and: [{ 'rideDetails.pickupLocation.pickupName': { $eq: data.pickup } }, { 'rideDetails.dropoffLocation.dropoffName': { $eq: data.drop } }] })

        const matchedRides = findRide(rides, data)

        // if not then showing near rides for almost these routes
        if (matchedRides.length === 0) {
            const pickupRides = await Ride.find({
                'rideDetails.pickupLocation.coordinates': {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: pickupCoordinates,
                        },
                        $maxDistance: 100000,
                    }
                }
            })

            const dropoffRides = await Ride.find({
                'rideDetails.dropoffLocation.coordinates': {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: dropoffCoordinates,
                        },
                        $maxDistance: 100000,
                    }
                }
            })

            //checking both pickup and dropoff rides whther any ride have these pickup and dropoff location near user's routes
            const matchedRides = pickupRides.filter(pickupRide => {
                return dropoffRides.some(dropoffRide => dropoffRide.rideId === pickupRide.rideId);
            })

            if (matchedRides.length === 0) return res.status(404).send({ message: "Sorry, no exact routes or nearby rides were found for your selected locations.", statusCode: 404 })

            //for finding near best ride according to user's preferences
            const bestRides = findRide(matchedRides, data)

            if (bestRides.length === 0) return res.status(404).send({ message: "Sorry, no rides were found matching your preferred time, date, or budget.", statusCode: 404 })

            const sortedRides = fetchCheapest(bestRides)
            const preferredRides = fetchPreferred(bestRides, data)

            await saveSearched(data, bestRides)

            return res.status(200).send({ message: "Perfect rides matched.", rides: bestRides, cheapest: sortedRides, preferred: preferredRides, found: false, statusCode: 200 })

        }

        const sortedRides = fetchCheapest(matchedRides)
        const preferredRides = fetchPreferred(matchedRides, data)

        await saveSearched(data, matchedRides)

        return res.status(200).send({ message: "Matched Rides Fetched successfully.", rides: matchedRides, cheapest: sortedRides, preferred: preferredRides, found: true, statusCode: 200 })

    } catch (err) {
        return res.status(500).send({ message: "Error in fetching rides, Please try again." + err, statusCode: 500 })
    }

})

export default rideRouter