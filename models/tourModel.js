const mongoose = require('mongoose');
const slugify = require('slugify');

// const User = require('./userModel');
// const validator = require('validator');

const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: [true, 'A tour must have a name'],
        unique: true,
        maxlength: [40, 'A tour name must have less or equal to 40 characters'],
        minlength: [10, 'A tour name must have more or equal to 10 characters'],
        // validate: [validator.isAlpha, 'Tour name only contain charaters']
    },
    slug: String,

    duration: {
        type: Number,
        required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
        type: Number,
        required: [true, 'A tour must have a groupsize']
    },
    difficulty: {
        type: String,
        required: [true, 'A tour must have a difficulty'],
        enum: {
            values: ['easy', 'medium', 'difficult'],
            message: 'Difficulty is either:  easy, medium, difficult'
        }
    },
    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1, 'Rating must be above 1.0'],
        max: [5, 'Rating must be below 5.0'],
        set: val => Math.round(val * 10) / 10 // 4.666666 => 46.666666 => 47 => 4.7
    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: [true, 'A tour must have a price']
    },
    priceDiscount: {
        type: Number,
        validate: {
            validator: function (val) {
                // this only points to current doc on new document creation
                return val < this.price;
            },
            message: 'Discount price ({VALUE}) should be below regular price'
        }
    },
    summary: {
        type: String,
        trim: true,
        required: [true, 'A tour must have a summary']
    },
    description: {
        type: String,
        trim: true
    },
    imageCover: {
        type: String,
        required: [true, 'A tour must have a cover image']
    },
    images: [String],
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false
    },
    startDates: [Date],
    secretTour: {
        type: Boolean,
        default: false
    },
    startLocation: {
        //GeoJSON: geo spatial data
        //child objects
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String
    },
    locations: [{
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
    }],
    guides: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User' //reference to another model
    }]
}, {
    toJSON: {
        virtuals: true
    },
    toObject: {
        virtuals: true
    }
});

//indexing for searching perfomance
//{price: 1} 1 as ascending order , -1 as descending order
tourSchema.index({
    price: 1,
    ratingsAverage: -1
});

tourSchema.index({
    slug: 1
});

tourSchema.index({
    startLocation: '2dsphere'
});


//virtual properties
tourSchema.virtual('durationWeeks').get(function () {
    return this.duration / 7;
});

//virtual populate for child referencing to Reviews
tourSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'tour', // field name in Review Model
    localField: '_id' // what Review model is pointing to in this model
});

//document middleware: runs before .save() and .create()
tourSchema.pre('save', function (next) {
    this.slug = slugify(this.name, {
        lower: true
    });
    next();
});


// tour guides embedding idea, in model guides: Array
// tourSchema.pre('save', async function (next) {

//     const guidesPromises = this.guides.map(async id => await User.findById(id));
//     this.guides = await Promise.all(guidesPromises);

//     next();
// });


// tourSchema.pre('save', function (next) {
//     console.log('will save document...');
//     next();
// });
// tourSchema.post('save', function (doc, next) {
//     console.log(doc);
//     next();
// });


// Query middleware before/after find...

//populating is important
//get matched object from one model to current model
tourSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt'
    });

    next();
});

tourSchema.pre('/^find/', function (next) {
    // tourSchema.pre('find', function (next) {
    this.find({
        secretTour: {
            $ne: true
        }
    });
    this.start = Date.now();
    next();
});
// tourSchema.post('/^find/', function (docs, next) {
//     console.log(`Query took ${Date.now() - this.start} ms!`);
//     // console.log(docs);
//     next();
// });



//aggregation middleware
// tourSchema.pre('aggregate', function (next) {
// console.log(this.pipeline());
// this.pipeline().unshift({
//     $match: {
//         secretTour: {
//             $ne: true
//         }
//     }
// });
// console.log(this.pipeline());
//     next();
// });


const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;