const express = require('express');

const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
const reviewRouter = require('./../routes/reviewRoutes');


///////////////////////////////////////
// Route
///////////////////////////////////////
//* only the call back function will live in call back queue
// app.get('/api/v1/tours', getAllTours);
// app.get('/api/v1/tours/:id', getTour);
// app.post('/api/v1/tours', createTour);
// app.put() for update whole
// app.patch() for update single object
// app.patch('/api/v1/tours/:id', updateTour);
// just for testing,
// app.delete('/api/v1/tours/:id', deleteTour);
//CREATING ROUTERS 
//create new router and save to a variable
const router = express.Router();

//middleware function to handle with parameters
// router.param('id', tourController.checkID);

//NESTED ROUTES
//posting a review ... POST : /tour/tour_id/reviews
//getting reviews ... GET : /tour/tour_id/reviews
//getting reviews ... GET : /tour/tour_id/reviews/review_id
// redirecting to reviewRoute, basically mouting a route
router.use('/:tourId/reviews', reviewRouter);

router
    .route('/top-5-cheap')
    .get(tourController.aliasTours, tourController.getAllTours);

router
    .route('/tour-stats')
    .get(tourController.getTourStats);

router
    .route('/monthly-plan/:year')
    .get(
        authController.protect,
        authController.restricTo('admin', 'lead-guide', 'guide'),
        tourController.getMonthlyPlan);

// /tours-distance?distance=233&center=-40,45&unit=mi
// /tours-distance/233/center/-40,45/unit/mi
router
    .route('/tours-within/:distance/center/:latlng/unit/:unit')
    .get(tourController.getToursWithin);

router
    .route('/distances/:latlng/unit/:unit')
    .get(tourController.getDistances);

router
    .route('/') // mini-app of /api/v1/tours
    .get(tourController.getAllTours)
    .post(authController.protect, authController.restricTo('admin', 'lead-guide'), tourController.createTour);
// .post(tourController.checkBody, tourController.createTour);

router
    .route('/:id') // mini-app of /api/v1/tours
    .get(tourController.getTour)
    .patch(
        authController.protect,
        authController.restricTo('admin', 'lead-guide'),
        tourController.uploadTourImages,
        tourController.resizeTourImages,
        tourController.updateTour)
    .delete(
        authController.protect,
        authController.restricTo('admin', 'lead-guide'),
        tourController.deleteTour);




module.exports = router;