
import { app } from "./app.js";
import connectDB from "./db/index.js";
import dotenv  from "dotenv";

dotenv.config({
    path:'./env'
})
connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`server is running on port ${process.env.PORT || 8000}`)
    });
    app.on("error", (error) =>{
        console.log("Error:", error)
    })
})
.catch((error) => console.log("Mongo DB Connection Fail!!!", error))



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