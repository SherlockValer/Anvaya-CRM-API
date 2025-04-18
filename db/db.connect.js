const mongoose = require('mongoose')

require('dotenv').config()

const anvayaURI = process.env.MONGODB

const connectDB = async() => {
    await mongoose.connect(anvayaURI, {dbName: "anvaya"})
    .then(() => console.log("Connected to database"))
    .catch((error) => console.log("Error connecting to database", error))
}

module.exports = {connectDB}