import bcrypt from 'bcryptjs';
import express, { Response } from 'express';
import { asyncHandler } from './middleware/async-handler';
import { sequelize, User, ExerciseList } from './models';
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

interface ListUser {
  createdAt?: unknown;
  updatedAt?: unknown;
  password?: string;
  [key: string]: unknown;
}

interface ExerciseListData extends ListUser {
  user: ListUser;
}

function filterExerciseListData(row: ExerciseListData): Omit<ExerciseListData, 'createdAt' | 'updatedAt'> & {
  user: Omit<ListUser, 'createdAt' | 'updatedAt' | 'password'>;
} {
  const out = { ...row };
  delete out.createdAt;
  delete out.updatedAt;
  if (out.user) {
    out.user = { ...out.user };
    delete out.user.createdAt;
    delete out.user.updatedAt;
    delete out.user.password;
  }
  return out as Omit<ExerciseListData, 'createdAt' | 'updatedAt'> & {
    user: Omit<ListUser, 'createdAt' | 'updatedAt' | 'password'>;
  };
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
      const password =
        typeof body.password === 'string' ? await bcrypt.hash(body.password, 10) : '';
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
        }
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
      const data = await ExerciseList.findAll({
        include: [{ model: User, as: 'user' }],
      });
      const lists = data.map((row) => filterExerciseListData(row.get({ plain: true }) as ExerciseListData));
      res.status(200).json(lists);
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
        res.status(200).json(filterExerciseListData(rows[0].get({ plain: true }) as ExerciseListData));
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
        const body = req.body as Record<string, unknown>;
        body.userId = user.id;
        const list = (await ExerciseList.create(body)) as unknown as { id: number };
        res.location(`/exercise-lists/${list.id}`).status(201).end();
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
    try {
      const user = (req.currentUser && (await User.findByPk(req.currentUser.id))) as { id: number } | null;
      if (user) {
        const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
        const list = (await ExerciseList.findByPk(id)) as {
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
