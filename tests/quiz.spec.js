const { test, expect } = require('@playwright/test');
const { readFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const allQuestions = JSON.parse(readFileSync(path.join(__dirname, '..', 'preguntas.json'), 'utf8'));
const questions = allQuestions.filter(q => q.tipo !== 'multiple');
const topicNames = ['todos', 'tema1', 'tema2', 'tema3'];
const artifactDir = process.env.AJUDATSM_QA_ARTIFACT_DIR || path.join(__dirname, '..', 'test-artifacts');
mkdirSync(artifactDir, { recursive: true });

function artifactPath(browserName, filename) {
  const browserDir = path.join(artifactDir, browserName);
  mkdirSync(browserDir, { recursive: true });
  return path.join(browserDir, filename);
}

async function loadSequential(page) {
  await page.goto('./');
  await expect(page.locator('#question-format')).toBeVisible();
  await page.locator('#question-format').selectOption('vf');
  await expect(page.locator('#card-index-badge')).toBeVisible();
  if (await page.locator('#shuffle-toggle').evaluate(el => el.classList.contains('active'))) {
    await page.locator('#shuffle-toggle').click();
  }
}

async function answerFor(page, question) {
  const shown = await page.locator('#statement-text').textContent();
  const data = questions.find(q => q.pregunta === shown);
  expect(data, `question data missing for displayed statement: ${shown}`).toBeTruthy();
  await page.locator(data.respuesta ? '#btn-true' : '#btn-false').click();
  return data;
}

test('loads dataset, filters every topic, and renders the matching first statement', async ({ page }) => {
  await loadSequential(page);
  for (const topic of topicNames) {
    await page.locator(`.filter-pill[data-topic="${topic}"]`).click();
    const subset = topic === 'todos' ? questions : questions.filter(q => q.tema === topic);
    await expect(page.locator('#card-index-badge')).toHaveText(`Pregunta 1 de ${subset.length}`);
    await expect(page.locator('#statement-text')).toHaveText(subset[0].pregunta);
    await expect(page.locator(`.filter-pill[data-topic="${topic}"]`)).toHaveAttribute('aria-selected', 'true');
  }
  await expect(page.locator('#count-todos')).toHaveText(String(questions.length));
});

test('shows the result at once, explains on request, locks the answer, and advances progress once', async ({ page }) => {
  await loadSequential(page);
  const shown = await page.locator('#statement-text').textContent();
  const current = questions.find(q => q.pregunta === shown);
  expect(current).toBeTruthy();

  await answerFor(page, current);
  await expect(page.locator('#explanation-card')).toBeVisible();
  await expect(page.locator('#result-title')).toContainText('correcta');
  await expect(page.locator('#explanation-details')).toBeHidden();
  await page.locator('#btn-explain').click();
  await expect(page.locator('#explanation-details')).toBeVisible();
  await expect(page.locator('#explanation-text')).toHaveText(current.explicacion);
  await page.locator('#btn-explain').click();
  await expect(page.locator('#explanation-details')).toBeHidden();
  await expect(page.locator('#verdict-tag')).toContainText(current.respuesta ? 'VERDADERA' : 'FALSA');
  await expect(page.locator('#btn-true')).toBeDisabled();
  await expect(page.locator('#btn-false')).toBeDisabled();
  await page.locator(current.respuesta ? '#btn-false' : '#btn-true').evaluate(el => el.click());
  await expect(page.locator('#stat-correct')).toHaveText('1');
  await expect(page.locator('#stat-wrong')).toHaveText('0');

  await page.locator('#btn-next').click();
  await expect(page.locator('#card-index-badge')).toHaveText(`Pregunta 2 de ${questions.length}`);
  await expect(page.locator('#explanation-card')).toBeHidden();
});

test('tracks a failed answer, resumes after refresh, reviews it, and clears it when corrected', async ({ page }) => {
  await loadSequential(page);
  const shown = await page.locator('#statement-text').textContent();
  const current = questions.find(q => q.pregunta === shown);
  await page.locator(current.respuesta ? '#btn-false' : '#btn-true').click();
  await expect(page.locator('#stat-wrong')).toHaveText('1');
  await expect(page.locator('#failed-count-badge')).toHaveText('1');

  await page.reload();
  await expect(page.locator('#stat-wrong')).toHaveText('1');
  await expect(page.locator('#failed-count-badge')).toHaveText('1');
  await expect(page.locator('#review-mode-btn')).toBeEnabled();
  await page.locator('#review-mode-btn').click();
  await expect(page.locator('#card-index-badge')).toHaveText('Pregunta 1 de 1');
  await expect(page.locator('#statement-text')).toHaveText(current.pregunta);
  await page.locator('#shuffle-toggle').click();
  await expect(page.locator('#card-index-badge')).toHaveText('Pregunta 1 de 1');
  await expect(page.locator('#statement-text')).toHaveText(current.pregunta);

  await answerFor(page, current);
  await expect(page.locator('#explanation-card')).toBeVisible();
  await page.locator('#btn-next').click();
  await expect(page.locator('#completion-card')).toBeVisible();
  await expect(page.locator('#c-correct')).toHaveText('1');
  await expect(page.locator('#c-wrong')).toHaveText('0');
  await expect(page.locator('#failed-count-badge')).toHaveText('0');
  await expect(page.locator('#review-mode-btn')).toBeDisabled();
});

test('reset asks for confirmation and applies or cancels without ambiguity', async ({ page }) => {
  await loadSequential(page);
  const shown = await page.locator('#statement-text').textContent();
  const current = questions.find(q => q.pregunta === shown);
  await page.locator(current.respuesta ? '#btn-false' : '#btn-true').click();
  await expect(page.locator('#stat-wrong')).toHaveText('1');

  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#reset-btn').click();
  await expect(page.locator('#stat-wrong')).toHaveText('1');
  await expect(page.locator('#failed-count-badge')).toHaveText('1');

  page.once('dialog', dialog => dialog.accept());
  await page.locator('#reset-btn').click();
  await expect(page.locator('#stat-correct')).toHaveText('0');
  await expect(page.locator('#stat-wrong')).toHaveText('0');
  await expect(page.locator('#failed-count-badge')).toHaveText('0');
});

test('shuffle control, review and completion actions work', async ({ page }) => {
  await loadSequential(page);
  await expect(page.locator('#shuffle-toggle')).not.toHaveClass(/active/);
  await page.locator('#shuffle-toggle').click();
  await expect(page.locator('#shuffle-toggle')).toHaveClass(/active/);
  await page.locator('#shuffle-toggle').click();

  const topic = ['tema1', 'tema2', 'tema3'].sort((a, b) => questions.filter(q => q.tema === a).length - questions.filter(q => q.tema === b).length)[0];
  const subset = questions.filter(q => q.tema === topic);
  await page.locator(`.filter-pill[data-topic="${topic}"]`).click();
  for (const q of subset) {
    const visible = await page.locator('#statement-text').textContent();
    const active = questions.find(item => item.pregunta === visible);
    expect(active).toBeTruthy();
    await page.locator(active.respuesta ? '#btn-true' : '#btn-false').click();
    await page.locator('#btn-next').click();
  }
  await expect(page.locator('#completion-card')).toBeVisible();
  await expect(page.locator('#c-correct')).toHaveText(String(subset.length));
  await page.locator('#c-retry-all-btn').click();
  await expect(page.locator('#card-index-badge')).toHaveText(`Pregunta 1 de ${subset.length}`);
});

test('keyboard answer and next shortcuts respond once', async ({ page }) => {
  await loadSequential(page);
  const shown = await page.locator('#statement-text').textContent();
  const q = questions.find(item => item.pregunta === shown);
  expect(q).toBeTruthy();
  await page.keyboard.press(q.respuesta ? 'v' : 'f');
  await expect(page.locator('#explanation-card')).toBeVisible();
  await expect(page.locator('#explanation-details')).toBeHidden();
  await expect(page.locator('#stat-correct')).toHaveText('1');
  await page.keyboard.press('e');
  await expect(page.locator('#explanation-details')).toBeVisible();
  await expect(page.locator('#explanation-heading')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('#card-index-badge')).toHaveText(`Pregunta 2 de ${questions.length}`);
});

test('topic tabs support arrow, Home and End keys', async ({ page }) => {
  await loadSequential(page);
  const topicOneCount = questions.filter(question => question.tema === 'tema1').length;
  const tabs = page.locator('.filter-pill');
  await tabs.nth(0).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#card-index-badge')).toHaveText(`Pregunta 1 de ${topicOneCount}`);

  await page.keyboard.press('End');
  await expect(tabs.nth(3)).toBeFocused();
  await expect(tabs.nth(3)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(tabs.nth(0)).toBeFocused();
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
});

test('theme toggles and persists across reload', async ({ page, browserName }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('ajudatsm-theme', 'dark'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.screenshot({ path: artifactPath(browserName, 'desktop-light.png') });
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: artifactPath(browserName, 'desktop-dark.png') });
});

test('layout has no horizontal overflow at requested viewport sizes and landscape', async ({ page, browserName }) => {
  const sizes = [320, 375, 390, 768, 1440];
  for (const width of sizes) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./');
    await page.locator('#question-format').selectOption('vf');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('#question-format').selectOption('vf');
    await page.evaluate(() => localStorage.setItem('ajudatsm-theme', 'dark'));
    await page.reload();
    await expect(page.locator('#card-index-badge')).toBeVisible();
    await expect(page.locator('#statement-text')).not.toContainText('Carregant');
    const metrics = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    expect(metrics.document, `horizontal overflow at ${width}px: ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(width);
    expect(metrics.body, `body overflow at ${width}px: ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(width);
    if (width <= 390) {
      const shown = await page.locator('#statement-text').textContent();
      const item = questions.find(q => q.pregunta === shown);
      expect(item).toBeTruthy();
      await page.locator(item.respuesta ? '#btn-true' : '#btn-false').click();
      const answered = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
      expect(answered.document, `answer content overflow at ${width}px: ${JSON.stringify(answered)}`).toBeLessThanOrEqual(width);
      expect(answered.body, `answer body overflow at ${width}px: ${JSON.stringify(answered)}`).toBeLessThanOrEqual(width);
      if (width === 320) await page.screenshot({ path: artifactPath(browserName, 'answered-mobile-320.png') });
      if (width === 390) {
        await expect(page.locator('#explanation-header')).toBeFocused();
        await expect(page.locator('#explanation-details')).toBeHidden();
        await page.locator('#btn-explain').click();
        await page.locator('#explanation-heading').scrollIntoViewIfNeeded();
        await expect(page.locator('#explanation-heading')).toBeVisible();
        await expect(page.locator('#explanation-heading')).toBeFocused();
        const visibleArea = await page.evaluate(() => {
          const heading = document.getElementById('explanation-heading').getBoundingClientRect();
          const header = document.querySelector('.app-header').getBoundingClientRect();
          const skip = document.querySelector('.skip-link');
          return {
            headingTop: heading.top,
            headerBottom: header.bottom,
            viewportHeight: innerHeight,
            focusedId: document.activeElement.id,
            skipFocused: document.activeElement === skip,
            skipBottom: skip.getBoundingClientRect().bottom
          };
        });
        expect(visibleArea.headingTop).toBeGreaterThanOrEqual(visibleArea.headerBottom);
        expect(visibleArea.headingTop).toBeLessThan(visibleArea.viewportHeight);
        expect(visibleArea.focusedId).toBe('explanation-heading');
        expect(visibleArea.skipFocused).toBe(false);
        expect(visibleArea.skipBottom).toBeLessThanOrEqual(0);
        await page.screenshot({ path: artifactPath(browserName, 'answered-mobile-390-dark.png') });
        await page.locator('#theme-toggle').evaluate(el => el.click());
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
        await expect(page.locator('#explanation-heading')).toBeFocused();
        await page.screenshot({ path: artifactPath(browserName, 'answered-mobile-390-light.png') });
      }
    }
    if (width === 320 || width === 390 || width === 1440) {
      await page.screenshot({ path: artifactPath(browserName, `layout-${width}.png`) });
    }
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('./');
  await page.locator('#question-format').selectOption('vf');
  const landscape = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  expect(landscape.document, `horizontal overflow in landscape: ${JSON.stringify(landscape)}`).toBeLessThanOrEqual(landscape.viewport);
});

test('no uncaught page errors and axe accessibility smoke check', async ({ page, browserName }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await expect(page.locator('#card-index-badge')).toBeVisible();
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const scans = {};
  for (const theme of ['light', 'dark']) {
    await page.locator('#theme-toggle').evaluate((el, target) => {
      if (document.documentElement.dataset.theme !== target) el.click();
    }, theme);
    const results = await page.evaluate(async () => await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
    scans[theme] = {
      violations: results.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.map(node => ({
          target: node.target,
          html: node.html,
          failureSummary: node.failureSummary,
          contrast: node.any.map(check => check.data).filter(Boolean)
        }))
      })),
      passes: results.passes.length,
      incomplete: results.incomplete.length
    };
  }
  require('node:fs').writeFileSync(artifactPath(browserName, 'axe-results.json'), JSON.stringify(scans, null, 2));
  expect(errors).toEqual([]);
  const serious = Object.values(scans).flatMap(scan => scan.violations.filter(v => v.impact === 'critical' || v.impact === 'serious'));
  expect(serious, 'critical and serious axe findings are recorded in axe-results.json').toEqual([]);
});

test('loads from the service-worker cache after the network is disconnected', async ({ page, context, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await page.locator('#question-format').selectOption('multiple');
  await expect(page.locator('#card-index-badge')).toBeVisible();
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('Service workers unavailable');
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#question-format')).toHaveValue('multiple');
  await expect(page.locator('#card-index-badge')).toBeVisible();
  await expect(page.locator('#multiple-actions')).toBeVisible();
  await expect(page.locator('#statement-text')).not.toContainText('Carregant');
  await page.screenshot({ path: artifactPath(browserName, 'offline-mobile.png') });
});
