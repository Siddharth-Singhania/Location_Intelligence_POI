import mongoose from "mongoose"

const userSchema = new mongoose.Schema(
    {
        address: { 
            type: String,
            required: true 
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                required: true,
                default: 'Point'
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
        },
        category: { 
            type: String,
            required: true 
        },
        type: { 
            type: String,
            required: true  
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