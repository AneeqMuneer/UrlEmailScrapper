const express = require("express");
const app = express();
const middleware = require("./Middleware/error");
const cors = require("cors");
const path = require("path");

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options('*', cors());

app.use(express.json());

app.use(express.static(path.join(__dirname, 'Public')));

const ScrapperRoutes = require("./Routes/scrapperRoutes");

app.use("/Scrapper", ScrapperRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

app.use(middleware);
module.exports = app;