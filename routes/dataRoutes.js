import { Router } from "express";
import path from 'path'
import fs from 'fs'

const dataRouter = Router()

dataRouter.get('/', (req, res) => {

    try {
        const filePath = path.join(process.cwd(), 'data', 'navs.json')

        const features = fs.readFileSync(filePath, 'utf-8')
        const data = JSON.parse(features)

        return res.status(200).send({ message: "Fetched.", features: data, statusCode: 200 })
    } catch (err) {
        return res.status(200).send({ message: "Error while fetching data.", statusCode: 500 })
    }
})

// for getting subfeatures data

dataRouter.get('/sub-features', (req, res) => {

    try {
        const filePath = path.join(process.cwd(), 'data', 'mobileNavs.json')

        const subs = fs.readFileSync(filePath, 'utf-8')
        const data = JSON.parse(subs)

        return res.status(200).send({ message: "Fetched.", subs: data, statusCode: 200 })
    } catch (err) {
        return res.status(200).send({ message: "Error while fetching data.", statusCode: 500 })
    }
})

export default dataRouter