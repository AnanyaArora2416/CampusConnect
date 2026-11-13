const mongoose=require('mongoose');
const schema=new mongoose.Schema({
 name:{type:String,required:true,trim:true,minlength:2,maxlength:100},
 email:{type:String,required:true,unique:true,trim:true,lowercase:true,maxlength:254},
 password:{type:String,required:true,select:false},
 role:{type:String,enum:['student','teacher','admin'],default:'student'},
 status:{type:String,enum:['active','disabled'],default:'active'},
 tokenVersion:{type:Number,default:0,select:false}
},{timestamps:true});
module.exports=mongoose.model('User',schema);
