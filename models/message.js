import mongoose from 'mongoose'

const Messages = new mongoose.Schema({
    _id: String,
    chat_id: String,
    sender_id: { type: String, required: true },
    receiver_id: { type: String, required: true },
    message: { type: String, required: true },
    senderName: String,
    receiverName: String,
    time: Date,
    senderPhoto: String,
    receiverPhoto: String,
})

export const Message = mongoose.models.Message || mongoose.model("Message", Messages)