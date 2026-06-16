import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FrotasService } from '../../services/frotas.service';
import { Motorista } from '../../models';

// TODO: Componente copiado de VeiculosComponent com find-replace
// TODO: Deveria ter componente base abstrato para CRUD
@Component({
  selector: 'app-motoristas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="motoristas-page">
      <div class="page-header">
        <h1>Gestão de Motoristas</h1>
        <button class="btn-primary" (click)="mostrarFormulario()">+ Novo Motorista</button>
      </div>

      <div class="filters">
        <input type="text" placeholder="Buscar por nome ou CPF..." [(ngModel)]="termoBusca" (input)="filtrar()">
        <select [(ngModel)]="filtroStatus" (change)="filtrar()">
          <option value="">Todos os Status</option>
          <option value="ATIVO">Ativo</option>
          <option value="INATIVO">Inativo</option>
          <option value="FERIAS">Férias</option>
          <option value="AFASTADO">Afastado</option>
        </select>
      </div>

      <div *ngIf="loading" class="loading">Carregando motoristas...</div>

      <table class="data-table" *ngIf="!loading && !mostrandoForm">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nome</th>
            <th>CPF</th>
            <th>CNH</th>
            <th>Categoria</th>
            <th>Validade CNH</th>
            <th>Telefone</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let motorista of motoristasFiltrados" 
              [ngClass]="{'cnh-vencida': isCnhVencida(motorista)}">
            <td>{{ motorista.id }}</td>
            <td><strong>{{ motorista.nome }}</strong></td>
            <td>{{ motorista.cpf }}</td>
            <td>{{ motorista.cnh }}</td>
            <td>{{ motorista.categoria_cnh }}</td>
            <td [ngClass]="{'text-danger': isCnhVencida(motorista)}">
              {{ motorista.validade_cnh }}
              <span *ngIf="isCnhVencida(motorista)" class="badge-danger">VENCIDA</span>
            </td>
            <td>{{ motorista.telefone }}</td>
            <td>
              <span class="status-badge" [ngClass]="'status-' + motorista.status">
                {{ motorista.status }}
              </span>
            </td>
            <td class="actions">
              <button class="btn-edit" (click)="editarMotorista(motorista)">Editar</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="!loading && motoristasFiltrados.length === 0 && !mostrandoForm" class="empty-state">
        Nenhum motorista encontrado.
      </div>

      <!-- TODO: Formulário duplicado do veículos - deveria ser componente genérico -->
      <div *ngIf="mostrandoForm" class="form-container">
        <h2>{{ editando ? 'Editar Motorista' : 'Novo Motorista' }}</h2>
        <form (submit)="salvarMotorista($event)">
          <div class="form-grid">
            <div class="form-group">
              <label>Nome *</label>
              <input type="text" [(ngModel)]="formMotorista.nome" name="nome" required>
            </div>
            <div class="form-group">
              <label>CPF *</label>
              <input type="text" [(ngModel)]="formMotorista.cpf" name="cpf" required placeholder="000.000.000-00">
            </div>
            <div class="form-group">
              <label>CNH *</label>
              <input type="text" [(ngModel)]="formMotorista.cnh" name="cnh" required>
            </div>
            <div class="form-group">
              <label>Categoria CNH</label>
              <select [(ngModel)]="formMotorista.categoria_cnh" name="categoria_cnh">
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="AB">AB</option>
              </select>
            </div>
            <div class="form-group">
              <label>Validade CNH</label>
              <input type="date" [(ngModel)]="formMotorista.validade_cnh" name="validade_cnh">
            </div>
            <div class="form-group">
              <label>Telefone</label>
              <input type="text" [(ngModel)]="formMotorista.telefone" name="telefone" placeholder="(11) 99999-9999">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="formMotorista.email" name="email">
            </div>
            <div class="form-group">
              <label>Status</label>
              <select [(ngModel)]="formMotorista.status" name="status">
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
                <option value="FERIAS">Férias</option>
                <option value="AFASTADO">Afastado</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary">{{ editando ? 'Atualizar' : 'Cadastrar' }}</button>
            <button type="button" class="btn-secondary" (click)="cancelarForm()">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  `,
  // TODO: CSS copiado do VeiculosComponent - deveria ser compartilhado
  styles: [`
    .motoristas-page { padding: 20px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .page-header h1 { margin: 0; color: #333; font-size: 24px; }
    .btn-primary { background: #1565c0; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; }
    .btn-primary:hover { background: #0d47a1; }
    .btn-secondary { background: #e0e0e0; color: #333; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
    .filters { display: flex; gap: 12px; margin-bottom: 20px; }
    .filters input, .filters select { padding: 10px 14px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
    .filters input { flex: 1; }
    .loading { text-align: center; padding: 40px; color: #666; }
    .data-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .data-table th { text-align: left; padding: 14px; background: #f5f5f5; color: #666; font-size: 13px; text-transform: uppercase; }
    .data-table td { padding: 14px; border-bottom: 1px solid #f5f5f5; font-size: 14px; }
    .data-table tr:hover { background: #f9f9f9; }
    .cnh-vencida { background: #fff3e0 !important; }
    .text-danger { color: #c62828; font-weight: bold; }
    .badge-danger { background: #c62828; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px; }
    .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .status-ATIVO { background: #e8f5e9; color: #2e7d32; }
    .status-INATIVO { background: #ffebee; color: #c62828; }
    .status-FERIAS { background: #e3f2fd; color: #1565c0; }
    .status-AFASTADO { background: #fff3e0; color: #e65100; }
    .actions { display: flex; gap: 8px; }
    .btn-edit { background: #e3f2fd; color: #1565c0; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    .empty-state { text-align: center; padding: 40px; color: #999; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .form-container { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .form-container h2 { margin: 0 0 20px 0; color: #333; }
    .form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 13px; font-weight: 600; color: #555; }
    .form-group input, .form-group select { padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
    .form-actions { display: flex; gap: 12px; }
  `]
})
export class MotoristasComponent implements OnInit {
  motoristas: Motorista[] = [];
  motoristasFiltrados: Motorista[] = [];
  loading = true;
  mostrandoForm = false;
  editando = false;
  termoBusca = '';
  filtroStatus = '';

  formMotorista: Partial<Motorista> = {
    nome: '', cpf: '', cnh: '', categoria_cnh: 'B',
    validade_cnh: '', telefone: '', email: '', status: 'ATIVO'
  };

  private editandoId: number | null = null;

  constructor(private frotasService: FrotasService) {}

  ngOnInit(): void {
    this.carregarMotoristas();
  }

  async carregarMotoristas(): Promise<void> {
    this.loading = true;
    this.motoristas = await this.frotasService.getMotoristas();
    this.motoristasFiltrados = [...this.motoristas];
    this.loading = false;
  }

  filtrar(): void {
    this.motoristasFiltrados = this.motoristas.filter(m => {
      const matchBusca = !this.termoBusca ||
        m.nome.toLowerCase().includes(this.termoBusca.toLowerCase()) ||
        m.cpf.includes(this.termoBusca);
      const matchStatus = !this.filtroStatus || m.status === this.filtroStatus;
      return matchBusca && matchStatus;
    });
  }

  // TODO: Lógica de data no componente - deveria ser pipe
  isCnhVencida(motorista: Motorista): boolean {
    if (!motorista.validade_cnh) return false;
    return new Date(motorista.validade_cnh) < new Date();
  }

  mostrarFormulario(): void {
    this.mostrandoForm = true;
    this.editando = false;
    this.formMotorista = {
      nome: '', cpf: '', cnh: '', categoria_cnh: 'B',
      validade_cnh: '', telefone: '', email: '', status: 'ATIVO'
    };
  }

  editarMotorista(motorista: Motorista): void {
    this.mostrandoForm = true;
    this.editando = true;
    this.editandoId = motorista.id;
    this.formMotorista = { ...motorista };
  }

  cancelarForm(): void {
    this.mostrandoForm = false;
    this.editando = false;
  }

  async salvarMotorista(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.formMotorista.nome || !this.formMotorista.cpf) {
      alert('Preencha os campos obrigatórios!');
      return;
    }
    if (this.editando && this.editandoId) {
      await this.frotasService.atualizarMotorista(this.editandoId, this.formMotorista);
    } else {
      await this.frotasService.criarMotorista(this.formMotorista);
    }
    this.cancelarForm();
    this.frotasService.limparCache();
    await this.carregarMotoristas();
  }
}
