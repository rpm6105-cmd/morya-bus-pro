import { User } from '../types';
import { dataService } from './dataService';

const CURRENT_USER_KEY = 'hrms_current_user';
const SESSION_KEY = 'hrms_session';

class AuthService {
  private users: User[] = [];

  private loadUsers() {
    this.users = dataService.getUsers();
  }

  private saveUsers() {
    dataService.setUsers(this.users);
  }

  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    this.loadUsers();
    const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    
    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    if (!user.isActive) {
      return { success: false, error: 'Account is deactivated. Contact administrator.' };
    }

    user.lastLogin = new Date().toISOString();
    this.saveUsers();

    const sessionData = {
      userId: user.id,
      role: user.role,
      depotId: user.depotId,
      email: user.email,
      name: user.name,
      loginTime: new Date().toISOString()
    };

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

    return { success: true, user };
  }

  logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  getSession(): any {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'ADMIN';
  }

  isHR(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'HR';
  }

  canAccessDepot(depotId: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return user.depotId === depotId;
  }

  async getAllUsers(): Promise<User[]> {
    this.loadUsers();
    return this.users.map(u => ({ ...u, password: '' }));
  }

  async getUsersByRole(role: 'ADMIN' | 'HR'): Promise<User[]> {
    this.loadUsers();
    return this.users.filter(u => u.role === role).map(u => ({ ...u, password: '' }));
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'lastLogin'>): Promise<User> {
    this.loadUsers();
    const user: User = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.users.push(user);
    this.saveUsers();
    return { ...user, password: '' };
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    this.loadUsers();
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    this.users[index] = { ...this.users[index], ...updates };
    this.saveUsers();
    return { ...this.users[index], password: '' };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    this.loadUsers();
    const user = this.users.find(u => u.id === userId);
    if (!user || user.password !== oldPassword) return false;
    user.password = newPassword;
    this.saveUsers();
    return true;
  }

  async resetPassword(userId: string, newPassword: string): Promise<boolean> {
    this.loadUsers();
    const user = this.users.find(u => u.id === userId);
    if (!user) return false;
    user.password = newPassword;
    this.saveUsers();
    return true;
  }

  async toggleUserStatus(userId: string): Promise<boolean> {
    this.loadUsers();
    const user = this.users.find(u => u.id === userId);
    if (!user) return false;
    user.isActive = !user.isActive;
    this.saveUsers();
    return true;
  }
}

export const authService = new AuthService();
