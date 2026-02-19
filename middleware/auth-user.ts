import auth from 'basic-auth';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { User } from '../models';

export async function authenticateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  let message: string | undefined;
  const credentials = auth(req);

  if (credentials) {
    const user = await User.findOne({
      where: { username: credentials.name },
    }) as { password: string; username: string; get: (opts: { plain: true }) => Express.Request['currentUser'] } | null;

    if (user) {
      const authenticated = bcrypt.compareSync(credentials.pass, user.password);

      if (authenticated) {
        console.log(`Authentication successful for username: ${user.username}`);
        req.currentUser = user.get({ plain: true }) as Express.Request['currentUser'];
        next();
        return;
      } else {
        message = `Authentication failure for username: ${user.username}`;
      }
    } else {
      message = `User not found for username: ${credentials.name}`;
    }
  } else {
    message = 'Auth header not found';
  }

  if (message) {
    console.warn(message);
    res.status(401).json({ message: 'Access Denied' });
  } else {
    next();
  }
}
