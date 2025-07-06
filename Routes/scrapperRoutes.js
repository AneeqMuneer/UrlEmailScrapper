const express = require("express");
const { ScrapEmails } = require("../Controller/scrapperController");

const router = express.Router();

router.post("/ScrapEmails", ScrapEmails);

module.exports = router;