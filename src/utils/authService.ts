
import * as backendAuth from './be-authService';
import { User } from '../types';

// This file acts as a client-side interface to the "backend" authentication service.
// In a real application, these functions would make API calls (e.g., using fetch)
// to a server running the logic found in be-authService.ts.

export const register = (username: string, email: string, password: string): User | null => {
    return backendAuth.register(username, email, password);
};

export const login = (email: string, password: string): User | null => {
    return backendAuth.login(email, password);
};

export const logout = (): void => {
    return backendAuth.logout();
};

export const getCurrentUser = (): User | null => {
    return backendAuth.getCurrentUser();
};
