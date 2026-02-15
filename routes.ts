import express, { Request, Response } from 'express';
import { asyncHandler } from './middleware/async-handler';
import { User, Course } from './models';
import { authenticateUser } from './middleware/auth-user';

const router = express.Router();

interface SequelizeValidationError extends Error {
  name: 'SequelizeValidationError' | 'SequelizeUniqueConstraintError';
  errors: Array<{ message: string }>;
  status?: number;
}

function handleSQLErrorOrRethrow(error: SequelizeValidationError, response: Response): void {
  if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
    const errors = error.errors.map((err) => err.message);
    response.status(error.status || 400).json({ errors });
  } else {
    console.log('Rethrowing the error ', error);
    throw error;
  }
}

function throwError(statusCode: number, message: string): never {
  const error = new Error(message) as Error & { status?: number };
  error.status = statusCode;
  throw error;
}

interface CourseUser {
  createdAt?: unknown;
  updatedAt?: unknown;
  password?: string;
  [key: string]: unknown;
}

interface CourseData extends CourseUser {
  courseUser: CourseUser;
}

function filterCourseData(courseData: CourseData): Omit<CourseData, 'createdAt' | 'updatedAt'> & { courseUser: Omit<CourseUser, 'createdAt' | 'updatedAt' | 'password'> } {
  const course = { ...courseData };
  delete course.createdAt;
  delete course.updatedAt;
  if (course.courseUser) {
    delete course.courseUser.createdAt;
    delete course.courseUser.updatedAt;
    delete course.courseUser.password;
  }
  return course as Omit<CourseData, 'createdAt' | 'updatedAt'> & { courseUser: Omit<CourseUser, 'createdAt' | 'updatedAt' | 'password'> };
}

router.get(
  '/users',
  authenticateUser,
  asyncHandler(async (req, res) => {
    try {
      const user = req.currentUser;
      if (user) {
        res.status(200).json({
          firstName: user.firstName,
          lastName: user.lastName,
          emailAddress: user.emailAddress,
        });
      } else {
        throwError(401, 'Authorization failed');
      }
    } catch (error) {
      handleSQLErrorOrRethrow(error as SequelizeValidationError, res);
    }
  })
);

router.post(
  '/users',
  asyncHandler(async (req, res) => {
    try {
      await User.create(req.body as Record<string, unknown>);
      res.location('/').status(201).end();
    } catch (error) {
      handleSQLErrorOrRethrow(error as SequelizeValidationError, res);
    }
  })
);

router.get(
  '/courses',
  asyncHandler(async (_req, res) => {
    try {
      const coursesData = await Course.findAll({
        include: [{ model: User, as: 'courseUser' }],
      });
      const courses = coursesData.map((courseData) =>
        filterCourseData(courseData.get({ plain: true }) as CourseData)
      );
      res.status(200).json(courses);
    } catch (error) {
      handleSQLErrorOrRethrow(error as SequelizeValidationError, res);
    }
  })
);

router.get(
  '/courses/:id',
  asyncHandler(async (req, res) => {
    try {
      const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
      const course = await Course.findAll({
        where: { id },
        include: [{ model: User, as: 'courseUser' }],
      });
      if (course[0]) {
        res.status(200).json(filterCourseData(course[0].get({ plain: true }) as CourseData));
      } else {
        throwError(404, 'The course you are trying to see does not exist (anymore).🤷‍♂️');
      }
    } catch (error) {
      handleSQLErrorOrRethrow(error as SequelizeValidationError, res);
    }
  })
);

router.post(
  '/courses',
  authenticateUser,
  asyncHandler(async (req, res) => {
    try {
      const user = (req.currentUser && (await User.findByPk(req.currentUser.id))) as { id: number } | null;
      if (user) {
        const body = req.body as Record<string, unknown>;
        body.userId = user.id;
        const course = (await Course.create(body)) as unknown as { id: number };
        res.location(`/courses/${course.id}`).status(201).end();
      } else {
        throwError(401, 'Authentication error creating course');
      }
    } catch (error) {
      handleSQLErrorOrRethrow(error as SequelizeValidationError, res);
    }
  })
);

router.put(
  '/courses/:id',
  authenticateUser,
  asyncHandler(async (req, res) => {
    try {
      const user = req.currentUser && (await User.findByPk(req.currentUser.id)) as { id: number } | null;
      if (user) {
        const courseId = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
        const course = await Course.findByPk(courseId) as { userId: number; update: (v: Record<string, unknown>) => Promise<unknown> } | null;
        if (course) {
          if (course.userId === user.id) {
            (req.body as Record<string, unknown>).userId = user.id;
            await course.update(req.body as Record<string, unknown>);
            res.status(204).end();
          } else {
            throwError(403, 'The course you are trying to update does not belong to you.🤷‍♂️');
          }
        } else {
          throwError(404, 'The course you are trying to update does not exist (anymore).🤷‍♂️');
        }
      } else {
        throwError(401, 'Authorization failed');
      }
    } catch (error) {
      handleSQLErrorOrRethrow(error as SequelizeValidationError, res);
    }
  })
);

router.delete(
  '/courses/:id',
  authenticateUser,
  asyncHandler(async (req, res) => {
    try {
      const user = req.currentUser && (await User.findByPk(req.currentUser.id)) as { id: number } | null;
      if (user) {
        const courseId = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
        const course = await Course.findByPk(courseId) as { userId: number; destroy: () => Promise<void> } | null;
        if (course) {
          if (course.userId === user.id) {
            await course.destroy();
            res.status(204).end();
          } else {
            throwError(403, 'The course you are trying to delete does not belong to you.🤷‍♂️');
          }
        } else {
          throwError(404, 'The course you are trying to delete does not exist (anymore).🤷‍♂️');
        }
      } else {
        throwError(401, 'Authorization failed');
      }
    } catch (error) {
      handleSQLErrorOrRethrow(error as SequelizeValidationError, res);
    }
  })
);

export default router;
export { router };
