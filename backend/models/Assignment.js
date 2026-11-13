const mongoose=require('mongoose');
const fileSchema=new mongoose.Schema({name:String,storedName:String,size:Number,mime:String},{timestamps:true});
const schema=new mongoose.Schema({
 title:{type:String,required:true,trim:true,maxlength:150},description:{type:String,required:true,maxlength:5000},subject:{type:String,required:true,maxlength:100},dueDate:{type:Date,required:true},
 maxMarks:{type:Number,default:100,min:1,max:1000},requirements:[{title:{type:String,maxlength:120},description:{type:String,maxlength:1000}}],resourceNotes:{type:String,default:'',maxlength:2000},resources:[fileSchema],
 createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},status:{type:String,enum:['draft','published'],default:'draft'},deletedAt:{type:Date,default:null}
},{timestamps:true,optimisticConcurrency:true});
schema.index({createdBy:1,deletedAt:1,createdAt:-1});schema.index({status:1,deletedAt:1,dueDate:1});
module.exports=mongoose.model('Assignment',schema);
