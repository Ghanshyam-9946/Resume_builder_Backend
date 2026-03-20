require("dotenv").config()
const app = require("./src/app")
const connectToDB = require("./src/config/database")

connectToDB()
const PORT = process.env.PORT || 3000
app.get('/get', (req,res)=>{
    res.send("hello api")
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})