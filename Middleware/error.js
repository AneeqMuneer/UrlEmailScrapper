const ErrorHandler = require("../Utils/errorHandler");

module.exports = (err , req , res , next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";

    if(err.name === "CastError") {
        const message = `Resource not found. Invalid: ${err.path}`;
        err = new ErrorHandler(message , 400);
    }
    
    if(err.code === 11000) {
        const message = `Duplicate ${Object.keys(err.keyValue)} Entered`;
        err = new ErrorHandler(message , 400);
    }

    res.status(err.statusCode).json({
        success : false,
        message : err.message
    });
}