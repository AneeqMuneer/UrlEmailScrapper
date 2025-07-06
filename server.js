const app = require("./app.js");

process.on("uncaughtException", (err) => {
    console.log(`Error: ${err.message}`);
    console.log("Exiting the process due to an uncaught exception");
    process.exit(1);
});

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}/`);
})

process.on("unhandledRejection", (err) => {
    console.log(`Error: ${err.message}`);
    console.log("Shutting down the server due to an uncaught exception");
    server.close(() => {
        process.exit(1);
    });
})

// Export for Vercel
module.exports = app;