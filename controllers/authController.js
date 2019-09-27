const crypto = require('crypto');
const {
    promisify
} = require('util');
const jwt = require('jsonwebtoken');

const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');


const signToken = id => {
    return jwt.sign({
            id
        },
        process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN * 24 * 60 * 60 * 1000
        });
}
const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);

    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        // secure: true, //https
        httpOnly: true //modified allowed for app only
    };

    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);

    //remove password from output
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user // user : user
        }
    });
};


exports.signup = catchAsync(async (req, res, next) => {
    // console.log(req.body);
    const newUser = await User.create(req.body);
    const url = `${req.protocol}://${req.get('host')}/me`;
    console.log(url);
    await new Email(newUser, url).sendWelcome();

    createSendToken(newUser, 201, res);
});


exports.login = catchAsync(async (req, res, next) => {
    const {
        email,
        password
    } = req.body;

    //1. check if email and password exist
    if (!email || !password) {
        return next(new AppError('Please provide email and password!', 400));
    }

    //2. check if user exist && password is correct
    const user = await User.findOne({
        email
    }).select('+password');
    // console.log(user);


    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect email or password', 401));
    }

    //3. if everything ok, send token to client
    createSendToken(user, 200, res);
});


exports.logout = (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.status(200).json({
        status: 'success'
    });
};


exports.protect = catchAsync(async (req, res, next) => {
    //1. getting token and check if 
    let token;
    // console.log(req.headers.authorization);
    // req.headers.authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVkODZlYWRiZDIzYTAzMjY2MDNkNjk2YSIsImlhdCI6MTU2OTE0NDAyNiwiZXhwIjoxNTY5MTQ0MDI2fQ.-lpZjagXWOTAq_U1erTLHOd1wD50CK4T7yBUk8ws_AU
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return next(new AppError('You are not logged in! Please login to get access.', 401));
    }
    // console.log(token);
    //2. verification token, promisify() to make async call consistentely
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    // console.log(decoded); //id: , iat, exp:

    //3. check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(new AppError('The user belonging to this token no longer exists'));
    }

    //4. check if user changed password after the JWT token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(new AppError('User changed password! Please log in again', 401));
    }

    req.user = currentUser;
    res.locals.user = currentUser;
    next();
});

// only for rendered pages, no errors
exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {

        try {

            //1. verify the token
            const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);
            // console.log(decoded); //id: , iat, exp:

            //2. check if user still exists
            const currentUser = await User.findById(decoded.id);
            if (!currentUser) {
                return next();
            }

            //3. check if user changed password after the JWT token was issued
            if (currentUser.changedPasswordAfter(decoded.iat)) {
                return next();
            }

            //there is a logged in user
            res.locals.user = currentUser;
            return next();

        } catch (err) {
            return next();
        }
    }
    next();
};


exports.restricTo = (...roles) => {
    return (req, res, next) => {
        // roles ['admin', 'lead-guide'], initially role='user'
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission', 403));
        }

        next();
    }
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
    //1. get user based on posted 
    const user = await User.findOne({
        email: req.body.email
    });

    if (!user) {
        return next(new AppError('There is no user with email address', 404));
    }

    //2. generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({
        validateBeforeSave: false // deactivate all validator for user don't have passwordConfirm field yet
    });


    // const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn'
    // t forget your password, please ignore this email`;

    try {
        // await sendEmail({
        //     email: user.email,
        //     subject: 'Your password reset token ( valid for 10min )',
        //     message
        // });

        //3. send it to user's email
        const resetURL = `${req.protocol}://${req.get('host')}/app/v1/users/resetPassword/${resetToken}`;

        await new Email(user, resetURL).sendPasswordReset();

        res.status(200).json({
            status: 'success',
            message: 'Token sent to email'
        })

    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({
            validateBeforeSave: false
        });

        return next(
            new AppError('There was an error sending the email. Please try later!', 500)
        )
    }

});


exports.resetPassword = catchAsync(async (req, res, next) => {
    //1. get user based on the token
    // console.log(req.params.token);

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: {
            $gt: Date.now()
        }
    });

    //2. if token has not expired, and there is user, set the new password
    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400));
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    //3. update changedPasswordAt property for the user


    //4.log the user in, send JWT
    createSendToken(user, 200, res);

});


exports.updatePassword = catchAsync(async (req, res, next) => {
    // 1. get user from collection
    const user = await User.findById(req.user.id).select('+password');

    //2. check if POSTED current password is correct
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
        return next(new AppError('Your current password is wrong', 401));
    }

    //3. If so, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    //4. Log user in, send JWT
    createSendToken(user, 200, res);
});