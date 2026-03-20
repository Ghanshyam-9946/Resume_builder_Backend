const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")

const app = express()

// ✅ Allowed origins (IMPORTANT)
const allowedOrigins = [
    "http://localhost:5173",
    "resume-builder-frontend-git-main-ghanshyam-9946s-projects.vercel.app"
]

// ✅ CORS setup (FINAL FIX)
app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (Postman etc.)
        if (!origin) return callback(null, true)

        if (allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error("Not allowed by CORS"))
        }
    },
    credentials: true
}))

// ✅ Middlewares
app.use(express.json())
app.use(cookieParser())

// ✅ Test route (important for checking)
app.get("/", (req, res) => {
    res.send("API running 🚀")
})

/* require all the routes here */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")

/* using all the routes here */
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)

module.exports = app