import mongoose from "mongoose"

const trainingSchema = new mongoose.Schema(
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
                type: [Number], // [lon, lat]
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
        POI: { 
            type: Number, 
            default: 0 
        },
        type: { 
            type: String, 
            required: true 
        }
    }, { timestamps: true });

trainingSchema.index({ category: 1 });
trainingSchema.index({ type: 1 });

export const Training = mongoose.model("Training",trainingSchema)