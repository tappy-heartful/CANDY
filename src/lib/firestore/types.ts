export interface User {
  id: string;
  displayName?: string;
  pictureUrl?: string;
  agreedAt?: number;
  lastLoginAt?: number;
  createdAt?: number;
  updatedAt?: number;
  isSystemAdmin?: boolean;
  [key: string]: any;
}
