import mongoose from "mongoose"
import { GeoSchema } from "./user.models.js";

const trainingSchema = new mongoose.Schema(
    {
        address: { 
            type: String,
            required: true ,
            lowercase: true
        },
        location: {
            type: GeoSchema,
            required: true
        },
        category: { 
            type: String, 
            required: true,
            lowercase: true
        }, 
        score: { 
            type: Number, 
            default: 0 
        },
        result:{
            type: String,
            required: true,
            lowercase: true
        },
        type: { 
            type: String, 
            required: true ,
            lowercase: true
        },
    }, { timestamps: true });

trainingSchema.index({ category: 1 });
trainingSchema.index({ type: 1 });

export const Training_Data = mongoose.model("Training_Data",trainingSchema)