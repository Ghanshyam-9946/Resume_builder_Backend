require("dotenv").config()
const app = require("./src/app")
const connectToDB = require("./src/config/database")

connectToDB()

app.get('/get', (req,res)=>{
    res.send("hello api")
})

app.listen(3000, () => {
    console.log("Server is running on port 3000")
})