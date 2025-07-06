const express = require("express");
const app = express();
const middleware = require("./Middleware/error");
const cors = require("cors");

app.use(cors({
    origin: "http://localhost:3000", // replace with your frontend url (use localhost originally and then the live one when deployed)
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options('*', cors());

app.use(express.json());

const ScrapperRoutes = require("./Routes/scrapperRoutes");

app.use("/Scrapper" , ScrapperRoutes);

app.use(middleware)
module.exports = app;