import { SafeUser } from './user.types.js';

// Request/Response Types for Authentication
export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: SafeUser;
  token: string;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

// Extended Express Request with user
export interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
  };
}