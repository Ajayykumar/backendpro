const cookieParser = require('cookie-parser')
const express = require('express')
const app = express()
const userSchema = require('./models/user')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const postSchema = require('./models/post')
const path  = require('path')  
const upload = require('./config/multerconfig')

 

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', "ejs")
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(cookieParser())

app.get('/', (req, res) => {
    res.render('index') 
})

app.get('/profile/upload',(req,res)=>{
    res.render('uploadprofilepic')
})

app.post('/upload',isloggedin,upload.single('image'),async(req,res)=>{
    let user  =await userSchema.findOne({email:req.user.email})
    if (!req.file) {
        return res.redirect("/profile/upload");
    }
    console.log(req.file.filename)
    user.profilepic = req.file.filename
    await user.save()
    console.log(req.file)
    console.log(req.user.email)
    res.redirect('/profile') 

})

app.post('/register', async (req, res) => { 
    const { username, name, email, password, age } = req.body
    const user = await userSchema.findOne({ email })
    if (user) { res.render('alert') }
    else {
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(password, salt, async (err, hash) => {
                const user = await userSchema.create({
                    username,
                    name,
                    email,
                    password: hash,
                    age
                })
                const token = jwt.sign({ email: email, id: user._id }, "ajayajay")
                res.cookie("token", token)
                res.redirect('/login')
            })
        })
    }
})


app.get("/like/:id", isloggedin, async (req, res) => {
    let post = await postSchema.findOne({ _id: req.params.id }).populate('user');

    if (post.likes.indexOf(req.user.id) === -1) {
        post.likes.push(post.user.id)
    } else {
        post.likes.splice(post.likes.indexOf(req.user.id), 1)
    }


    await post.save()
    res.redirect("/profile")
})


app.get('/edit/:id',isloggedin,async(req,res)=>{
    let post = await postSchema.findOne({ _id: req.params.id })
    res.render('edit',{post})
})

app.post('/update/:id',isloggedin,async(req,res)=>{
    let post = await postSchema.findOneAndUpdate({ _id: req.params.id },{content:req.body.content})
    res.redirect('/profile')
    
})



app.get('/login', (req, res) => {
    res.render('login')
})


app.get('/profile', isloggedin, async (req, res) => {

    const user = await userSchema.findOne({ email: req.user.email }).populate('post')

    res.render('profile', { user })
})


app.post("/post", isloggedin, async (req, res) => {
    let user = await userSchema.findOne({ email: req.user.email })
    let { content } = req.body

    let post = await postSchema.create({
        user: user._id,
        content
    })

    user.post.push(post._id)
    await user.save()
    res.redirect("/profile")

})


app.post('/login', async (req, res) => {
    const { email, password } = req.body
    const user = await userSchema.findOne({ email })
    if (!user) {
        res.render("usernotfnd")

    } else {

        bcrypt.compare(password, user.password, (err, result) => {
            if (err) { res.render("usernotfnd") }

            if (result) {
                const token = jwt.sign({ email: email, id: user._id }, "ajayajay")
                res.cookie("token", token)
                res.redirect("/profile")
            } else (
                res.render("usernotfnd")

            )
        })
    }
})


app.get('/logout', (req, res) => {
    res.cookie('token', "")
    res.redirect('/login')
})


function isloggedin(req, res, next) {
    if (req.cookies.token === "") {
        res.send("you must be login first")
    } else {
        const data = jwt.verify(req.cookies.token, "ajayajay")
        req.user = data;

    }
    next()
}


app.listen(4000)