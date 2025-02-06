
import connectDB from "./db/index.js";
import dotenv  from "dotenv";

dotenv.config({
    path:'./env'
})
connectDB();
// This is the First way, How we can connect database
/*import express from "express";
const app = express()
;(async()=>{
    try {
     await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
     app.on("error", (error)=>{
        console.error("Error", error)
     })
     app.listen(process.env.PORT, () => {
        console.log(`App Listening on Port ${process.env.PORT}`)
     })
    } catch (error) {
        console.error("Error:", error)
    }
})()*/