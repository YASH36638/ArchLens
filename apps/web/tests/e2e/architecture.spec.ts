import { test, expect } from '@playwright/test';
import { mockArchlensApi } from './fixtures/api-mock';
import { signInViaCallback } from './fixtures/sign-in';

test.describe('architecture tab', () => {
  test.beforeEach(async ({ page }) => {
    await mockArchlensApi(page);
  });

  test('renders folder tree, 2D graph, and smells from the latest scan', async ({ page }) => {
    await signInViaCallback(page);
    await page.goto('/repos/acme/widgets');
    await expect(page.getByTestId('repo-tabs')).toBeVisible();

    await page.getByRole('link', { name: 'Architecture' }).click();
    await page.waitForURL('**/repos/acme/widgets/architecture');

    await expect(page.getByTestId('architecture-workbench')).toBeVisible();
    await expect(page.getByTestId('folder-tree')).toBeVisible();
    await expect(page.getByTestId('architecture-graph-2d')).toBeVisible();
    await expect(page.getByTestId('smells-panel')).toBeVisible();

    await expect(page.getByTestId('folder-tree').getByText('src')).toBeVisible();
    await expect(page.getByTestId('architecture-graph-2d')).toContainText(
      '3 of 3 modules · 3 edges'
    );

    await page.getByTestId('architecture-graph-list-toggle').click();
    await page.getByRole('button', { name: /core/ }).click();
    await expect(page.getByTestId('architecture-graph-2d')).toContainText('File connections');
    await expect(page.getByTestId('architecture-graph-2d')).toContainText('index.ts');
    await page.getByTestId('architecture-graph-back').click();
    await expect(page.getByTestId('architecture-graph-2d')).toContainText('Dependency map');
    await expect(page.getByTestId('smells-panel')).toContainText('god-class');
  });
});
