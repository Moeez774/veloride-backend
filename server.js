import express from 'express'
import http from 'http'
import cors from 'cors'
import router from './routes/userRoutes.js'
import cookieParser from 'cookie-parser'
import dataRouter from './routes/dataRoutes.js'
import rideRouter from './routes/ridesRoutes.js'
import { connectDB } from './ConnectDB.js'
import { Server } from 'socket.io'
import messageRouter from './routes/messageRoutes.js'
import savedRoutes from './routes/savedRoutes.js'
import fileRouter from './routes/uploadFilesRoutes/uploadfile.js'

const app = express()
const server = http.createServer(app)

connectDB()

app.use(cors({
    origin: 'http://localhost:3000',
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}))

app.use(express.json())
app.use(cookieParser())
app.use('/users', router)
app.use('/data', dataRouter)
app.use('/rides', rideRouter)
app.use('/messages', messageRouter)
app.use('/files', fileRouter)
app.use('/saved-routes', savedRoutes)

// asigning methods and port from where method will get
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    },
    allowEIO3: true,
    transports: ['websocket', 'polling']
});

// connecting and detecting by socket.io
io.on("connection", (socket) => {

    // Emit to the connected client
    socket.emit("onConnection", `User with ID ${socket.id} has connected.`)
    // socket.on("disconnect", () => {
    //     console.log(`User disconnected: ${socket.id}`)
    // })

    socket.on('request', (data) => {
        socket.broadcast.emit('userRequest', 'Give data to user')
    })

    // Receiving driver info and broadcasting to all clients
    socket.on('avl.driver', (data) => {
        socket.broadcast.emit('available_drivers', data)
    })

    // for detecting driver movement
    socket.on('driverMoved', (data) => {
        socket.broadcast.emit("driverLocationChanged", data)
    })

    // joining user to chat Room
    socket.on('joinRoom', (chat_id) => {
        socket.join(chat_id)
    })

    //sending message to spefici user who is present in room
    socket.on("newMessage", (data) => {
       io.to(data.chat_id).emit("message-sent", data.data)
       socket.to(data.chat_id).emit("unRead-message", data.data)
    })

    // for handling live typing
    socket.on("typing", (chat_id) => {
        socket.to(chat_id).emit("typing", (chat_id))
    })

    socket.on("stopTyping", (chat_id) => {
        socket.to(chat_id).emit("stopTyping", (chat_id))
    })

    //for adding contact in real time
    socket.on("add-contact", (data) => {
        io.emit("add-contact", data)
    })

})

app.get('/', (req, res) => {
    res.send("Hello")
})

const PORT = 4000
server.listen(PORT, () => {
    console.log(`Server is listening on ${PORT} port`)
})