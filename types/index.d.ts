interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  roles: string;
}

declare global {
  namespace Express {
    interface Request {
      currentUser?: AuthUser;
    }
  }
}

export interface HttpError extends Error {
  status?: number;
}
