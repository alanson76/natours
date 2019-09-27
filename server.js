//everything not related to econst mongoose = require('mongoose');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', err => {
  console.log('uncaught Exception! Shutting Down...');
  console.log(err.name, err.message);
  process.exit(1);
});


dotenv.config({
  path: './config.env'
});
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

//for local database
// mongoose
//   .connect(process.env.DATABASE_LOCAL, {
//     useNewUrlParser: true,
//     useCreateIndex: true,
//     useFindAndModify: false
//   })
//   .then(() => console.log('DB connection successful'));  

//for remote database
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log('DB connection successful'));


// const testTour = new Tour({
//   name: 'The Forest Hiker course2',
//   rating: 4.8,
//   price: 599
// });

// testTour.save().then(doc => {
//   console.log(doc);
// }).catch(err => {
//   console.log('Document saving Error ==> ' + err);
// });

// console.log(app.get('env'));
// console.log(process.env); //from process core module

///////////////////////////////////////
// Server Listener
///////////////////////////////////////
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  // eslint-disable-next-line prettier/prettier
  console.log(`App running on port ${port} ...`);
});


process.on('unhandledRejection', err => {
  console.log('Unhandled Rejection! Shutting Down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});