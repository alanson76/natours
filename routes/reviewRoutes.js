const express = require('express');

const authController = require('./../controllers/authController');
const reviewController = require('./../controllers/reviewController');

//by default, router has only access to one route
//to get route from another route, we need mergeParams
const router = express.Router({
    mergeParams: true
});



//NESTED ROUTES
//posting a review ... POST : /tour/tour_id/reviews
//getting reviews ... GET : /tour/tour_id/reviews
//getting reviews ... GET : /tour/tour_id/reviews/review_id
//GET: /reviews

router.use(authController.protect);

router
    .route('/')
    .post(
        authController.restricTo('user'),
        reviewController.setTourUserIds,
        reviewController.createReview)
    .get(reviewController.getAllReviews);


router
    .route('/:id')
    .get(reviewController.getReview)
    .patch(authController.restricTo('user', 'admin'), reviewController.updateReview)
    .delete(authController.restricTo('user', 'admin'), reviewController.deleteReview);

module.exports = router;