import { Injectable } from '@angular/core';
import { Entrega } from '../models';
import { AuthService } from './auth.service';

const API_URL = 'http://localhost:3000';

@Injectable({
  providedIn: 'root'
})
export class EntregasService {

  constructor(private authService: AuthService) {}

  private async fetchAutenticado(url: string): Promise<Response> {
    const token = await this.authService.getToken();
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (response.status === 401) {
      // Token expirado — obtém novo e tenta uma vez mais
      this.authService.clearToken();
      const novoToken = await this.authService.login();
      return fetch(url, {
        headers: novoToken ? { Authorization: `Bearer ${novoToken}` } : {},
      });
    }
    return response;
  }

  async getEntregas(): Promise<Entrega[]> {
    try {
      const response = await this.fetchAutenticado(`${API_URL}/api/entregas`);
      if (!response.ok) throw new Error('Erro ao buscar entregas');
      return await response.json();
    } catch (error) {
      console.error('Erro:', error);
      return [];
    }
  }

  async getEntrega(id: number): Promise<Entrega | null> {
    try {
      const response = await this.fetchAutenticado(`${API_URL}/api/entregas/${id}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Erro:', error);
      return null;
    }
  }

  async getEntregasPorMotorista(motoristaId: number): Promise<Entrega[]> {
    try {
      const response = await this.fetchAutenticado(`${API_URL}/api/entregas?motorista=${motoristaId}`);
      if (!response.ok) throw new Error('Erro');
      return await response.json();
    } catch (error) {
      console.error('Erro:', error);
      return [];
    }
  }
}
