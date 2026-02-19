interface AuthUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  password?: string;
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
