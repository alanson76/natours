const express = require('express');

const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');



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

////////////////////////routes without login/////////////////////////////////////////////////////////////////
router
    .route('/signup')
    .post(authController.signup);

router
    .route('/login')
    .post(authController.login);

router
    .route('/logout')
    .get(authController.logout);

router
    .route('/forgotPassword')
    .post(authController.forgotPassword);

router
    .route('/resetPassword/:token')
    .patch(authController.resetPassword);

////////////////////////routes with login/////////////////////////////////////////////////////////////////
router.use(authController.protect); //all the routes after this are protected

router
    .patch('/updateMyPassword', authController.updatePassword);

router
    .patch('/updateMe',
        userController.uploadUserPhoto,
        userController.resizeUserPhoto,
        userController.updateMe);

router
    .delete('/deleteMe', userController.deleteMe);

router
    .get('/me', userController.getMe, userController.getUser);

/////////////////////////allow below for only admin ////////////////////////////////////////////////////////
router.use(authController.restricTo('admin'));
router
    .route('/') // mini-app of /api/v1/users
    .get(userController.getAllUsers)
    .post(userController.createUser);

router
    .route('/:id') // mini-app of /api/v1/users
    .get(userController.getUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser);



module.exports = router;