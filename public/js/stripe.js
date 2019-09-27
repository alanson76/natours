import axios from 'axios';

import {
    showAlert
} from './alerts';


const stripe = Stripe('pk_test_WUOdtkihwTqF0QybgApiiy8q00VRwTWibD');

export const bookTour = async tourId => {
    try {

        // 1. get checkout session from endpoint
        const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
        console.log(session);

        // 2. create checkout form + charge credit card 
        await stripe.redirectToCheckout({
            sessionId: session.data.session.id
        });

    } catch (err) {
        console.log(err);
        showAlert('error', err);
    }


};