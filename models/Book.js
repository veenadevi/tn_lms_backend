import mongoose from "mongoose";

const BookSchema = new mongoose.Schema({
    bookName:{
        type:String,
        required:true
    },
    bookId:{
        type:Number,
        required:true,
        default:0,
    },
    alternateTitle:{
        type:String,    
        default:""
    },
    author:{
        type:String,
        required:true
    },
    contributor:{
        type:String,
        default:""
    },
    language:{
        type:String,
        default:""
    },
    publisher:{
        type:String,
        default:""
    },
    donatedBy:{
        type:String,
        default:""
    },
    bookCountAvailable:{
        type:Number,
        required:true
    },
    bookStatus:{
        type:String,
        default:"Available"
    },
    bookPrice:{
        type: Number,
        default:100.00,
        
    },
    categories:[{ 
        type: mongoose.Types.ObjectId, 
        ref: "BookCategory" 
    }],
    transactions:[{
        type:mongoose.Types.ObjectId,
        ref:"BookTransaction"
    }]
},
{
    timestamps:true
})

export default mongoose.model("Book",BookSchema)