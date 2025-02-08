import mongoose from "mongoose"
import jwt from "jsonwebtoken";
import bcrypt, { hash } from "bcrypt";

const userSchema = new mongoose.Schema(
    {
        username:{
            type:String,
            required:true,
            unique:true,
            lowercase: true,
            trim: true,
            index: true
        },
        email:{
            type:String,
            required:true,
            unique:true,
            lowercase: true,
            trim: true,
        },
        fullname:{
            type:String,
            required:true,
            trim: true,
            index: true,
        },
        avatar:{
            type:String, // claudinary URL
            required:true,

        },
        coverImage:{
            type:String,
        },
        watchHistory:[
            {
                type:mongoose.Schema.Types.ObjectId,
                ref:"Video",
            }
        ],
        password:{
            type:String,
            required:[true, "Password is required"],
        },
        refreshToken:{
            type: String,
        }
    },
    {
        timestamps:true,
    }
);

userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
})

userSchema.methods.isPasswordCorrect = async function(password){
    await bcrypt.compare(password, this.password);
}
export const User = mongoose.model("User", userSchema);