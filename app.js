'use strict';

// In this project, you’ll create a REST API using Express. 
// This API will provide a way to administer a school database containing 
// information about users and courses. Users can interact with the database 
// to create new courses, retrieve information on existing courses, and 
// update or delete existing courses. To make changes to the database, users 
// will be required to log in so the API will also allow users to create a 
// new account or retrieve information on an existing account.


// load modules
const express = require('express');
const morgan = require('morgan');
const routes = require('./routes');
const { sequelize } = require('./models');

// variable to enable global error logging
const enableGlobalErrorLogging = process.env.ENABLE_GLOBAL_ERROR_LOGGING === 'true';

// create the Express app
const app = express();

// added for CORS -------------------------------------------------------------
// doc: https://medium.com/zero-equals-false/using-cors-in-express-cac7e29b005b
const cors = require('cors');
var allowedOrigins = ['http://localhost:3000',
                      'https://secret-woodland-36609.herokuapp.com',
                      'http://127.0.0.1:8080',
                      'https://project10.erland.info'];

app.use(cors({
  origin: function(origin, callback){
    // allow requests with no origin 
    // (like mobile apps or curl requests)
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      var msg = 'The CORS policy for this site does not ' +
                'allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));
// added for CORS: end --------------------------------------------------------

// Setup request body JSON parsing.
app.use(express.json());

// setup morgan which gives us http request logging
app.use(morgan('dev'));

// setup a friendly greeting for the root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the REST API project!',
  });
});

// Add routes.
app.use('/api', routes);

// send 404 if no other route matched
app.use((req, res) => {
  res.status(404).json({
    message: 'Route Not Found',
  });
});

// setup a global error handler
app.use((err, req, res, next) => {
  if (enableGlobalErrorLogging) {
    console.error(`Global error handler: ${JSON.stringify(err.stack)}`);
  }

  res.status(err.status || 500).json({
    message: err.message,
    error: {},
  });
});

// set our port
app.set('port', process.env.PORT || 5000);

// Test the database connection.
(async () => {
  try {
    await sequelize.authenticate();
    // await sequelize.sync();
    console.log('Successfully connected to the database');
  } catch(error) {
    console.log('Hey Erland, an error occured connecting to the database: ', error);
    console.log('*********************************************************');
  }
})();

// Sequelize model synchronization, then start listening on our port.
sequelize.sync()
  .then( () => {
    const port = app.get('port');
    app.listen(port, () => {
      console.log(`Express server is listening on port ${port}`);
    });
  })
  .catch(( error => {
    console.log("Hey Erland, the following error occured:");
    console.log(error);
    console.log('****************************************');
  }));