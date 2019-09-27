const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');



//Factory function that returns another function
exports.deleteOne = Model => catchAsync(async (req, res, next) => {


    //by convention in REST API, no response to client
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
        return next(new AppError('No Document found with that ID', 404));
    }

    res.status(204).json({ //204: deleted
        status: 'success',
        data: null
    });
});


exports.updateOne = Model => catchAsync(async (req, res, next) => {
    //for testing, in real world we don't use files
    // get the object want to update
    // modify
    // then patch

    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true, //new updated document
        runValidators: true
    });

    if (!doc) {
        return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            data: doc
        }
    });
});


exports.createOne = Model => catchAsync(async (req, res, next) => {

    const doc = await Model.create(req.body);

    res.status(201).json({ //status code 201 is for file created
        status: 'success',
        data: {
            data: doc
        }
    });
});


exports.getOne = (Model, populateOptions) => catchAsync(async (req, res, next) => {

    let query = Model.findById(req.params.id);
    if (populateOptions) query = query.populate(populateOptions);
    const doc = await query;

    if (!doc) {
        return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            data: doc
        }
    });
});

exports.getAll = Model => catchAsync(async (req, res) => {

    //to allow for nexted GET reviews on tour
    //endpoint with /tours/tour_Id/reviews
    let filter = {};
    if (req.params.tourId) filter = {
        tour: req.params.tourId
    }

    //2. execute query
    const features = new APIFeatures(Model.find(filter), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();

    // const doc = await features.query.explain(); //to see the querying performance
    const doc = await features.query;

    res
        .status(200)
        .json({
            status: 'success',
            // requestTime: req.requestTime,
            results: doc.length,
            data: {
                data: doc // tours: tours,
            }
        });
});