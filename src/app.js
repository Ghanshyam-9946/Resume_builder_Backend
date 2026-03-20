const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")

const app = express()

const allowedOrigins = [
    "http://localhost:5173",
    "https://resume-builder-frontend-ashy-nine.vercel.app"
]

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}))

app.use(express.json())
app.use(cookieParser())

app.get("/", (req, res) => {
    res.send("API running 🚀")
})

const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")

app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)

module.exports = app