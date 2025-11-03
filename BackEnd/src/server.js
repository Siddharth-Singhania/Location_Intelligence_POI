import connectDB from "./db/index.js"
import {app} from './app.js'
import dotenv from "dotenv"


dotenv.config({
    path: './env'
})


const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Server (no DB) is running at port: ${port}`);
});
// connectDB()
// .then(()=>{
//     app.listen(process.env.PORT || 8000, ()=>{
//         console.log(`Server is running at port: ${process.env.PORT}`)
//     })
// })
// .catch((err)=>{
//     console.log("MongoDB connection failed!!! ",err)
// })



export default app;