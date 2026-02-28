import bcrypt from 'bcryptjs';
import express, { Response } from 'express';
import { asyncHandler } from './middleware/async-handler';
import { sequelize, User, ExerciseList } from './models';
import { authenticateUser } from './middleware/auth-user';
import { ExerciseListAttributes } from './models/ExerciseList';
import { UserAttributes } from './models/User';

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

// SANITISATION FUNCTIONS
// const sanitiseUser = (user: typeof User.prototype): Omit<typeof User.prototype, 'password'> => {
//   return {
//     id: user.id,
//     firstName: user.firstName,
//     lastName: user.lastName,
//     username: user.username,
//   };
// };
// const sanitiseExerciseList = (exerciseList: ExerciseList): Omit<ExerciseList, 'createdAt' | 'updatedAt'> => {
//   return {
//     id: exerciseList.id,
//     name: exerciseList.name,
//     userId: exerciseList.userId,
//   };
// };

// ROUTES
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
          username: user.username,
        });
      } else {
        throwError(401, 'Authorization failed');
      }
    } catch (error) {
      handleSQLErrorOrRethrow(error as SequelizeValidationError, res);
    }
  }),
);

router.post(
  '/users',
  asyncHandler(async (req, res) => {
    try {
      const body = req.body as Record<string, unknown> & {
        password?: string;
        firstName?: string;
        lastName?: string;
        username?: string;
        roles?: string;
      };
      const password = typeof body.password === 'string' ? await bcrypt.hash(body.password, 10) : '';
      const now = new Date().toISOString();
      await sequelize.query(
        `INSERT INTO Users (firstName, lastName, username, password, roles, createdAt, updatedAt)
         VALUES (:firstName, :lastName, :username, :password, :roles, :createdAt, :updatedAt)`,
        {
          replacements: {
            firstName: body.firstName ?? '',
            lastName: body.lastName ?? '',
            username: body.username ?? '',
            password,
            roles: body.roles ?? '',
            createdAt: now,
            updatedAt: now,
          },
        },
      );
      res.location('/').status(201).end();
    } catch (error) {
      handleSQLErrorOrRethrow(error as SequelizeValidationError, res);
    }
  }),
);

router.get(
  '/exercise-lists',
  asyncHandler(async (_req, res) => {
    try {
      const rows = (await ExerciseList.findAll({
        include: [{ model: User, as: 'user' }],
      })) as (InstanceType<typeof ExerciseList> & { user: UserAttributes })[];
      const decodedExerciseLists = rows.map((row) => {
        const rawExerciseList = row.get({ plain: true }) as ExerciseListAttributes & { user: UserAttributes };
        return {
          ...rawExerciseList,
          user: {
            ...rawExerciseList.user,
            password: undefined,
          },
        };
      });

      res.status(200).json(decodedExerciseLists);
    } catch (error) {
      handleSQLErrorOrRethrow(error as SequelizeValidationError, res);
    }
  }),
);

router.get(
  '/exercise-lists/:id',
  asyncHandler(async (req, res) => {
    try {
      const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
      const rows = await ExerciseList.findAll({
        where: { id },
        include: [{ model: User, as: 'user' }],
      });
      if (rows[0]) {
        const rawExerciseList = rows[0].get({ plain: true }) as ExerciseListAttributes & { user: UserAttributes };
        const decodedExerciseList = {
          ...rawExerciseList,
          user: {
            ...rawExerciseList.user,
            password: undefined,
          },
        };
        res.status(200).json(decodedExerciseList);
      } else {
        throwError(404, 'The exercise list does not exist.');
      }
    } catch (error) {
      handleSQLErrorOrRethrow(error as SequelizeValidationError, res);
    }
  }),
);

router.post(
  '/exercise-lists',
  authenticateUser,
  asyncHandler(async (req, res) => {
    try {
      const user = (req.currentUser && (await User.findByPk(req.currentUser.id))) as { id: number } | null;
      if (user) {
        await ExerciseList.create({
          name: req.body.name,
          userId: user.id,
          exercises: req.body.exercises,
        });
        res.status(201).end();
      } else {
        throwError(401, 'Authentication error creating exercise list');
      }
    } catch (error) {
      handleSQLErrorOrRethrow(error as SequelizeValidationError, res);
    }
  }),
);

router.put(
  '/exercise-lists/:id',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const exerciseListId = req.params?.id as string;
    const user = await User.findByPk(req.currentUser?.id);
    const userId = user?.id;

    try {
      const user = (req.currentUser && (await User.findByPk(req.currentUser.id))) as { id: number } | null;
      const id = req.params?.id;
      if (user) {
        const list = (await ExerciseList.findByPk(exerciseListId)) as {
          userId: number;
          update: (v: Record<string, unknown>) => Promise<unknown>;
        } | null;
        if (list) {
          if (list.userId === user.id) {
            (req.body as Record<string, unknown>).userId = user.id;
            await list.update(req.body as Record<string, unknown>);
            res.status(204).end();
          } else {
            throwError(403, 'This exercise list does not belong to you.');
          }
        } else {
          throwError(404, 'The exercise list does not exist.');
        }
      } else {
        throwError(401, 'Authorization failed');
      }
    } catch (error) {
      handleSQLErrorOrRethrow(error as SequelizeValidationError, res);
    }
  }),
);

router.delete(
  '/exercise-lists/:id',
  authenticateUser,
  asyncHandler(async (req, res) => {
    try {
      const user = (req.currentUser && (await User.findByPk(req.currentUser.id))) as { id: number } | null;
      if (user) {
        const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
        const list = (await ExerciseList.findByPk(id)) as { userId: number; destroy: () => Promise<void> } | null;
        if (list) {
          if (list.userId === user.id) {
            await list.destroy();
            res.status(204).end();
          } else {
            throwError(403, 'This exercise list does not belong to you.');
          }
        } else {
          throwError(404, 'The exercise list does not exist.');
        }
      } else {
        throwError(401, 'Authorization failed');
      }
    } catch (error) {
      handleSQLErrorOrRethrow(error as SequelizeValidationError, res);
    }
  }),
);

export default router;
export { router };
