const express = require("express");
const app = express();
const middleware = require("./Middleware/error");
const cors = require("cors");

app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options('*', cors());

app.use(express.json());

app.use(express.static('Public'));

const ScrapperRoutes = require("./Routes/scrapperRoutes");

app.use("/Scrapper", ScrapperRoutes);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/Public/index.html');
});

app.use(middleware);
module.exports = app;