import { test, expect } from '@playwright/test';

test('End-to-End User Journey: Register, Search, Reserve, and Verify', async ({ page }) => {
  // Usamos una marca de tiempo para asegurar que el email y usuario son únicos en cada ejecución
  const timestamp = Date.now();
  const username = `e2e_user_${timestamp}`;
  const email = `e2e_${timestamp}@uni.es`;
  const password = 'TestPassword123!';

  // 1. Navegar a la página de inicio
  await page.goto('http://localhost:5173/');
  
  // 2. Registrar al usuario
  await page.locator('a[href="/register"]').first().click();
  await page.waitForURL(/.*\/register/);
  
  // Rellenar formulario de registro de forma resiliente
  await page.locator('input[type="text"], input[name="username"]').first().fill(username);
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"], input[name="password"]').first().fill(password);
  
  // Enviar registro
  await page.locator('button[type="submit"]').click();

  // Esperar a la redirección automática al login
  await page.waitForURL(/.*\/login/);

  // 3. Iniciar sesión
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"], input[name="password"]').first().fill(password);
  await page.locator('button[type="submit"]').click();

  // Esperamos a que la aplicación nos redirija al perfil tras hacer login
  await page.waitForURL(/.*\/profile/);

  // 4. Buscar un viaje
  await page.goto('http://localhost:5173/rides');
  await page.locator('#ride-origin').fill('Madrid');
  await page.locator('form button[type="submit"]').click();

  // Esperar a que la lista de resultados se cargue
  await expect(page.locator('article').first()).toBeVisible();

  // 5. Reservar un asiento
  await page.locator('article button.btn-primary').first().click();
  
  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible();
  await modal.locator('button.btn-primary').click();
  await expect(page.locator('.message-success')).toBeVisible();

  // 6. Verificar que la reserva se guardó en el Perfil
  await page.goto('http://localhost:5173/profile');
  await expect(page.getByRole('heading', { name: 'Mis Reservas' })).toBeVisible();
  await expect(page.locator('article').filter({ hasText: 'CONFIRMED' }).first()).toBeVisible();
});