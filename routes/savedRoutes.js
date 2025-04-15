import { Router } from 'express'
import { SavedRoute } from '../models/savedroutes.js'

const savedRoutes = Router()

savedRoutes.post('/get-recents', async (req, res) => {
    const { userId } = req.body

    if (!userId) return res.status(404).send({ message: "Invalid user id.", statusCode: 404 })

    try {

        const recents = await SavedRoute.find({ 'userId': userId })

        return res.status(200).send({ message: "Fetched Successfully.", data: recents, statusCode: 200 })

    } catch (err) {
        return res.status(500).send({ message: "Error fetching recent searches, Please try again later." + err, statusCode: 500 })
    }
})

//for updating favoruite state
savedRoutes.post('/set-favorite', async (req, res) => {
    const { _id, isFavorite } = req.body

    if (!_id) return res.status(404).send({ message: "Invalid ride id.", statusCode: 404 })

    try {

        await SavedRoute.updateOne({ '_id': _id }, { $set: { 'isFavorite': isFavorite } })

        return res.status(200).send({ message: "Toggled successfully.", statusCode: 200 })

    } catch (err) {
        return res.status(500).send({ message: "Error toggling favorite state, Please try again." + err, statusCode: 500 })
    }
})

//for checking wether ride is favorite or not
savedRoutes.post('/get-favorite', async (req, res) => {
    const { _id } = req.body

    if (!_id) return res.status(404).send({ message: "Invalid ride id.", statusCode: 404 })

    try {

        const ride = await SavedRoute.findOne({ '_id': _id })

        return res.status(200).send({ message: "Checked successfully.", isFavorite: ride.isFavorite, statusCode: 200 })

    } catch (err) {
        return res.status(500).send({ message: "Error checking favorite state, Please try again." + err, statusCode: 500 })
    }
})

// for getting saved ride info using token
savedRoutes.post('/get-ride', async(req, res) => {
    const { token } = req.body

    if (!token) return res.status(404).send({ message: "Invalid token.", statusCode: 404 })

    try {

        const ride = await SavedRoute.findOne({ 'token': token })

        return res.status(200).send({ message: "fetched successfully.", data: ride, statusCode: 200 })

    } catch (err) {
        return res.status(500).send({ message: "Error in fetching this ride, Please try again." + err, statusCode: 500 })
    }
})

// for fecthing saved rides near user's location
savedRoutes.post("/fetchNearRides", async (req, res) => {
    const { userLocation, userId } = req.body

    if (!userLocation) return res.status(404).send({ message: "Invalid user's location.", statusCode: 404 })

    // fetching rides near user's location
    try {
        const rides = await SavedRoute.find(
            {
                'from.coordinates': {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: userLocation,
                        },
                        $maxDistance: 50000,
                    }
                }
        })

        return res.status(200).send({ message: "Rides fetched.", statusCode: 200, data: rides })
    } catch (err) {
        return res.status(500).send({ message: "Error fetching rides." + err, statusCode: 500, data: "Error" })
    }
})


export default savedRoutes