import { Router } from 'express'
import { Message } from '../models/message.js'
import { User } from '../models/user.js'

const messageRouter = Router()

//for sending message
messageRouter.post('/send-message', async (req, res) => {
    const { _id, chat_id, sender_id, receiver_id, message, senderName, receiverName, time, senderPhoto, receiverPhoto, isExist }
        = req.body

    if (message === '') return res.status(404).send({ message: "Message field is empty.", statusCode: 404 })

    try {

        //saving message
        await Message.create({ _id, chat_id, sender_id, receiver_id, message, senderName, receiverName, time, senderPhoto, receiverPhoto })

        //if this is first message of the chat then sender id will be add in receiver's contacts and also chat id and receiver id in sender contact with chat id
        if (!isExist) {

            await User.updateOne({ '_id': receiver_id }, { $push: { 'contacts': { 'contact_id': sender_id, 'chat_id': chat_id } } })

            await User.updateOne({ '_id': sender_id }, { $push: { 'contacts': { 'contact_id': receiver_id, 'chat_id': chat_id } } })
        }

        //updating latest message in both user's document
        await User.updateOne({ '_id': receiver_id, 'contacts.contact_id': sender_id }, { $set: { 'contacts.$.message': message, 'contacts.$.time': new Date() } })

        await User.updateOne({ '_id': sender_id, 'contacts.contact_id': receiver_id }, { $set: { 'contacts.$.message': message, 'contacts.$.time': new Date() } })

        return res.status(200).send({ message: "Sent successfully.", statusCode: 200 })


    } catch (err) {
        return res.status(500).send({ message: "Error in sending message, Please try again. " + err, statusCode: 500 })
    }
})

//for getting chat
messageRouter.post('/fetch-chat', async (req, res) => {
    const { chat_id } = req.body

    if (!chat_id) return res.status(404).send({ message: "Invalid Chat ID.", statusCode: 404 })

    try {

        const chats = await Message.find({ 'chat_id': chat_id })

        return res.status(200).send({ message: "Chat Fetched.", statusCode: 200, data: chats })


    } catch (err) {
        return res.status(500).send({ message: "Error fetching chat, Please try again later. " + err, statusCode: 500 })
    }
})

//for fetching contacts of user
messageRouter.post('/all-contacts', async (req, res) => {
    const { user_id } = req.body

    if (!user_id) return res.status(404).send({ message: "Invalid user id.", statusCode: 404 })

    try {

        const contacts = await User.find({ 'contacts.contact_id': user_id })

        return res.status(200).send({ message: "Contacts fethced.", data: contacts, statusCode: 200 })

    } catch (err) {
        return res.status(500).send({ message: "Error fetching contacts, Please try again.", statusCode: 500 })
    }
})

export default messageRouter