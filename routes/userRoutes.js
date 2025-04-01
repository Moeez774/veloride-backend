import { Router } from "express";
import { connectDB } from '../ConnectDB.js';
import Key from '../Key.js';
import { User } from "../models/user.js";
import bcrypt from 'bcrypt';
import { SignJWT } from "jose";
import { jwtVerify } from 'jose';

const router = Router()

connectDB()

const sectretKey = Key

router.post('/sign-up', async (req, res) => {
    const { _id, fullname, email, pass, confirmPass, number, city, remember, photo, isAgree, isProvider } = req.body;

    // Validate if any field is empty
    if (!fullname || !email || !pass || !confirmPass || !number || !city || !isAgree) {
        return res.status(400).send({ message: "Please fill in all the required fields.", statusCode: 400 })
    }

    if (!email.endsWith("@gmail.com")) return res.status(404).send({ message: "Invalid email address.", statusCode: 404 })

    // Check if passwords match
    if (pass !== confirmPass) {
        return res.status(400).send({ message: "Passwords do not match", statusCode: 400 })
    }

    for (let i = 0; i < number.length; i++) {
        const n = parseInt(number.charAt(i))
        if (Number.isNaN(n)) return res.status(404).send({ message: "Invalid phone number.", statusCode: 404 })
    }

    // Check if user with the same email exists
    const user = await User.findOne({ $and: [{ 'email': email }, { 'isProvider': false }] });

    if (!user) {
        try {
            const hashedPass = await bcrypt.hash(pass, 10);
            const newUser = new User({ _id, fullname, email, pass: hashedPass, number, city, remember, photo, isAgree, isProvider });
            await newUser.save()

            const key = new TextEncoder().encode(process.env.SECRET_KEY)

            const token = await new SignJWT({ _id: _id })
                .setProtectedHeader({ alg: 'HS256' })
                .setExpirationTime('1d')
                .sign(key)

            // Set cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                maxAge: 86400 * 1000, // 1 day
                path: '/'
            })

            return res.status(200).send({ message: "Signed up successfully", token: token, statusCode: 200 });

        } catch (err) {
            console.error(err);
            return res.status(500).send({ message: "Error signing up, Please try again." + err, statusCode: 500 });
        }

    } else {
        return res.status(409).send({ message: "This email is already registered. Please sign in.", statusCode: 409 });
    }
})

// api for sign in
router.post('/sign-in', async (req, res) => {
    const { email, pass, remember } = req.body;

    // Validate if any field is empty
    if (email === '' || pass === '') {
        return res.status(400).send({ message: "Please fill in all the required fields.", statusCode: 400 })
    }

    if (!email.endsWith("@gmail.com")) return res.status(404).send({ message: "Invalid email address.", statusCode: 404 })

    // Check if user with the same email exists
    const user = await User.findOne({ $and: [{ 'email': email }, { 'isProvider': false }] });

    if (user) {
        const _id = user._id
        try {
            const isMatched = await bcrypt.compare(pass, user.pass)

            if (isMatched) {

                // Set cookie for user's who choose to stay remember
                if (remember) {
                    const key = new TextEncoder().encode(process.env.SECRET_KEY)

                    const token = await new SignJWT({ _id: _id })
                        .setProtectedHeader({ alg: 'HS256' })
                        .sign(key)

                    // Set cookie
                    res.cookie('token', token, {
                        httpOnly: true,
                        secure: false,
                        sameSite: 'lax',
                        path: '/'
                    })
                    return res.status(200).send({ message: "Signed in successfully", token: token, statusCode: 200 })
                }

                // for user's whc didn't choose to be remember
                else {
                    const key = new TextEncoder().encode(process.env.SECRET_KEY)

                    const token = await new SignJWT({ _id: _id })
                        .setProtectedHeader({ alg: 'HS256' })
                        .setExpirationTime('1d')
                        .sign(key)

                    // Set cookie
                    res.cookie('token', token, {
                        httpOnly: true,
                        secure: false,
                        sameSite: 'lax',
                        maxAge: 86400 * 1000, // 1 day
                        path: '/'
                    })
                    return res.status(200).send({ message: "Signed in successfully", token: token, statusCode: 200 })
                }

            }
            else {
                return res.status(404).send({ message: "The password is incorrect. Please try again.", statusCode: 404 })
            }

        } catch (err) {
            console.error(err);
            return res.status(500).send({ message: "Error signing in, Please try again." + err, statusCode: 500 });
        }

    } else {
        return res.status(409).send({ message: "No account found with this email. Please try again or sign up.", statusCode: 409 });
    }
})

