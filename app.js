require('dotenv').config();
const express=require("express");
const ejs=require("ejs");
const mongoose=require("mongoose");
const bcrypt=require("bcryptjs");
const cookieParser=require("cookie-parser");
const session=require("express-session"); 
const flush= require("connect-flash");
const jwt= require("jsonwebtoken");


const port=process.env.PORT || 3000;

const app=express();

app.set('view engine','ejs');
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(cookieParser());
app.use(session({
    secret:"secret",
    cookie:{maxAge:60000},
    resave:false,
    saveUninitialized:false
}))
app.use(flush());

// console.log(process.env.SECRET_KEY)
mongoose.connect("mongodb://localhost:27017/websiteUsers",{
    useNewUrlParser:true,
    useUnifiedTopology:true,
    useCreateIndex:true
}).then(()=>{
    console.log("connection successful");
}).catch((err)=>{
    console.log(err);
})
const guestSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
        
    },
    mobile:{
        type:Number,
        required:true
    },
    message:{
        type:String,
        required:true
    }
      
})   
const Guest= new mongoose.model("Guest",guestSchema);

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    cpassword:{
        type:String,
        required:true
    },
    age:{
        type:Number,
        required:true
    },
    gender:{
        type:String,
        required:true
    },
    tokens:[{
        token:{
            type:String,
            required:true
        }
    }]
})   

// generating token
userSchema.methods.generateAuthToken= async function(){
    try {
        const token= jwt.sign({_id:this._id.toString()}, process.env.SECRET_KEY);
        this.tokens= this.tokens.concat({token:token})
        await this.save();
        console.log("token is "+ token);
        return token;
    } catch (error) {
        res.send("the error part "+ error)
        console.log("the error part "+ error);
    }
}


// hashing password
userSchema.pre("save", async function(next){

    if(this.isModified("password")){
        // console.log(`${this.password}`);
        this.password=await bcrypt.hash(this.password, 10);
        this.cpassword=await bcrypt.hash(this.cpassword, 10);
        // console.log(`${this.password}`);

        // this.cpassword=undefined;
    }
    
    next();
})
const User= new mongoose.model("User",userSchema);

// Authorization
const auth = async (req, res, next)=>{
    try {
        
    const token = req.cookies.jwt;

    const verifyUser = jwt.verify(token, process.env.SECRET_KEY);
    console.log(verifyUser); 

    const usertoken= await User.findOne({_id:verifyUser._id});
    console.log(usertoken);

    req.token=token;
    req.usertoken=usertoken;

    next();

    } catch (error) {
        res.status(401).send("<h1>LOGIN REQUIRED!!!</h1>");
    }
}


app.get("/",function(req,res) {
    res.sendFile(__dirname + "/index.html")
})
app.get("/home",function(req,res) {
    res.sendFile(__dirname + "/index.html")
})
app.get("/logout", auth , async function(req,res) {
    console.log(req.usertoken);
    res.clearCookie("jwt");
     await req.usertoken.save();
    res.redirect("/")

})

app.get("/login",function(req,res) {
    res.render("login",{message: req.flash('message')})
})
app.get("/main", auth , function(req,res) {
    res.sendFile(__dirname + "/main.html")
})
app.post("/contact", async function(req,res) {
    try {
        const guestMessage= new Guest({
            name:req.body.name,
            email:req.body.email,
            mobile:req.body.mobile,
            message: req.body.message
        })
        const Message=await guestMessage.save();
                
                res.status(201).redirect("/")
    } catch (error) {
        res.send(error)
    }
    
})
app.post("/login",async function(req,res){
    try {
        
        const email=req.body.email;
        const password=req.body.password;
        const usermail = await User.findOne({email:email});
        const isMatch=await bcrypt.compare(password, usermail.password);
        const token= await usermail.generateAuthToken();
            console.log(" the token part "+ token);
            res.cookie("jwt", token,{
                
                httpOnly:true
            });
            console.log(`this is cookie ${req.cookies.jwt}`);
        
        if(isMatch)
        {
            res.status(201).redirect("/main")
        }else{
            // res.status(501).send("invalid credentials")
            req.flash('message','Invalid Credentials! Try Again!')
            res.redirect("/login")
        }

    } catch (error) {
        res.send(error)
        console.log(error);
    }
})
app.post("/signup",async function(req,res){
    try {
        
        const password=req.body.password;
        const cpassword=req.body.cpassword;
        if(password===cpassword){
            const registerUser= new User({
                name:req.body.name,
                email:req.body.email,
                password:req.body.password,
                cpassword:req.body.cpassword,
                age:req.body.age,
                gender:req.body.gender
            })

            console.log("the success part "+ registerUser);
            const token= await registerUser.generateAuthToken();
            console.log(" the token part "+ token);

            res.cookie("jwt", token,{
                
                httpOnly:true
            });


            const registered=await registerUser.save();
            console.log("the page part "+registered);
            // res.sendFile(`${__dirname}/main.html`)
            res.status(201).redirect("/main")
        }else{
            res.send("Passwords are not matching!")
        }
    } catch (error) {
        res.send(error);
    }
})

