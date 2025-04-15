import mongoose from "mongoose";

const Users = new mongoose.Schema({
    _id: String,
    fullname: String,
    email: String,
    pass: String,
    number: String,
    city: String,
    remember: Boolean,
    photo: String,
    isAgree: Boolean,
    isProvider: Boolean,
    contacts: [Object],
    gender: String
})

export const User = mongoose.models.User || mongoose.model("User", Users)