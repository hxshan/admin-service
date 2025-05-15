require('dotenv').config()
const express = require('express')
const app = express()
const cors = require("cors");
const corsOptions = require("./config/corsOptions");
const connection = require('./db')
const userRoutes = require("./routes/userRoutes")
const adminRoutes = require("./routes/adminRoutes")


//database
connection()

app.use(cors(corsOptions));

app.use(express.json());

//routes
app.use("/api/admin",userRoutes)
app.use("/api/adminAuth",adminRoutes)


// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Something went wrong!" });
});

const port = process.env.PORT || 5005;
app.listen(port, ()=> console.log(`Listening on port ${port}...`))

