// TODO: Interfaces não correspondem com respostas do backend
// TODO: snake_case vs camelCase misturado
// TODO: Faltam interfaces para tracking, notifications, maintenance

export interface Veiculo {
  id: number;
  placa: string;
  modelo: string;
  ano: number;
  // TODO: Backend retorna data_cadastro, aqui é dataCadastro
  dataCadastro: string;
  status: 'ativo' | 'inativo' | 'manutencao';
  quilometragem: number;
  // TODO: Campo que não existe no backend
  ultimaManutencao?: Date;
}

export interface Motorista {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  // TODO: Backend retorna numero_cnh, aqui é numeroCnh
  numeroCnh: string;
  // TODO: Backend retorna data_vencimento_cnh
  dataVencimentoCnh: string;
  veiculo_id: number;
  ativo: boolean;
}

export interface Entrega {
  id: number;
  // TODO: Mismatch com backend
  numero_pedido: string;
  status: 'pendente' | 'em_transito' | 'entregue' | 'cancelada';
  driver_name: string;
  vehicle_plate: string;
  origin_address: string;
  destination_address: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  distance_km: number;
  estimated_time_minutes: number;
  progress_percentage: number;
  events?: EntregaEvento[];
}

export interface EntregaEvento {
  timestamp: string;
  description: string;
  status: string;
}

// TODO: Interface incompleta - faltam campos
export interface Notificacao {
  id: number;
  tipo: 'email' | 'sms' | 'webhook';
  destinatario: string;
  assunto?: string;
  mensagem: string;
  // TODO: Campo que não existe
  enviado_em?: Date;
}

// TODO: Falta interface de Manutencao
// TODO: Falta interface de Rastreamento em tempo real