app.get("/mealplan", auth ,(req, res) => {
        res.sendFile(__dirname + "/dietplan.html");
    })



// lockdown special
app.get("/ls1", auth ,function(req,res){
    var a="https://www.youtube.com/embed/w0OWFjfI3zM?list=PLoVy-85EFtK92qMfHTNZi0BAA3T1AbDys"
    var b="Side Crunches"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/ls2", auth ,function(req,res){
    var a="https://www.youtube.com/embed/9bR-elyolBQ?list=PLoVy-85EFtK92qMfHTNZi0BAA3T1AbDys"
    var b="Heel Touch"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/ls3", auth ,function(req,res){
    var a="https://www.youtube.com/embed/DJQGX2J4IVw?list=PLoVy-85EFtK92qMfHTNZi0BAA3T1AbDys"
    var b="Russian Twist"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/ls4", auth ,function(req,res){
    var a="https://www.youtube.com/embed/DMwRPGMPB10?list=PLoVy-85EFtK92qMfHTNZi0BAA3T1AbDys"
    var b="Child Pose"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/ls5", auth ,function(req,res){
    var a="https://www.youtube.com/embed/q46qN4ypiFo?list=PLoVy-85EFtK92qMfHTNZi0BAA3T1AbDys"
    var b="Cobras"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})

// full body
app.get("/fb1", auth ,function(req,res){
    var a="https://www.youtube.com/embed/u6oYV3aaKNc"
    var b="High-Stepping"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/fb2", auth ,function(req,res){
    var a="https://www.youtube.com/embed/txLE-jOCEsc?list=PLoVy-85EFtK899UosmFY3vviTqy4s47-q"
    var b ="jumping Squats"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/fb3", auth ,function(req,res){
    var a="https://www.youtube.com/embed/bXMQkRowNk8?list=PLoVy-85EFtK899UosmFY3vviTqy4s47-q"
    var b ="Dead Bug"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/fb4", auth ,function(req,res){
    var a="https://www.youtube.com/embed/ZY2ji_Ho0dA?list=PLoVy-85EFtK899UosmFY3vviTqy4s47-q"
    var b ="Inchworm"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/fb5", auth ,function(req,res){
    var a="https://www.youtube.com/embed/818SkLAPyKY?list=PLoVy-85EFtK899UosmFY3vviTqy4s47-q"
    var b ="Burpees"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})


// abs workout
app.get("/jumpingJack", auth ,function(req,res){
    var a="https://www.youtube.com/embed/2W4ZNSwoW_4"
    var b ="Jumping Jacks"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/plank", auth ,function(req,res){
    var a="https://www.youtube.com/embed/Fcbw82ykBvY"
    var b ="Plank"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})

app.get("/acrunch", auth ,function(req,res){
    var a="https://www.youtube.com/embed/RUNrHkbP4Pc"
    var b ="Abdominal Crunches"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/cobraStretch", auth ,function(req,res){
    var a="https://www.youtube.com/embed/z21McHHOpAg"
    var b ="Cobra Stretch"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/CrossoverCrunches", auth ,function(req,res){
    var a="https://www.youtube.com/embed/q2_KHKE5CDE"
    var b ="Crossover Crunches"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})

// Chest exrcises
app.get("/pushup", auth ,function(req,res){
    var a="https://www.youtube.com/embed/eMQuAjuPCV0" 
    var b ="Push-Ups"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/waPushup", auth ,function(req,res){
    var a="https://www.youtube.com/embed/kBREQ4OSds8"
    var b ="Wide Arm Push-Ups"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/kPushup", auth ,function(req,res){
    var a="https://www.youtube.com/embed/KFxW5amBbsw"
    var b ="Knee Push-Ups "
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/HinduPushup", auth ,function(req,res){
    var a="https://www.youtube.com/embed/HE0ijmUc6Og"
    var b ="Hindu Push-Ups"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/shoulerstretch", auth ,function(req,res){
    var a="https://www.youtube.com/embed/d6pWDbmVp1U"
    var b ="Shoulder Stretch"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})

