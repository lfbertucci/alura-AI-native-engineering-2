import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FrotasService } from '../../services/frotas.service';
import { Veiculo } from '../../models';

// TODO: Componente God Object - lista + formulário + detalhes tudo junto
// TODO: Deveria ser dividido em VeiculosListComponent, VeiculoFormComponent, VeiculoDetailComponent
// TODO: Sem paginação - carrega todos os veículos de uma vez
@Component({
  selector: 'app-veiculos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="veiculos-page">
      <div class="page-header">
        <h1>Gestão de Veículos</h1>
        <button class="btn-primary" (click)="mostrarFormulario()">+ Novo Veículo</button>
      </div>

      <!-- TODO: Filtros inline - deveria ser componente separado -->
      <div class="filters">
        <input type="text" placeholder="Buscar por placa ou modelo..." [(ngModel)]="termoBusca" (input)="filtrar()">
        <select [(ngModel)]="filtroStatus" (change)="filtrar()">
          <option value="">Todos os Status</option>
          <option value="ATIVO">Ativo</option>
          <option value="INATIVO">Inativo</option>
          <option value="EM_MANUTENCAO">Em Manutenção</option>
        </select>
      </div>

      <div *ngIf="loading" class="loading">Carregando veículos...</div>

      <!-- TODO: Tabela sem virtualização - performance ruim com muitos registros -->
      <table class="data-table" *ngIf="!loading && !mostrandoForm">
        <thead>
          <tr>
            <th (click)="ordenar('id')">ID</th>
            <th (click)="ordenar('placa')">Placa</th>
            <th (click)="ordenar('modelo')">Modelo</th>
            <th (click)="ordenar('marca')">Marca</th>
            <th>Ano</th>
            <th>Tipo</th>
            <th>Status</th>
            <th>KM Atual</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let veiculo of veiculosFiltrados" (click)="selecionarVeiculo(veiculo)">
            <td>{{ veiculo.id }}</td>
            <td><strong>{{ veiculo.placa }}</strong></td>
            <td>{{ veiculo.modelo }}</td>
            <td>{{ veiculo.marca }}</td>
            <td>{{ veiculo.ano }}</td>
            <td>{{ veiculo.tipo }}</td>
            <td>
              <span class="status-badge" [ngClass]="'status-' + veiculo.status">
                {{ veiculo.status }}
              </span>
            </td>
            <td>{{ veiculo.km_atual | number }} km</td>
            <td class="actions">
              <button class="btn-edit" (click)="editarVeiculo(veiculo); $event.stopPropagation()">Editar</button>
              <button class="btn-delete" (click)="confirmarExclusao(veiculo); $event.stopPropagation()">Excluir</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="!loading && veiculosFiltrados.length === 0 && !mostrandoForm" class="empty-state">
        Nenhum veículo encontrado.
      </div>

      <!-- TODO: Formulário inline - deveria ser modal ou rota separada -->
      <div *ngIf="mostrandoForm" class="form-container">
        <h2>{{ editando ? 'Editar Veículo' : 'Novo Veículo' }}</h2>
        <form (submit)="salvarVeiculo($event)">
          <div class="form-grid">
            <div class="form-group">
              <label>Placa *</label>
              <input type="text" [(ngModel)]="formVeiculo.placa" name="placa" required placeholder="ABC-1234">
            </div>
            <div class="form-group">
              <label>Modelo *</label>
              <input type="text" [(ngModel)]="formVeiculo.modelo" name="modelo" required>
            </div>
            <div class="form-group">
              <label>Marca *</label>
              <input type="text" [(ngModel)]="formVeiculo.marca" name="marca" required>
            </div>
            <div class="form-group">
              <label>Ano</label>
              <input type="number" [(ngModel)]="formVeiculo.ano" name="ano">
            </div>
            <div class="form-group">
              <label>Tipo</label>
              <select [(ngModel)]="formVeiculo.tipo" name="tipo">
                <option value="CAMINHAO">Caminhão</option>
                <option value="VAN">Van</option>
                <option value="CARRO">Carro</option>
                <option value="MOTO">Moto</option>
              </select>
            </div>
            <div class="form-group">
              <label>Status</label>
              <select [(ngModel)]="formVeiculo.status" name="status">
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
                <option value="EM_MANUTENCAO">Em Manutenção</option>
              </select>
            </div>
            <div class="form-group">
              <label>KM Atual</label>
              <input type="number" [(ngModel)]="formVeiculo.km_atual" name="km_atual">
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary">{{ editando ? 'Atualizar' : 'Cadastrar' }}</button>
            <button type="button" class="btn-secondary" (click)="cancelarForm()">Cancelar</button>
          </div>
        </form>
      </div>

      <!-- TODO: Modal de detalhes inline - deveria ser componente separado -->
      <div *ngIf="veiculoSelecionado && !mostrandoForm" class="detail-panel">
        <div class="detail-header">
          <h2>{{ veiculoSelecionado.placa }} - {{ veiculoSelecionado.modelo }}</h2>
          <button class="btn-close" (click)="veiculoSelecionado = null">✕</button>
        </div>
        <div class="detail-grid">
          <div class="detail-item">
            <label>Marca:</label>
            <span>{{ veiculoSelecionado.marca }}</span>
          </div>
          <div class="detail-item">
            <label>Ano:</label>
            <span>{{ veiculoSelecionado.ano }}</span>
          </div>
          <div class="detail-item">
            <label>Tipo:</label>
            <span>{{ veiculoSelecionado.tipo }}</span>
          </div>
          <div class="detail-item">
            <label>Status:</label>
            <span class="status-badge" [ngClass]="'status-' + veiculoSelecionado.status">
              {{ veiculoSelecionado.status }}
            </span>
          </div>
          <div class="detail-item">
            <label>KM Atual:</label>
            <span>{{ veiculoSelecionado.km_atual | number }} km</span>
          </div>
          <div class="detail-item">
            <label>Última Manutenção:</label>
            <span>{{ veiculoSelecionado.ultima_manutencao || 'N/A' }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .veiculos-page { padding: 20px; }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .page-header h1 { margin: 0; color: #333; font-size: 24px; }

    .btn-primary {
      background: #1565c0;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }

    .btn-primary:hover { background: #0d47a1; }

    .btn-secondary {
      background: #e0e0e0;
      color: #333;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }

    .filters {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }

    .filters input, .filters select {
      padding: 10px 14px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
    }

    .filters input { flex: 1; }

    .loading { text-align: center; padding: 40px; color: #666; }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .data-table th {
      text-align: left;
      padding: 14px;
      background: #f5f5f5;
      color: #666;
      font-size: 13px;
      text-transform: uppercase;
      cursor: pointer;
    }

    .data-table th:hover { background: #eee; }

    .data-table td {
      padding: 14px;
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

    .status-ATIVO { background: #e8f5e9; color: #2e7d32; }
    .status-INATIVO { background: #ffebee; color: #c62828; }
    .status-EM_MANUTENCAO { background: #fff3e0; color: #e65100; }

    .actions { display: flex; gap: 8px; }

    .btn-edit {
      background: #e3f2fd;
      color: #1565c0;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .btn-delete {
      background: #ffebee;
      color: #c62828;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #999;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .form-container {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .form-container h2 { margin: 0 0 20px 0; color: #333; }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }

    .form-group { display: flex; flex-direction: column; gap: 6px; }

    .form-group label {
      font-size: 13px;
      font-weight: 600;
      color: #555;
    }

    .form-group input, .form-group select {
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
    }

    .form-actions { display: flex; gap: 12px; }

    .detail-panel {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-top: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .detail-header h2 { margin: 0; color: #333; }

    .btn-close {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #999;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .detail-item { display: flex; flex-direction: column; gap: 4px; }

    .detail-item label {
      font-size: 12px;
      color: #999;
      text-transform: uppercase;
    }

    .detail-item span { font-size: 15px; color: #333; }
  `]
})
export class VeiculosComponent implements OnInit {
  veiculos: Veiculo[] = [];
  veiculosFiltrados: Veiculo[] = [];
  veiculoSelecionado: Veiculo | null = null;
  loading = true;
  mostrandoForm = false;
  editando = false;
  termoBusca = '';
  filtroStatus = '';

  // TODO: Formulário com ngModel em vez de Reactive Forms
  formVeiculo: Partial<Veiculo> = {
    placa: '', modelo: '', marca: '', ano: 2024,
    tipo: 'CAMINHAO', status: 'ATIVO', km_atual: 0
  };

  private editandoId: number | null = null;

  constructor(private frotasService: FrotasService) {}

  ngOnInit(): void {
    this.carregarVeiculos();
  }

  async carregarVeiculos(): Promise<void> {
    this.loading = true;
    this.veiculos = await this.frotasService.getVeiculos();
    this.veiculosFiltrados = [...this.veiculos];
    this.loading = false;
  }

  filtrar(): void {
    this.veiculosFiltrados = this.veiculos.filter(v => {
      const matchBusca = !this.termoBusca ||
        v.placa.toLowerCase().includes(this.termoBusca.toLowerCase()) ||
        v.modelo.toLowerCase().includes(this.termoBusca.toLowerCase());
      const matchStatus = !this.filtroStatus || v.status === this.filtroStatus;
      return matchBusca && matchStatus;
    });
  }

  // TODO: Ordenação no frontend - deveria ser no backend
  ordenar(campo: string): void {
    this.veiculosFiltrados.sort((a: any, b: any) => {
      if (a[campo] < b[campo]) return -1;
      if (a[campo] > b[campo]) return 1;
      return 0;
    });
  }

  selecionarVeiculo(veiculo: Veiculo): void {
    this.veiculoSelecionado = veiculo;
  }

  mostrarFormulario(): void {
    this.mostrandoForm = true;
    this.editando = false;
    this.editandoId = null;
    this.formVeiculo = {
      placa: '', modelo: '', marca: '', ano: 2024,
      tipo: 'CAMINHAO', status: 'ATIVO', km_atual: 0
    };
  }

  editarVeiculo(veiculo: Veiculo): void {
    this.mostrandoForm = true;
    this.editando = true;
    this.editandoId = veiculo.id;
    this.formVeiculo = { ...veiculo };
  }

  cancelarForm(): void {
    this.mostrandoForm = false;
    this.editando = false;
    this.editandoId = null;
  }

  async salvarVeiculo(event: Event): Promise<void> {
    event.preventDefault();

    // TODO: Validação mínima - deveria usar Validators do Angular
    if (!this.formVeiculo.placa || !this.formVeiculo.modelo) {
      alert('Preencha os campos obrigatórios!');
      return;
    }

    if (this.editando && this.editandoId) {
      await this.frotasService.atualizarVeiculo(this.editandoId, this.formVeiculo);
    } else {
      await this.frotasService.criarVeiculo(this.formVeiculo);
    }

    this.cancelarForm();
    this.frotasService.limparCache();
    await this.carregarVeiculos();
  }

  async confirmarExclusao(veiculo: Veiculo): Promise<void> {
    // TODO: Usar modal em vez de confirm nativo
    if (confirm(`Deseja excluir o veículo ${veiculo.placa}?`)) {
      await this.frotasService.deletarVeiculo(veiculo.id);
      this.frotasService.limparCache();
      await this.carregarVeiculos();
    }
  }
}
