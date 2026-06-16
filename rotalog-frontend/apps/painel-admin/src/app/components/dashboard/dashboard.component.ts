import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FrotasService } from '../../services/frotas.service';
import { EntregasService } from '../../services/entregas.service';
import { Veiculo, Motorista, Entrega, AlertaManutencao } from '../../models';

// TODO: Componente God Object - faz tudo (dashboard, stats, alertas)
// TODO: Deveria ser dividido em sub-componentes
// TODO: Sem OnPush change detection
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard">
      <h1>Dashboard - Gestão de Frotas</h1>

      <!-- TODO: Loading spinner deveria ser componente reutilizável -->
      <div *ngIf="loading" class="loading">Carregando dados...</div>

      <div *ngIf="error" class="error-banner">
        {{ error }}
        <button (click)="carregarDados()">Tentar novamente</button>
      </div>

      <div class="stats-grid" *ngIf="!loading">
        <div class="stat-card" (click)="navigateTo('/veiculos')">
          <div class="stat-icon">🚛</div>
          <div class="stat-info">
            <span class="stat-value">{{ totalVeiculos }}</span>
            <span class="stat-label">Veículos</span>
          </div>
          <div class="stat-detail">
            <span class="active">{{ veiculosAtivos }} ativos</span>
            <span class="inactive">{{ veiculosInativos }} inativos</span>
          </div>
        </div>

        <div class="stat-card" (click)="navigateTo('/motoristas')">
          <div class="stat-icon">👤</div>
          <div class="stat-info">
            <span class="stat-value">{{ totalMotoristas }}</span>
            <span class="stat-label">Motoristas</span>
          </div>
          <div class="stat-detail">
            <span class="active">{{ motoristasAtivos }} ativos</span>
          </div>
        </div>

        <div class="stat-card" (click)="navigateTo('/entregas')">
          <div class="stat-icon">📦</div>
          <div class="stat-info">
            <span class="stat-value">{{ totalEntregas }}</span>
            <span class="stat-label">Entregas</span>
          </div>
          <div class="stat-detail">
            <span class="active">{{ entregasEmAndamento }} em andamento</span>
          </div>
        </div>

        <div class="stat-card" (click)="navigateTo('/manutencoes')">
          <div class="stat-icon">🔧</div>
          <div class="stat-info">
            <span class="stat-value">{{ totalManutencoes }}</span>
            <span class="stat-label">Manutenções</span>
          </div>
          <div class="stat-detail">
            <span class="warning">{{ manutencoesPendentes }} pendentes</span>
          </div>
        </div>
      </div>

      <!-- TODO: Alertas hardcoded - deveria vir do backend -->
      <div class="alerts-section" *ngIf="!loading">
        <h2>Alertas</h2>
        <div class="alert-list">
          <div *ngFor="let alerta of alertas" class="alert-item" [ngClass]="'alert-' + alerta.tipo">
            <span class="alert-icon">{{ alerta.tipo === 'danger' ? '🔴' : alerta.tipo === 'warning' ? '🟡' : '🔵' }}</span>
            <span class="alert-message">{{ alerta.mensagem }}</span>
            <span class="alert-date">{{ alerta.data }}</span>
          </div>
        </div>
      </div>

      <!-- TODO: Tabela de últimas entregas duplicada com componente de entregas -->
      <div class="recent-section" *ngIf="!loading">
        <h2>Últimas Entregas</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Status</th>
              <th>Motorista</th>
              <th>Destino</th>
              <th>Distância</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let entrega of ultimasEntregas" (click)="navigateTo('/entregas')">
              <td>{{ entrega.codigo_rastreio }}</td>
              <td>
                <span class="status-badge" [ngClass]="'status-' + entrega.status">
                  {{ entrega.status }}
                </span>
              </td>
              <td>{{ entrega.motorista_nome }}</td>
              <td>{{ entrega.destino_endereco }}</td>
              <td>{{ entrega.distancia_km }} km</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  // TODO: CSS inline em vez de arquivo separado - componente muito grande
  styles: [`
    .dashboard { padding: 20px; }

    .dashboard h1 {
      margin: 0 0 20px 0;
      color: #333;
      font-size: 24px;
    }

    .loading {
      text-align: center;
      padding: 40px;
      font-size: 18px;
      color: #666;
    }

    .error-banner {
      background: #ffebee;
      color: #c62828;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .error-banner button {
      background: #c62828;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .stat-icon { font-size: 32px; margin-bottom: 10px; }

    .stat-info { display: flex; flex-direction: column; }

    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #333;
    }

    .stat-label {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }

    .stat-detail {
      margin-top: 10px;
      font-size: 13px;
      display: flex;
      gap: 10px;
    }

    .stat-detail .active { color: #2e7d32; }
    .stat-detail .inactive { color: #c62828; }
    .stat-detail .warning { color: #f57f17; }

    .alerts-section, .recent-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }

    .alerts-section h2, .recent-section h2 {
      margin: 0 0 15px 0;
      font-size: 18px;
      color: #333;
    }

    .alert-list { display: flex; flex-direction: column; gap: 8px; }

    .alert-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
    }

    .alert-danger { background: #ffebee; }
    .alert-warning { background: #fff8e1; }
    .alert-info { background: #e3f2fd; }

    .alert-message { flex: 1; }
    .alert-date { color: #999; font-size: 12px; }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th {
      text-align: left;
      padding: 12px;
      border-bottom: 2px solid #eee;
      color: #666;
      font-size: 13px;
      text-transform: uppercase;
    }

    .data-table td {
      padding: 12px;
      border-bottom: 1px solid #f5f5f5;
      font-size: 14px;
    }

    .data-table tr:hover { background: #f9f9f9; cursor: pointer; }

    .status-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-PENDENTE, .status-pendente { background: #fff3e0; color: #e65100; }
    .status-EM_TRANSITO, .status-em_transito { background: #e3f2fd; color: #1565c0; }
    .status-ENTREGUE, .status-entregue { background: #e8f5e9; color: #2e7d32; }
    .status-CANCELADA, .status-cancelada { background: #ffebee; color: #c62828; }
  `]
})
export class DashboardComponent implements OnInit {
  // TODO: Todas as propriedades públicas - sem encapsulamento
  loading = true;
  error: string | null = null;

