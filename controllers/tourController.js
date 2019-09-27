const multer = require('multer');
const sharp = require('sharp');
// const fs = require('fs');
const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');


///////////////////////////////////////
// Read String Data and Converting to JSON
///////////////////////////////////////
// read tours data(String to JSON object) synchronously
// we need load only once, therefore we load synchronously
//const tours = JSON.parse(fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`));
// console.log(toursJSON);


///////////////////////////////////////
//user param middleware to filter out wrong id
///////////////////////////////////////
// exports.checkID = (req, res, next, val) => {
//     console.log(`Tour id: ${val}`); //val is the value of id

//     if (req.params.id * 1 > tours.length) { //or
//         return res.status(404).json({
//             status: 'fail',
//             message: 'Invalid ID'
//         });
//     }

//     next();
// };
///////////////////////////////////////
//checkBody middleware to check out name and price property
///////////////////////////////////////
// exports.checkBody = (req, res, next) => {

//     if (!req.body.name || !req.body.price) { //or
//         return res.status(400).json({
//             status: 'fail',
//             message: 'Missing name or price'
//         });
//     }

//     next();
// };

// store images into memory
const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new AppError('Not an image! Please upload only images.', 400), false);
    }
}
const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

// single photo  upload.single('image') req.file
// array of photos   upload.array('images', 5)  req.files
exports.uploadTourImages = upload.fields([{
        name: 'imageCover',
        maxCount: 1
    },
    {
        name: 'images',
        maxCount: 3
    }
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
    // console.log(req.files);

    if (!req.files.imageCover || !req.files.images) return next();

    //1. imageCover
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

    await sharp(req.files.imageCover[0].buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({
            quality: 90
        }).toFile(`public/img/tours/${req.body.imageCover}`);


    //2. images
    req.body.images = [];
    await Promise.all(
        req.files.images.map(async (file, i) => {
            const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

            await sharp(file.buffer)
                .resize(2000, 1333)
                .toFormat('jpeg')
                .jpeg({
                    quality: 90
                }).toFile(`public/img/tours/${filename}`);

            req.body.images.push(filename);
        })
    );

    next();
});


///////////////////////////////////////
// Route Handlers
///////////////////////////////////////
exports.aliasTours = (req, res, next) => {
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage,price';
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
};


exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, {
    path: 'reviews'
});
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);


exports.getTourStats = catchAsync(async (req, res, next) => {

    const stats = await Tour.aggregate([{
            $match: {
                ratingsAverage: {
                    $gte: 4.5
                }
            }
        },
        {
            $group: {
                _id: {
                    $toUpper: '$difficulty'
                },
                // _id: '$ratingsAverage',
                // _id: '$difficulty',
                numTours: {
                    $sum: 1
                },
                numRatings: {
                    $sum: '$ratingsQuantity'
                },
                avgRating: {
                    $avg: '$ratingsAverage'
                },
                avgPrice: {
                    $avg: '$price'
                },
                minPrice: {
                    $min: '$price'
                },
                maxPrice: {
                    $max: '$price'
                },
            }
        }, {
            $sort: {
                avgPrice: 1
            }
        },
        // {
        //     $match: {
        //         _id: {
        //             $ne: 'EASY'
        //         }
        //     }
        // }
    ]);

    res.status(200).json({
        status: 'success',
        data: stats
    });


});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
    const year = req.params.year * 1;

    const plan = await Tour.aggregate([{
            $unwind: '$startDates'
        },
        {
            $match: {
                startDates: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`)
                }
            }
        },
        {
            $group: {
                _id: {
                    $month: '$startDates'
                },
                numTourStarts: {
                    $sum: 1
                },
                tours: {
                    $push: '$name'
                }
            }
        },
        {
            $addFields: {
                month: '$_id'
            }
        },
        {
            $project: {
                _id: 0
            }
        },
        {
            $sort: {
                numTourStarts: -1
            }
        },
        {
            $limit: 6
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: plan
    });

});

//// /tours-within/:distance/center/:latlng/unit/:unit
//// /tours-within/233/center/
exports.getToursWithin = catchAsync(async (req, res, next) => {
    const {
        distance,
        latlng,
        unit
    } = req.params;
    const [lat, lng] = latlng.split(',');
    // console.log(distance, lat, lng, unit);


    // converting to radian, miles or km
    const radius = (unit === 'mi') ? (distance / 3963.2) : (distance / 6378.1);
    // console.log(radius);

    if (!lat || !lng) {
        next(new AppError('Please provide latitude and longitude in the format lat,lng', 400));
    }
    // console.log(distance, lat, lng, unit);
    const tours = await Tour.find({
        startLocation: {
            $geoWithin: {
                $centerSphere: [
                    [lng, lat], radius
                ]
            }
        }
    });

    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            data: tours
        }
    });

});


exports.getDistances = catchAsync(async (req, res, next) => {
    const {
        distance,
        latlng,
        unit
    } = req.params;
    const [lat, lng] = latlng.split(',');
    // console.log(distance, lat, lng, unit);

    const multiplier = (unit === 'mi') ? 0.0000621317 : 0.0001;

    if (!lat || !lng) {
        next(new AppError('Please provide latitude and longitude in the format lat,lng', 400));
    }

    // console.log(distance, lat, lng, unit);
    const distances = await Tour.aggregate([{
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [lng * 1, lat * 1]
                },
                distanceField: 'distance',
                distanceMultiplier: multiplier
            }
        },
        {
            $project: {
                distance: 1,
                name: 1
            }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            data: distances
        }
    });
});



// console.log(req.params); // endpoint: /api/v1/tours/5 ==>  {id: 2}

//const id = req.params.id * 1; //when multiply string to number, we get number
// const tour = tours.find(el => el.id === id);
// // console.log(tour);

// res
//     .status(200)
//     .json({
//         status: 'success',
//         data: {
//             tour //tour : tour
//         }

//     });



// const newTour = new Tour({});
// newTour.save()

// express does not send body , so have to use middleware: app.use(express.json());
//console.log(req.body); // got data from client ex: { name: 'Test Tour', duration: 10, difficulty: 'easy' }

// const newId = tours[tours.length - 1].id + 1;
//Object.assing() method is used to copy the values of all enumerable own properties 
//from one or mour source objects to a target object.
// const newTour = Object.assign({
//     id: newId
// }, req.body); //{ id: 9, name: 'Test Tour', duration: 10, difficulty: 'easy',... }
// req.body is from middleware
// console.log(req.body);


// tours.push(newTour); // push new tour to the current tour array

//not to block event loop, we use async writeFile()
// fs.writeFile(`${__dirname}/dev-data/data/tours-simple.json`, JSON.stringify(tours), err => {
//     res.status(201).json({ //status code 201 is for file created
//         status: 'success',
//         data: {
//             tour: newTour
//         }
//     });
// });


// res.send('Done'); // send back to client what client need, we commented out because
// we already responded with res.json()
// res.json() and res.send() cannot use both, because they are samething