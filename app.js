const express = require('express');
const path = require('path');
const morgan = require('morgan'); //used for logging request details in console
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
/////////////////////////////////////////////////////////////////////////////////////////////////////



const app = express();
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));


///////////////////////////////////////
// Middleware Functions in Middleware stack
// *** order matters, it must be written before router handlers
///////////////////////////////////////
//middleware: express.json(). modifying incoming data
//app.use() to include middleware
//next number of middleware to apply for all routes

//serving static files
app.use(express.static(path.join(__dirname, 'public'))); //static file middleware

//set security http headers
app.use(helmet());

//dev. logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev')); //GET /api/v1/tours 200 6.195 ms - 10225
}

// limit requsts from same API
const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many request from this IP, please try again in an hour!'
});
app.use('/api', limiter);


//body parser, reading data from body into req.body
app.use(express.json({
    limit: '10kb'
}));
//cookie parser
app.use(cookieParser());

// data sanitization against NoSQL query injection ex: "email": {"$gt": ""}
app.use(mongoSanitize());

// data sanitization against XSS( cross site scripting ) ex: from mallacious html code
app.use(xss());

// preventing parameter pollution, repeating unecessary params 
app.use(hpp({
    whitelist: ['duration', 'ratingsAverage', 'maxGroupSize', 'difficulty', 'price']
}));

app.user(compression());


// app.use((req, res, next) => {
//     console.log('Hello from the middleware');

//     //without next() method, it doesn't move to next middleware or process
//     next();
// });

//test middleware
app.use((req, res, next) => {
    req.requestTime = new Date().toISOString();
    // console.log(req.headers);
    // console.log(req.cookies);

    //without next() method, it doesn't move to next middleware or process
    next();
});




// below middleware to apply for specific routes only
// MOUNTING ROUTERS
//create sub application
//middleware

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);


//routes that are not handled above
app.all('*', (req, res, next) => {
    // res.status(404).json({
    //     status: 'fail',
    //     message: `Can't find ${req.originalUrl} on this server!`
    // });

    //create an error for text below
    // const err = new Error(`Can't find ${req.originalUrl} on this server!`);
    // err.status = 'fail';
    // err.statusCode = 404;

    // next(err); //in next(), if there is an argument, it directly move to error handling middleware
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 400));
});


//global error handling middleware
app.use(globalErrorHandler);


module.exports = app;