export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: 'viewer' | 'streamer' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface AuthError {
  message: string;
  field?: string;
  code?: string;
}