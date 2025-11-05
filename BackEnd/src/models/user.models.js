import mongoose from "mongoose"


export const GeoSchema = new mongoose.Schema({
    type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
        required: true
    },
    coordinates: {
        type: [Number],
        required: true,
        validate: {
            validator: function (v) {
                return v.length === 2;
            },
            message: props => `${props.path} must be [lon, lat]`
        }
    }
});

const userSchema = new mongoose.Schema(
    {
        address: { 
            type: String,
            required: true ,
            lowercase: true
        },
        location: {
            type: GeoSchema, // Explicitly use the nested schema
            required: true
        },
        category: { 
            type: String,
            required: true ,
            lowercase: true
        },
        type: { 
            type: String,
            required: true,
            lowercase: true
        },
        place_rank: { 
            type: Number, 
            default: 0 
        }, 
        importance: { 
            type: Number, 
            default: 0 
        }
    },{timestamps:true});

userSchema.index({ location: '2dsphere' });
userSchema.index({ category: 1 });
userSchema.index({ type: 1 });

export const UserData = mongoose.model("UserData",userSchema);