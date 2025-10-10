
import { User } from '../types';

const USERS_KEY = 'hmap-users';
const SESSION_KEY = 'hmap-session';

const getUsers = (): User[] => {
    try {
        const users = localStorage.getItem(USERS_KEY);
        return users ? JSON.parse(users) : [];
    } catch (error) {
        console.error("Error parsing users from localStorage", error);
        return [];
    }
};

const saveUsers = (users: User[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const register = (username, email, password): User | null => {
    const users = getUsers();
    if (users.some(u => u.username === username || u.email === email)) {
        return null; // User already exists
    }
    const newUser: User = { id: `user-${Date.now()}`, username, email, password };
    saveUsers([...users, newUser]);
    return { id: newUser.id, username, email };
};

export const login = (email, password): User | null => {
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        const userSession = { id: user.id, username: user.username, email: user.email };
        localStorage.setItem(SESSION_KEY, JSON.stringify(userSession));
        return userSession;
    }
    return null;
};

export const logout = () => {
    localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
    try {
        const session = localStorage.getItem(SESSION_KEY);
        if (session) {
            return JSON.parse(session);
        }
        // For first-time run, create a default user
        if (getUsers().length === 0) {
            const defaultUser = register('A. User', 'user@example.com', 'password123');
            if(defaultUser) {
                 return login(defaultUser.email, 'password123');
            }
        }
        return null;
    } catch (error) {
        console.error("Error parsing current user from localStorage", error);
        return null;
    }
};
