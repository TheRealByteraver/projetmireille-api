# Rest API 
This is a REST API written using the Express framework in conjunction with Sequelize as ORM. This API will provide a way to administer a school database containing information about users and courses. Users can interact with the database to create new courses, retrieve information on existing courses, and update or delete existing courses. To make changes to the database, users will be required to log in so the API will also allow users to create a new account or retrieve information on an existing account.

# Technology Stack
Node.Js (Express + Sequelize)

# Exceeds requirements description
The exceeds requirements have been fulfilled as described. Additionally:
- it is not possible for an authenticated user to update or delete a course that was added by a different user
