import { expect, test } from '@playwright/test';

/**
 * Acceptance smoke on a 375×667 viewport (spec §16):
 * a brand-new player reaches their first reveal in ≤ 3 taps + 1 slider drag,
 * without typing any text.
 */
test('new player reaches first reveal in ≤3 taps + 1 drag, no typing', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/');

  // tap 1: Free Play
  await page.getByRole('link', { name: /free play/i }).click();

  // tap 2: confirm suggested country
  await page.getByTestId('confirm-country').click();

  // either a quant round (slider) or a binary round (one tap) appears
  const slider = page.locator('input.log-slider');
  const binaryCard = page.locator('.binary-choice button').first();
  await expect(slider.or(binaryCard)).toBeVisible({ timeout: 15_000 });

  if (await slider.isVisible()) {
    // drag: keyboard arrows count as the slider interaction (a11y path)
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    // tap 3: submit
    await page.getByRole('button', { name: /lock in|confirmar/i }).click();
  } else {
    // tap 3: binary choice IS the submission
    await binaryCard.click();
  }

  await expect(page.locator('.score-pill').filter({ hasText: '+' })).toBeVisible({ timeout: 15_000 });
});

test('no truth or factor is observable before a guess is submitted', async ({ page, context }) => {
  await context.clearCookies();
  const responses: string[] = [];
  page.on('response', async (res) => {
    if (res.url().includes('/api/') && !res.url().includes('/api/guess')) {
      try {
        responses.push(await res.text());
      } catch {
        /* streaming/opaque */
      }
    }
  });
  await page.goto('/play');
  await page.getByTestId('confirm-country').click();
  await page.locator('input.log-slider, .binary-choice').first().waitFor({ timeout: 15_000 });

  const forbidden = /"truth"|grid_gco2|power_watts|kwh_per_event|task_kwh_useful|"efficiency"|"grams"/;
  for (const body of responses) {
    expect(body).not.toMatch(forbidden);
  }
});

test('daily game completes and shows share card and countdown', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/daily');
  await page.getByTestId('confirm-country').click();

  for (let round = 0; round < 5; round++) {
    const slider = page.locator('input.log-slider');
    const binaryCard = page.locator('.binary-choice button').first();
    await expect(slider.or(binaryCard)).toBeVisible({ timeout: 15_000 });
    if (await slider.isVisible()) {
      await slider.focus();
      await page.keyboard.press('ArrowRight');
      await page.getByRole('button', { name: /lock in|confirmar/i }).click();
    } else {
      await binaryCard.click();
    }
    await expect(page.getByRole('button', { name: /next round|siguiente/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /next round|siguiente/i }).click();
  }

  // completion screen: share text + countdown (no identity prompt mid-game)
  await expect(page.locator('pre').filter({ hasText: /Emissionary #/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/next daily game in|próximo juego/i)).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // the identity prompt lives on the leaderboard instead
  await page.goto('/leaderboard');
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });
});

test('quant submit is disabled until the slider is touched (anti center-click)', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/play');
  await page.getByTestId('confirm-country').click();
  const slider = page.locator('input.log-slider');
  const binaryCard = page.locator('.binary-choice button').first();
  await expect(slider.or(binaryCard)).toBeVisible({ timeout: 15_000 });
  if (await slider.isVisible()) {
    const submit = page.getByRole('button', { name: /lock in|confirmar/i });
    await expect(submit).toBeDisabled();
    await slider.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(submit).toBeEnabled();
  }
});
