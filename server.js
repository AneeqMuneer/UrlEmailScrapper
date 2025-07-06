const app = require("./app.js");

process.on("uncaughtException" , (err) => {
    console.log(`Error: ${err.message}`);
    console.log("Exiting the process due to an uncaught exception");
    process.exit(1);
});

const server = app.listen(4000 , () => {
    console.log(`Server is running on http://localhost:4000/`);
})

process.on("unhandledRejection" , (err) => {
    console.log(`Error: ${err.message}`);
    console.log("Shutting down the server due to an uncaught exception");
    server.close(() => {
        process.exit(1);
    });
})