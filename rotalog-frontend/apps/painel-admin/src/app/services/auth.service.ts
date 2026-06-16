import { Injectable } from '@angular/core';

const API_URL = 'http://localhost:3000';
const TOKEN_KEY = 'rotalog_token';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private token: string | null = localStorage.getItem(TOKEN_KEY);

  async getToken(): Promise<string | null> {
    if (this.token) return this.token;
    return this.login();
  }

  async login(username = 'admin', password = 'admin123'): Promise<string | null> {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) return null;
      const { token } = await response.json();
      this.token = token;
      localStorage.setItem(TOKEN_KEY, token);
      return token;
    } catch {
      return null;
    }
  }

  clearToken(): void {
    this.token = null;
    localStorage.removeItem(TOKEN_KEY);
  }
}
