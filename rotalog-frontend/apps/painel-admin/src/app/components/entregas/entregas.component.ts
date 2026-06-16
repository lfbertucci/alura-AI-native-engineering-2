import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EntregasService } from '../../services/entregas.service';
import { Entrega } from '../../models';

// TODO: Componente sem integração com rastreamento em tempo real
// TODO: Deveria ter WebSocket para atualizações
@Component({
  selector: 'app-entregas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="entregas-page">
      <div class="page-header">
        <h1>Entregas</h1>
        <div class="header-actions">
          <button class="btn-refresh" (click)="carregarEntregas()">Atualizar</button>
          <!-- TODO: Botão de nova entrega não implementado -->
        </div>
      </div>

      <div class="filters">
        <input type="text" placeholder="Buscar por código ou destino..." [(ngModel)]="termoBusca" (input)="filtrar()">
        <select [(ngModel)]="filtroStatus" (change)="filtrar()">
          <option value="">Todos os Status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="EM_TRANSITO">Em Trânsito</option>
          <option value="ENTREGUE">Entregue</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>

      <!-- TODO: Resumo duplicado com dashboard -->
      <div class="stats-row" *ngIf="!loading">
        <div class="mini-stat">
          <span class="mini-value">{{ entregas.length }}</span>
          <span class="mini-label">Total</span>
        </div>
        <div class="mini-stat">
          <span class="mini-value pending">{{ countByStatus('PENDENTE') }}</span>
          <span class="mini-label">Pendentes</span>
        </div>
        <div class="mini-stat">
          <span class="mini-value transit">{{ countByStatus('EM_TRANSITO') }}</span>
          <span class="mini-label">Em Trânsito</span>
        </div>
        <div class="mini-stat">
          <span class="mini-value delivered">{{ countByStatus('ENTREGUE') }}</span>
          <span class="mini-label">Entregues</span>
        </div>
      </div>

      <div *ngIf="loading" class="loading">Carregando entregas...</div>

      <table class="data-table" *ngIf="!loading">
        <thead>
          <tr>
            <th>Código</th>
            <th>Status</th>
            <th>Origem</th>
            <th>Destino</th>
            <th>Motorista</th>
            <th>Veículo</th>
            <th>Distância</th>
            <th>Tempo Est.</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let entrega of entregasFiltradas" (click)="selecionarEntrega(entrega)">
            <td><strong>{{ entrega.codigo_rastreio }}</strong></td>
            <td>
              <span class="status-badge" [ngClass]="'status-' + entrega.status">
                {{ entrega.status }}
              </span>
            </td>
            <td>{{ entrega.origem_endereco }}</td>
            <td>{{ entrega.destino_endereco }}</td>
            <td>{{ entrega.motorista_nome }}</td>
            <td>{{ entrega.veiculo_placa }}</td>
            <td>{{ entrega.distancia_km }} km</td>
            <td>{{ entrega.tempo_estimado_minutos }} min</td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="!loading && entregasFiltradas.length === 0" class="empty-state">
        Nenhuma entrega encontrada.
      </div>

      <!-- TODO: Detalhe inline - deveria abrir modal ou página separada -->
      <div *ngIf="entregaSelecionada" class="detail-panel">
        <div class="detail-header">
          <h2>Entrega {{ entregaSelecionada.codigo_rastreio }}</h2>
          <button class="btn-close" (click)="entregaSelecionada = null">✕</button>
        </div>
        <div class="detail-grid">
          <div class="detail-item">
            <label>Status:</label>
            <span class="status-badge" [ngClass]="'status-' + entregaSelecionada.status">
              {{ entregaSelecionada.status }}
            </span>
          </div>
          <div class="detail-item">
            <label>Motorista:</label>
            <span>{{ entregaSelecionada.motorista_nome }}</span>
          </div>
          <div class="detail-item">
            <label>Veículo:</label>
            <span>{{ entregaSelecionada.veiculo_placa }}</span>
          </div>
          <div class="detail-item">
            <label>Origem:</label>
            <span>{{ entregaSelecionada.origem_endereco }}</span>
          </div>
          <div class="detail-item">
            <label>Destino:</label>
            <span>{{ entregaSelecionada.destino_endereco }}</span>
          </div>
          <div class="detail-item">
            <label>Distância:</label>
            <span>{{ entregaSelecionada.distancia_km }} km</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .entregas-page { padding: 20px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .page-header h1 { margin: 0; color: #333; font-size: 24px; }
    .btn-refresh { background: #e3f2fd; color: #1565c0; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
    .filters { display: flex; gap: 12px; margin-bottom: 20px; }
    .filters input, .filters select { padding: 10px 14px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
    .filters input { flex: 1; }
    .stats-row { display: flex; gap: 16px; margin-bottom: 20px; }
    .mini-stat { background: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; flex: 1; }
    .mini-value { display: block; font-size: 28px; font-weight: bold; color: #333; }
    .mini-value.pending { color: #e65100; }
    .mini-value.transit { color: #1565c0; }
    .mini-value.delivered { color: #2e7d32; }
    .mini-label { font-size: 12px; color: #999; text-transform: uppercase; }
    .loading { text-align: center; padding: 40px; color: #666; }
    .data-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .data-table th { text-align: left; padding: 14px; background: #f5f5f5; color: #666; font-size: 13px; text-transform: uppercase; }
    .data-table td { padding: 14px; border-bottom: 1px solid #f5f5f5; font-size: 14px; }
    .data-table tr:hover { background: #f9f9f9; cursor: pointer; }
    .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .status-PENDENTE { background: #fff3e0; color: #e65100; }
    .status-EM_TRANSITO { background: #e3f2fd; color: #1565c0; }
    .status-ENTREGUE { background: #e8f5e9; color: #2e7d32; }
    .status-CANCELADA { background: #ffebee; color: #c62828; }
    .empty-state { text-align: center; padding: 40px; color: #999; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .detail-panel { background: white; border-radius: 12px; padding: 24px; margin-top: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .detail-header h2 { margin: 0; color: #333; }
    .btn-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #999; }
    .detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .detail-item { display: flex; flex-direction: column; gap: 4px; }
    .detail-item label { font-size: 12px; color: #999; text-transform: uppercase; }
    .detail-item span { font-size: 15px; color: #333; }
  `]
})
export class EntregasComponent implements OnInit {
  entregas: Entrega[] = [];
  entregasFiltradas: Entrega[] = [];
  entregaSelecionada: Entrega | null = null;
  loading = true;
  termoBusca = '';
  filtroStatus = '';

  constructor(private entregasService: EntregasService) {}

  ngOnInit(): void {
    this.carregarEntregas();
  }

  async carregarEntregas(): Promise<void> {
    this.loading = true;
    this.entregas = await this.entregasService.getEntregas();
    this.entregasFiltradas = [...this.entregas];
    this.loading = false;
  }

  filtrar(): void {
    this.entregasFiltradas = this.entregas.filter(e => {
      const matchBusca = !this.termoBusca ||
        e.codigo_rastreio?.toLowerCase().includes(this.termoBusca.toLowerCase()) ||
        e.destino_endereco?.toLowerCase().includes(this.termoBusca.toLowerCase());
      const matchStatus = !this.filtroStatus || e.status === this.filtroStatus;
      return matchBusca && matchStatus;
    });
  }

  // TODO: Contagem no template - deveria ser computed/pipe
  countByStatus(status: string): number {
    return this.entregas.filter(e => e.status === status).length;
  }

  selecionarEntrega(entrega: Entrega): void {
    this.entregaSelecionada = entrega;
  }
}
