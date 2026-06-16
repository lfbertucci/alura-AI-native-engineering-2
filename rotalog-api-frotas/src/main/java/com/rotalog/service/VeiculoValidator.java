package com.rotalog.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * VeiculoValidator - Validações de formato puras (sem acesso a repositório)
 */
@Slf4j
@Component
public class VeiculoValidator {

    public void validarPlaca(String placa) {
        if (placa == null || placa.isEmpty()) {
            throw new RuntimeException("Placa é obrigatória");
        }
        if (placa.length() != 7) {
            throw new RuntimeException("Placa deve ter 7 caracteres");
        }
    }

    public void validarModelo(String modelo) {
        if (modelo == null || modelo.isEmpty()) {
            throw new RuntimeException("Modelo é obrigatório");
        }
    }

    public void validarAnoFabricacao(Integer anoFabricacao) {
        if (anoFabricacao == null || anoFabricacao < 1900 || anoFabricacao > 2100) {
            throw new RuntimeException("Ano de fabricação inválido");
        }
    }

    public void validarQuilometragem(Long quilometragem) {
        if (quilometragem < 0) {
            throw new RuntimeException("Quilometragem não pode ser negativa");
        }
    }
}
