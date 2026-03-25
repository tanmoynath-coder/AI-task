// User Model
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

// User without sensitive data (for API responses)
export interface SafeUser {
  id: string;
  email: string;
  createdAt: Date;
}