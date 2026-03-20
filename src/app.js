const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")

const app = express()

// ✅ Allowed origins (FIXED)
const allowedOrigins = [
    "http://localhost:5173",
    "https://resume-builder-frontend-ashy-nine.vercel.app"
]

// ✅ CORS setup (FINAL FIX)
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true)

        if (allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            console.log("Blocked by CORS:", origin) // 🔥 debug
            callback(new Error("Not allowed by CORS"))
        }
    },
    credentials: true
}))

// 🔥 preflight fix (VERY IMPORTANT)
app.options("*", cors({
    origin: allowedOrigins,
    credentials: true
}))

// ✅ Middlewares
app.use(express.json())
app.use(cookieParser())

// ✅ Test route
app.get("/", (req, res) => {
    res.send("API running 🚀")
})

/* routes */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")

app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)

module.exports = app