// Arm Exercises
app.get("/arm1", auth ,function(req,res){
    var a="https://www.youtube.com/embed/geNkbcZ6qDo"
    var b ="Floor Tricep Dips"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/arm2", auth ,function(req,res){
    var a="https://www.youtube.com/embed/wbSSlYNratA"
    var b ="Military Push-ups"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/arm3", auth ,function(req,res){
    var a="https://www.youtube.com/embed/pFrJQ-MyL10?list=PLoVy-85EFtK-KiUrONIzBciACQgdGFY3Q"
    var b ="Arm Scissors"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/arm4", auth ,function(req,res){
    var a="https://www.youtube.com/embed/IeQOUoU-kDw?list=PLoVy-85EFtK-KiUrONIzBciACQgdGFY3Q"
    var b ="Bicep Curls"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/arm5", auth ,function(req,res){
    var a="https://www.youtube.com/embed/wiyvVpEKOsc?list=PLoVy-85EFtK-KiUrONIzBciACQgdGFY3Q"
    var b ="Alternating Hooks"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})


// leg Exercises
app.get("/leg1", auth ,function(req,res){
    var a="https://www.youtube.com/embed/Z_0p0I8B4EU?list=PLoVy-85EFtK8P3K6PvayuzwTMMn_jFSav"
    var b ="Side Leg Raise"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/leg2", auth ,function(req,res){
    var a="https://www.youtube.com/embed/1J8mVmtyYpk?list=PLoVy-85EFtK8P3K6PvayuzwTMMn_jFSav"
    var b ="Lunges"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/leg3", auth ,function(req,res){
    var a="https://www.youtube.com/embed/JvA7t9xKWgg?list=PLoVy-85EFtK8P3K6PvayuzwTMMn_jFSav"
    var b ="Frog Press"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/leg4", auth ,function(req,res){
    var a="https://www.youtube.com/embed/vflAcwPOQbk?list=PLoVy-85EFtK8P3K6PvayuzwTMMn_jFSav"
    var b ="Squat Kicks"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/leg5", auth ,function(req,res){
    var a="https://www.youtube.com/embed/YRnePgJ7fLQ?list=PLoVy-85EFtK8P3K6PvayuzwTMMn_jFSav"
    var b ="Air Cycling"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})

//  shoulder and back Exercises
app.get("/sb1", auth ,function(req,res){
    var a="https://www.youtube.com/embed/W9y8xq4Ya_E?list=PLoVy-85EFtK8bQ9_ynO3sg_kXN3M2rHAg"
    var b ="Hyperextension"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/sb2", auth ,function(req,res){
    var a="https://www.youtube.com/embed/HTSdBBXRR6I?list=PLoVy-85EFtK8bQ9_ynO3sg_kXN3M2rHAg"
    var b ="Havyk Raises"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/sb3", auth ,function(req,res){
    var a="https://www.youtube.com/embed/OI-3e5Dcm-I?list=PLoVy-85EFtK8bQ9_ynO3sg_kXN3M2rHAg"
    var b ="Crab Walk"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/sb4", auth ,function(req,res){
    var a="https://www.youtube.com/embed/ahBd-oI76Zs?list=PLoVy-85EFtK8bQ9_ynO3sg_kXN3M2rHAg"
    var b ="Downward Facing Dog"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})
app.get("/sb5", auth ,function(req,res){
    var a="https://www.youtube.com/embed/Ax_94gEavYo?list=PLoVy-85EFtK8bQ9_ynO3sg_kXN3M2rHAg"
    var b ="Wood Chops"
    var p="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsa vitae quae facere quasi? Natus, tempore, alias, aperiam et labore magni consequuntur dolor culpa dolorum sequi ipsam repellendus in libero accusantium cupiditate assumenda aliquid dicta voluptatum! Provident, recusandae aliquam! Commodi, sequi?"
    res.render("main1",{a:a,b:b,p:p})
})


app.listen(port,function(){
    console.log("success");
})