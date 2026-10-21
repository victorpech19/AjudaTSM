const { test, expect } = require('@playwright/test');
const questions = require('../preguntas.json');

test.describe('Recovery and complete question bank', () => {
  test.use({ serviceWorkers: 'block' });

  async function ready(page) {
    await page.goto('./');
    await expect(page.locator('#count-todos')).toHaveText(String(questions.length));
    await expect(page.locator('#btn-true')).toBeEnabled();
  }

  test('refresh keeps the submitted answer locked and never counts it twice', async ({ page }) => {
    await ready(page);
    await page.locator('#btn-true').click();
    const statement = await page.locator('#statement-text').textContent();
    const counters = await page.locator('#stat-correct, #stat-wrong').allTextContents();
    await page.reload();
    await expect(page.locator('#explanation-card')).toBeVisible();
    await expect(page.locator('#statement-text')).toHaveText(statement);
    await expect(page.locator('#btn-true')).toBeDisabled();
    await expect(page.locator('#btn-false')).toBeDisabled();
    await page.keyboard.press('v');
    await page.keyboard.press('f');
    expect(await page.locator('#stat-correct, #stat-wrong').allTextContents()).toEqual(counters);
  });

  test('corrupt saved progress starts a usable new round', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ajudatsm-state-v2', '{broken'));
    await ready(page);
    await page.locator('#btn-false').click();
    await expect(page.locator('#explanation-card')).toBeVisible();
  });

  test('refresh restores the selected topic as well as the displayed questions', async ({ page }) => {
    await ready(page);
    await page.locator('[data-topic="tema2"]').click();
    await page.reload();
    await expect(page.locator('[data-topic="tema2"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-topic="todos"]')).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator('#card-topic-badge')).toContainText(/Tractaments|Tratamientos/);
  });

  test('arrow keys on topic tabs navigate topics without submitting an answer', async ({ page }) => {
    await ready(page);
    await page.locator('[data-topic="todos"]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-topic="tema1"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#explanation-card')).toBeHidden();
    await expect(page.locator('#stat-correct')).toHaveText('0');
    await expect(page.locator('#stat-wrong')).toHaveText('0');
  });

  test('denied storage leaves the quiz usable and explains that progress is temporary', async ({ page }) => {
    await page.addInitScript(() => {
      for (const key of ['getItem', 'setItem', 'removeItem']) {
        Storage.prototype[key] = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
      }
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await ready(page);
    await page.locator('#btn-true').click();
    await expect(page.locator('#explanation-card')).toBeVisible();
    await expect(page.locator('#connection-status')).toContainText(/temporal|no.*desar/i);
    expect(errors).toEqual([]);
  });

  test('an unavailable bank has a retry that recovers without a page reload', async ({ page }) => {
    let unavailable = true;
    await page.route('**/preguntas.json', async route => {
      if (unavailable) await route.fulfill({ status: 503, body: 'Unavailable' });
      else await route.continue();
    });
    await page.goto('./');
    await expect(page.locator('#retry-load-btn')).toBeVisible();
    await expect(page.locator('#btn-true')).toBeDisabled();
    unavailable = false;
    await page.locator('#retry-load-btn').click();
    await expect(page.locator('#count-todos')).toHaveText(String(questions.length));
    await expect(page.locator('#btn-true')).toBeEnabled();
    await expect(page.locator('#retry-load-btn')).toHaveCount(0);
  });

  test('invalid bank data is rejected visibly', async ({ page }) => {
    await page.route('**/preguntas.json', route => route.fulfill({
      contentType: 'application/json', body: JSON.stringify([{ id: 1, respuesta: 'true' }])
    }));
    await page.goto('./');
    await expect(page.locator('#retry-load-btn')).toBeVisible();
    await expect(page.locator('#btn-true')).toBeDisabled();
  });

  test('every question shows its exact explanation and trap for both possible answers', async ({ page }) => {
    await ready(page);
    await page.locator('#shuffle-toggle').click();
    await page.locator('[data-topic="todos"]').click();
    const result = await page.evaluate(bank => {
      const get = id => document.getElementById(id);
      let reviewed = 0;
      for (const choice of [true, false]) {
        document.querySelector('[data-topic="todos"]').click();
        for (const q of bank) {
          if (get('statement-text').textContent !== q.pregunta) throw new Error('Sequence mismatch: ' + q.id);
          get(choice ? 'btn-true' : 'btn-false').click();
          if (get('explanation-card').hidden) throw new Error('Explanation hidden: ' + q.id);
          if (get('explanation-text').textContent !== q.explicacion) throw new Error('Wrong explanation: ' + q.id);
          if (get('trampa-text').textContent !== q.trampa || get('trampa-text').hidden) throw new Error('Missing trap: ' + q.id);
          if (!get('btn-true').disabled || !get('btn-false').disabled) throw new Error('Unlocked answer: ' + q.id);
          const shouldBeCorrect = choice === q.respuesta;
          const reportedCorrect = !get('result-title').textContent.includes('incorrecta');
          if (shouldBeCorrect !== reportedCorrect) throw new Error('Wrong verdict: ' + q.id);
          get('btn-next').click();
          reviewed++;
        }
        if (get('completion-card').hidden || get('progress-bar').style.width !== '100%') throw new Error('Incomplete round');
      }
      return reviewed;
    }, questions);
    expect(result).toBe(questions.length * 2);
    await page.reload();
    await expect(page.locator('#completion-card')).toBeVisible();
    await expect(page.locator('#stat-correct')).toHaveText(String(questions.filter(q => !q.respuesta).length));
    await expect(page.locator('#stat-wrong')).toHaveText(String(questions.filter(q => q.respuesta).length));
    await expect(page.locator('#progress-bar')).toHaveAttribute('aria-valuenow', '100');
  });
});