// api for authrizing user if token is valid
router.get('/auth', async (req, res) => {
    const cookie = req.cookies?.token;

    if (!cookie) {
        return res.status(404).send({ message: "User not verified. Please sign in.", statusCode: 404 });
    }

    try {
        const secret = new TextEncoder().encode(process.env.SECRET_KEY)
        const { payload } = await jwtVerify(cookie, secret)

        return res.status(200).send({
            message: "Authorization completed successfully",
            statusCode: 200,
            user: payload
        })

    } catch (err) {
        console.error("JWT Verification Error:", err);
        return res.status(403).send({
            message: "Invalid or expired token. Please sign in again.",
            statusCode: 403
        })
    }
})

// for getting user's data
router.get('/user-data', async (req, res) => {
    const cookie = req.cookies?.token;

    // Return if cookie is not present meaning the user is not logged in
    if (!cookie) {
        return res.status(404).send({ message: "User not verified. Please sign in.", statusCode: 404 });
    }

    try {
        const secret = new TextEncoder().encode(process.env.SECRET_KEY)
        const { payload } = await jwtVerify(cookie, secret)

        const user = await User.findOne({ '_id': payload._id })

        if (!user) {
            return res.status(404).send({ message: "User not found.", statusCode: 404 })
        }

        return res.status(200).send({ message: "Fetched", data: user, statusCode: 200 })
    } catch (err) {
        console.error("Error in fetching user's data:", err);
        return res.status(500).send({ message: "Error in fetching user's data", statusCode: 500 })
    }
})


router.get('/log-out', async (req, res) => {


    try {
        const token = req.cookies?.token
        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/',
            expires: new Date(0),
        })

        return res.status(200).send({ message: "Logged out successfully", statusCode: 200 })
    }
    catch (err) {
        return res.status(500).send({ message: "Error logging out, Please try again.", statusCode: 500 })
    }

})

router.post('/providers-sign-in', async (req, res) => {
    const { _id, fullname, email, pass, number, city, remember, photo, isAgree, isProvider } = req.body

    // Check if user with the same email exists
    const user = await User.findOne({ '_id': _id });

    try {
        if (!user) {

            // for validating phone number
            if (number === '' || city === '' || !isAgree) {
                return res.status(400).send({ message: "Please fill in all the required fields.", statusCode: 400 })
            }

            for (let i = 0; i < number.length; i++) {
                const n = parseInt(number.charAt(i))
                if (Number.isNaN(n)) return res.status(404).send({ message: "Invalid phone number.", statusCode: 404 })
            }

            const newUser = new User({ _id, fullname, email, pass: pass, number, city, remember, photo, isAgree, isProvider });
            await newUser.save()
        }

        // key for saving token in cookies
        const key = new TextEncoder().encode(process.env.SECRET_KEY)

        const token = await new SignJWT({ _id: _id })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('1d')
            .sign(key)

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 86400 * 1000, // 1 day
            path: '/'
        })

        return res.status(200).send({ message: "Signed in successfully", token: token, statusCode: 200 });

    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: "Error signing in, Please try again." + err, statusCode: 500 });
    }
})

// for checking user exist or not with specfic information
router.post('/check-user', async (req, res) => {
    const { _id } = req.body

    if (!_id) return res.status(404).send({ message: "Please provide Id for fetching user's data.", statusCode: 404 })

    try {

        const user = await User.findOne({ '_id': _id })
        return res.status(200).send({ message: "Checked", user: user, statusCode: 200 })

    } catch (err) {
        return res.status(500).send({ message: "Error checking user's existance.", statusCode: 500 })
    }
})

// for reseting password
router.post('/reset-password', async (req, res) => {
    const { email, newPassword } = req.body

    try {
        if (email === '' || newPassword === '') return res.status(404).send({ message: "Please fill out all fields.", statusCode: 404 })

        if (!email.endsWith("@gmail.com")) return res.status(404).send({ message: "Invalid email address.", statusCode: 404 })

        if (newPassword.length < 4) return res.status(404).send({ message: "Password is too short. Please try strong password.", statusCode: 404 })

        const user = await User.findOne({ $and: [{ 'email': email }, { 'isProvider': false }] })

        if (user) {

            const hashedPass = await bcrypt.hash(newPassword, 10)

            await User.updateOne({ $and: [{ 'email': email }, { 'isProvider': false }] }, { $set: { 'pass': hashedPass } })

            return res.status(200).send({ message: "Password changed successfully. Now you can sign in again.", statusCode: 200 })
        }
        else {
            return res.status(404).send({ message: "No account found with this email. Please try again or sign up.", statusCode: 404 })
        }

    } catch (err) {
        return res.status(500).send({ message: "Error resetting password, Please try again.", statusCode: 500 })
    }
})

export default router;