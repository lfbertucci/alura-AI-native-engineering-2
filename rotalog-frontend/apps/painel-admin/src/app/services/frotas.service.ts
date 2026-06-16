import { Injectable } from '@angular/core';
import { Veiculo, Motorista, Manutencao, AlertaManutencao, ManutencaoPreventiva } from '../models';

// TODO: Deveria usar HttpClient do Angular em vez de fetch
// TODO: Sem interceptors para auth
// TODO: Sem tratamento de erros centralizado
// TODO: URL hardcoded - deveria usar environment
const API_URL = 'http://localhost:8080';

@Injectable({
  providedIn: 'root'
})
export class FrotasService {

  // TODO: Cache manual em vez de usar RxJS shareReplay
  private veiculosCache: Veiculo[] | null = null;
  private motoristasCache: Motorista[] | null = null;

  constructor() {
    // TODO: Deveria injetar HttpClient aqui
  }

  // ========== VEÍCULOS ==========

  async getVeiculos(): Promise<Veiculo[]> {
    // TODO: Cache nunca é invalidado
    if (this.veiculosCache) {
      return this.veiculosCache;
    }

    try {
      const response = await fetch(`${API_URL}/api/veiculos`);
      if (!response.ok) {
        throw new Error('Erro ao buscar veículos');
      }
      const data = await response.json();
      this.veiculosCache = data;
      return data;
    } catch (error) {
      console.error('Erro:', error);
      // TODO: Retorna array vazio em vez de propagar erro
      return [];
    }
  }

  async getVeiculo(id: number): Promise<Veiculo | null> {
    try {
      const response = await fetch(`${API_URL}/api/veiculos/${id}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Erro:', error);
      return null;
    }
  }

  async criarVeiculo(veiculo: Partial<Veiculo>): Promise<Veiculo | null> {
    try {
      const response = await fetch(`${API_URL}/api/veiculos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(veiculo)
      });
      if (!response.ok) throw new Error('Erro ao criar veículo');
      this.veiculosCache = null; // Invalida cache
      return await response.json();
    } catch (error) {
      console.error('Erro:', error);
      return null;
    }
  }

  async atualizarVeiculo(id: number, veiculo: Partial<Veiculo>): Promise<Veiculo | null> {
    try {
      const response = await fetch(`${API_URL}/api/veiculos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(veiculo)
      });
      if (!response.ok) throw new Error('Erro ao atualizar veículo');
      this.veiculosCache = null;
      return await response.json();
    } catch (error) {
      console.error('Erro:', error);
      return null;
    }
  }

  async deletarVeiculo(id: number): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/veiculos/${id}`, {
        method: 'DELETE'
      });
      this.veiculosCache = null;
      return response.ok;
    } catch (error) {
      console.error('Erro:', error);
      return false;
    }
  }

  // ========== MOTORISTAS ==========

  async getMotoristas(): Promise<Motorista[]> {
    if (this.motoristasCache) {
      return this.motoristasCache;
    }

    try {
      const response = await fetch(`${API_URL}/api/motoristas`);
      if (!response.ok) throw new Error('Erro ao buscar motoristas');
      const data = await response.json();
      this.motoristasCache = data;
      return data;
    } catch (error) {
      console.error('Erro:', error);
      return [];
    }
  }

  async getMotorista(id: number): Promise<Motorista | null> {
    try {
      const response = await fetch(`${API_URL}/api/motoristas/${id}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Erro:', error);
      return null;
    }
  }

  async atualizarMotorista(id: number, motorista: Partial<Motorista>): Promise<Motorista | null> {
    try {
      const response = await fetch(`${API_URL}/api/motoristas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(motorista)
      });
      if (!response.ok) throw new Error('Erro ao atualizar motorista');
      this.motoristasCache = null;
      return await response.json();
    } catch (error) {
      console.error('Erro:', error);
      return null;
    }
  }

  async criarMotorista(motorista: Partial<Motorista>): Promise<Motorista | null> {
    try {
      const response = await fetch(`${API_URL}/api/motoristas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(motorista)
      });
      if (!response.ok) throw new Error('Erro ao criar motorista');
      this.motoristasCache = null;
      return await response.json();
    } catch (error) {
      console.error('Erro:', error);
      return null;
    }
  }

  // ========== MANUTENÇÕES ==========

  async getManutencoes(): Promise<Manutencao[]> {
    try {
      const response = await fetch(`${API_URL}/api/manutencoes`);
      if (!response.ok) throw new Error('Erro ao buscar manutenções');
      return await response.json();
    } catch (error) {
      console.error('Erro:', error);
      return [];
    }
  }

  // TODO: Método duplicado com lógica diferente - deveria ser unificado
  async getManutencoesPorVeiculo(veiculoId: number): Promise<Manutencao[]> {
    try {
      const response = await fetch(`${API_URL}/api/manutencoes?veiculoId=${veiculoId}`);
      if (!response.ok) throw new Error('Erro');
      return await response.json();
    } catch (error) {
      console.error('Erro:', error);
      return [];
    }
  }

  async getManutencoesPreventivas(): Promise<ManutencaoPreventiva[]> {
    try {
      const response = await fetch(`${API_URL}/api/manutencoes`);
      if (!response.ok) throw new Error('Erro ao buscar manutenções preventivas');
      const todas: ManutencaoPreventiva[] = await response.json();
      return todas.filter(m => m.tipoManutencao === 'PREVENTIVA');
    } catch (error) {
      console.error('Erro:', error);
      return [];
    }
  }

  // ========== ALERTAS DE MANUTENÇÃO ==========

  async getAlertasManutencao(status?: string): Promise<AlertaManutencao[]> {
    try {
      const url = status
        ? `${API_URL}/api/alertas-manutencao?status=${encodeURIComponent(status)}`
        : `${API_URL}/api/alertas-manutencao`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro ao buscar alertas de manutenção');
      return await response.json();
    } catch (error) {
      console.error('Erro:', error);
      return [];
    }
  }

  // TODO: Limpar cache manualmente - deveria ser automático
  limparCache(): void {
    this.veiculosCache = null;
    this.motoristasCache = null;
  }
}
