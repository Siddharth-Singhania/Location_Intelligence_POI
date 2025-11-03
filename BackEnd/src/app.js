import express from "express";
import cors from "cors"

const app = express();


app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))    

app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended:true, limit:"16kb"}))
app.use(express.static("public"));

import userRouter from './routes/user.routes.js'
import scoreRouter from './routes/score.routes.js'

app.use("/api/v1/user",userRouter)
app.use("/api/v1/score",scoreRouter)




export {app};