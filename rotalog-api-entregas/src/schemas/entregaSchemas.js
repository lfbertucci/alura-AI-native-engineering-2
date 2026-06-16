'use strict';

const { z } = require('zod');

const criarEntregaSchema = z.object({
  origem_endereco: z.string({ required_error: 'Endereços de origem e destino são obrigatórios' })
    .min(1, 'Endereços de origem e destino são obrigatórios'),
  destino_endereco: z.string({ required_error: 'Endereços de origem e destino são obrigatórios' })
    .min(1, 'Endereços de origem e destino são obrigatórios'),
  peso_kg: z.number().optional(),
  origem_lat: z.number().optional(),
  origem_lng: z.number().optional(),
  destino_lat: z.number().optional(),
  destino_lng: z.number().optional(),
  observacoes: z.string().optional(),
});

const atualizarEntregaSchema = z.object({
  origem_endereco: z.string().optional(),
  destino_endereco: z.string().optional(),
  peso_kg: z.number().optional(),
  observacoes: z.string().optional(),
});

const atribuirEntregaSchema = z.object({
  veiculo_placa: z.string({ required_error: 'Placa do veículo e ID do motorista são obrigatórios' })
    .min(1, 'Placa do veículo e ID do motorista são obrigatórios'),
  motorista_id: z.union([z.string(), z.number()], {
    required_error: 'Placa do veículo e ID do motorista são obrigatórios',
    invalid_type_error: 'Placa do veículo e ID do motorista são obrigatórios',
  }).refine((v) => v !== undefined && v !== null && v !== '', {
    message: 'Placa do veículo e ID do motorista são obrigatórios',
  }),
  motorista_nome: z.string().optional(),
  veiculo_modelo: z.string().optional(),
});

const atualizarStatusSchema = z.object({
  status: z.string({ required_error: 'Status é obrigatório' }).min(1, 'Status é obrigatório'),
});

module.exports = {
  criarEntregaSchema,
  atualizarEntregaSchema,
  atribuirEntregaSchema,
  atualizarStatusSchema,
};
