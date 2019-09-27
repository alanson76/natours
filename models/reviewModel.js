//NESTED ROUTES
//posting a review ... POST : /tour/tour_id/reviews
//getting reviews ... GET : /tour/tour_id/reviews
//getting reviews ... GET : /tour/tour_id/reviews/review_id

const mongoose = require('mongoose');

const Tour = require('./tourModel');


const reviewSchema = mongoose.Schema({
    review: {
        type: String,
        required: [true, 'Review can not be empty'],
        trim: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    createAt: {
        type: Date,
        default: Date.now
    },
    tour: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'Review must belong to a tour.']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Review must belong to a user.']
    }
}, { //show field not in the documents, extra fields to show up
    toJSON: {
        virtual: true
    },
    toObject: {
        virtual: true
    }
});

//prevent a user to write multiple reviews for the same tour
reviewSchema.index({
    tour: 1,
    user: 1
}, {
    unique: true
});

//virtual properties
// reviewSchema.virtual('AgeOfReview').get(function () {
//     return this.duration / 7;
// });



//middlewares
reviewSchema.pre(/^find/, function (next) {
    // this.populate({
    //     path: 'tour',
    //     select: 'name'
    // }).populate({
    //     path: 'user',
    //     select: 'name photo'
    // });

    //minimizing the data for saving transaction time and data leak
    this.populate({
        path: 'user',
        select: 'name photo'
    });

    next();
});

//mongoose static methods
reviewSchema.statics.calcAverageRatings = async function (tourId) {
    //aggregation pipeline
    const stats = await this.aggregate([{
            $match: {
                tour: tourId
            }
        },
        {
            $group: {
                _id: '$tour',
                nRating: {
                    $sum: 1
                },
                avgRating: {
                    $avg: '$rating'
                }
            }
        }
    ]);
    // console.log(stats);

    if (stats.length > 0) {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating
        });
    } else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 0,
            ratingsAverage: 4.5
        });
    }


};

//after a new review saved
reviewSchema.post('save', function () {
    //this points to current review
    this.constructor.calcAverageRatings(this.tour); //for static method, we need this.constructor
});

//review update and delete : query middleware, with we don't have access to the current document
//findByIdAndUpdate = findOneAndUpdate
//findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function (next) {
    this.review = await this.findOne(); //by executhing this query we get the document
    console.log(this.review); // stored the review to the its document to pass to post() event
    next();
});
reviewSchema.post(/^findOneAnd/, async function () {
    await this.review.constructor.calcAverageRatings(this.review.tour);
});


const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;