  veiculos: Veiculo[] = [];
  motoristas: Motorista[] = [];
  entregas: Entrega[] = [];

  totalVeiculos = 0;
  veiculosAtivos = 0;
  veiculosInativos = 0;
  totalMotoristas = 0;
  motoristasAtivos = 0;
  totalEntregas = 0;
  entregasEmAndamento = 0;
  totalManutencoes = 0;
  manutencoesPendentes = 0;

  ultimasEntregas: Entrega[] = [];

  alertas: { tipo: string; mensagem: string; data: string }[] = [];

  // TODO: Injeção direta no constructor - sem abstrações
  constructor(
    private frotasService: FrotasService,
    private entregasService: EntregasService
  ) {}

  ngOnInit(): void {
    this.carregarDados();
  }

  // TODO: Lógica de negócio no componente - deveria estar em service
  async carregarDados(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      // TODO: Chamadas sequenciais - deveria ser paralelo com Promise.all
      this.veiculos = await this.frotasService.getVeiculos();
      this.motoristas = await this.frotasService.getMotoristas();
      this.entregas = await this.entregasService.getEntregas();

      // TODO: Cálculos no componente - deveria estar em service ou pipe
      this.totalVeiculos = this.veiculos.length;
      this.veiculosAtivos = this.veiculos.filter(v => v.status === 'ATIVO').length;
      this.veiculosInativos = this.veiculos.filter(v => v.status !== 'ATIVO').length;

      this.totalMotoristas = this.motoristas.length;
      this.motoristasAtivos = this.motoristas.filter(m => m.status === 'ATIVO').length;

      this.totalEntregas = this.entregas.length;
      this.entregasEmAndamento = this.entregas.filter(e =>
        e.status === 'EM_TRANSITO' || e.status === 'em_transito'
      ).length;

      // TODO: Manutenções hardcoded - API não retorna contagem
      this.totalManutencoes = 6;
      this.manutencoesPendentes = 2;

      this.ultimasEntregas = this.entregas.slice(0, 5);

      const alertasManutencao: AlertaManutencao[] = await this.frotasService.getAlertasManutencao();
      this.alertas = alertasManutencao.map(a => ({
        tipo: 'warning',
        mensagem: `Veículo ${a.placa} (${a.modelo}) - ${a.motivo}`,
        data: a.dataAlerta
      }));

      this.loading = false;
    } catch (err: any) {
      this.error = 'Erro ao carregar dados do dashboard. Verifique se os serviços estão rodando.';
      this.loading = false;
      console.error('Dashboard error:', err);
    }
  }

  // TODO: Navegação no componente - deveria usar Router service
  navigateTo(path: string): void {
    window.location.href = path;
  }
}
