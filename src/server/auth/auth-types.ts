export type AuthenticatedUser = {
  id: string;
  email: string;
};

export type LoginResult = {
  user: AuthenticatedUser;
  sessionToken: string;
  expiresAt: Date;
};

export type SessionResult = {
  user: AuthenticatedUser;
  expiresAt: Date;
};
