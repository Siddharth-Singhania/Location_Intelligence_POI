import connectDB from "./db/index.js"
import dotenv from "dotenv"
import {User} from "./models/user.models.js"

dotenv.config({
    path: './env'
})
connectDB()

