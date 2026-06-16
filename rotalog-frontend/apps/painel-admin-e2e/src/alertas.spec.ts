import { test, expect } from '@playwright/test';

// Pre-condition: api-frotas (8080) and api-notificacoes (5000) must be running,
// or the requests can be mocked via route interception as shown below.

const MOCK_ALERTAS = [
  {
    id: 1,
    veiculoId: 10,
    placa: 'ABC-1234',
    modelo: 'Caminhao X',
    quilometragemAlerta: 80000,
    motivo: 'KM',
    dataAlerta: '2026-06-14',
    statusNotificacao: 'PENDENTE'
  },
  {
    id: 2,
    veiculoId: 11,
    placa: 'DEF-5678',
    modelo: 'Van Y',
    quilometragemAlerta: 50000,
    motivo: 'TEMPO',
    dataAlerta: '2026-06-10',
    statusNotificacao: 'ENVIADA'
  }
];

test.describe('Pagina de Alertas de Manutencao', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the alertas endpoint so tests are not dependent on api-frotas being live
    await page.route('**/api/alertas-manutencao', async (route) => {
      const url = route.request().url();
      const statusParam = new URL(url).searchParams.get('status');

      const filtered = statusParam
        ? MOCK_ALERTAS.filter(a => a.statusNotificacao === statusParam)
        : MOCK_ALERTAS;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(filtered)
      });
    });

    // Mock other API calls used by dashboard to avoid noise
    await page.route('**/api/veiculos', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.route('**/api/motoristas', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
  });

  test('deve navegar ate Alertas pela sidebar e renderizar linhas', async ({ page }) => {
    await page.goto('/');

    // Click on the Alertas link in the sidebar
    await page.click('a[href="/alertas"]');

    // Wait for the table to appear
    await expect(page.locator('.data-table')).toBeVisible();

    // Validate rows are rendered
    const rows = page.locator('.data-table tbody tr');
    await expect(rows).toHaveCount(2);

    // Validate content of first row
    await expect(rows.first()).toContainText('ABC-1234');
    await expect(rows.first()).toContainText('Caminhao X');
    await expect(rows.first()).toContainText('KM');
    await expect(rows.first()).toContainText('PENDENTE');
  });

  test('deve filtrar alertas por status ENVIADA', async ({ page }) => {
    await page.goto('/alertas');

    // Wait for initial load
    await expect(page.locator('.data-table')).toBeVisible();
    await expect(page.locator('.data-table tbody tr')).toHaveCount(2);

    // Apply filter
    await page.selectOption('select', 'ENVIADA');

    // Wait for table to reflect filter
    const rows = page.locator('.data-table tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('DEF-5678');
    await expect(rows.first()).toContainText('ENVIADA');
  });

  test('deve exibir estado vazio quando nao ha alertas com o filtro', async ({ page }) => {
    await page.goto('/alertas');

    await expect(page.locator('.data-table')).toBeVisible();

    // Filter by FALHA - none mocked
    await page.selectOption('select', 'FALHA');

    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.data-table tbody tr')).toHaveCount(0);
  });
});
