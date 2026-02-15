'use strict';

const express = require('express');
const { asyncHandler } = require('./middleware/async-handler');
const { User, Course } = require('./models');
const { authenticateUser } = require('./middleware/auth-user');

// Construct a router instance.
const router = express.Router();

// ****************************************************************************
// Two simple helper functions to make error handling a bit less messy:
function handleSQLErrorOrRethrow(error, response) {
  if (error.name === 'SequelizeValidationError' || 
      error.name === 'SequelizeUniqueConstraintError') {
    const errors = error.errors.map(err => err.message);
    response.status(error.status || 400).json({ errors });   
  } else {
    console.log('Rethrowing the error ', error);
    throw error;
  }
}

function throwError(statusCode, message) {
  const error = new Error(message);  
  error.status = statusCode; // http status code
  throw error;               // let the error handler below handle it further 
}
// ****************************************************************************
// Helper function to get rid of createdAt & updatedAt fields
function filterCourseData(courseData) {
  const course = {...courseData}; // don't modify original object
  delete course["createdAt"];
  delete course["updatedAt"];
  delete course.courseUser["createdAt"];
  delete course.courseUser["updatedAt"];
  delete course.courseUser["password"];
  return course;
}
// ****************************************************************************

// Route that returns the currently authenticated user
router.get('/users', authenticateUser, asyncHandler( async (req, res) => {
  try {
    const user = req.currentUser;
    if(user) {
      res.status(200).json({
        firstName: user.firstName,
        lastName: user.lastName,
        emailAddress: user.emailAddress
      });  
    } else {
      throwError(401, 'Authorization failed');
    } 
  } catch(error) {
    handleSQLErrorOrRethrow(error, res);
  }
}));

// Route that creates a new user.
router.post('/users', asyncHandler(async (req, res) => {
  try {
    await User.create(req.body);
    console.log('req.body: ', req.body);
    console.log('res: ', res);
    res.location('/').status(201).end();
  } catch (error) {
    handleSQLErrorOrRethrow(error, res);
  }
}));

// return all courses including the User associated with each course 
// and a 200 HTTP status code.
router.get('/courses', asyncHandler( async (req, res) => {
  try {
    const coursesData = await Course.findAll({
      include: [
        {
          model: User,
          as: 'courseUser'
        }
      ]
    });  
    const courses = coursesData.map(courseData => 
      filterCourseData(courseData.get({ plain: true }))
    );
    res.status(200).json(courses);
  } catch(error) {
    handleSQLErrorOrRethrow(error, res);
  }
}));

// return the corresponding course including the User associated with 
// that course and a 200 HTTP status code.
router.get('/courses/:id', asyncHandler( async (req, res) => {
  try {
    const course = await Course.findAll({
      where: {
        id: req.params.id
      },
      include: [
        {
          model: User,
          as: 'courseUser'
        }
      ]
    });  
    if(course[0]) { // doesn't work, because findAll() throws error if it can't find anything :(
      res.status(200).json(filterCourseData(course[0].get({ plain: true })));
    } else {
      throwError(404, 'The course you are trying to see does not exist (anymore).🤷‍♂️');
    }
  } catch(error) {
    //console.log(`GET /courses/${req.params.id} "crashed" the api!`);
    handleSQLErrorOrRethrow(error, res);
  }
}));

// create a new course, set the Location header to the URI for the 
// newly created course, and return a 201 HTTP status code and no content.
router.post('/courses', authenticateUser, asyncHandler( async (req, res) => {
  try {
    const user = await User.findByPk(req.currentUser.id);
    if (user) {
      req.body.userId = user.id;
      const course = await Course.create(req.body);
      res.location(`/courses/${course.id}`).status(201).end(); 
    } else {
      throwError(401, 'Authentication error creating course');
    }
  } catch(error) {
    handleSQLErrorOrRethrow(error, res);
  }  
}));

// update the corresponding course and 
// return a 204 HTTP status code and no content.  
router.put('/courses/:id', authenticateUser, asyncHandler( async (req, res) => {
  try {
    const user = await User.findByPk(req.currentUser.id);
    if (user) {
      const course = await Course.findByPk(req.params.id);
      if (course) {
        // console.log('Found the course ', req.params.id, '!');
        if (course.userId === user.id) {
          req.body.userId = user.id;
          await course.update(req.body);    
          res.status(204).end();  
        } else { // this authorized user is not authorized to update this course (it's not his course)
          throwError(403, 'The course you are trying to update does not belong to you.🤷‍♂️');
        }
      } else {
        throwError(404, 'The course you are trying to update does not exist (anymore).🤷‍♂️');
      }  
    } else { // user specified in auth header was not found
      throwError(401, 'Authorization failed');
    }
  } catch(error) {
    handleSQLErrorOrRethrow(error, res);
  }
}));

// A /api/courses/:id DELETE route that will delete the corresponding 
// course and return a 204 HTTP status code and no content.
router.delete('/courses/:id', authenticateUser, asyncHandler( async (req, res) => {
  try {
    const user = await User.findByPk(req.currentUser.id);
    if (user) {
      const course = await Course.findByPk(req.params.id);
      if (course) {
        if (course.userId === user.id) {
          await course.destroy();
          res.status(204).end();
        } else { // this authorized user is not authorized to delete this course (it's not his course)
          throwError(403, 'The course you are trying to delete does not belong to you.🤷‍♂️');
        }
      } else {
        throwError(404, 'The course you are trying to delete does not exist (anymore).🤷‍♂️');
      }  
    } else { // user specified in auth header was not found
      throwError(401, 'Authorization failed');
    }
  } catch(error) {
    handleSQLErrorOrRethrow(error, res);
  }
}));
  
module.exports = router;