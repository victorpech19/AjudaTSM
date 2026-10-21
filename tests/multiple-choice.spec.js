const { test, expect } = require('@playwright/test');
const { readFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');
const allQuestions = JSON.parse(readFileSync(require.resolve('../preguntas.json'), 'utf8'));
const multipleQuestions = allQuestions.filter(q => q.tipo === 'multiple');
const fiveChoiceQuestions = multipleQuestions.filter(q => q.opciones.length >= 5);

const vfQuestions = allQuestions.filter(q => q.tipo !== 'multiple');
const topics = ['todos', 'tema1', 'tema2', 'tema3'];
const artifactDir = process.env.AJUDATSM_QA_ARTIFACT_DIR || path.join(__dirname, '..', 'test-artifacts');

function screenshotPath(browserName, filename) {
  const browserDir = path.join(artifactDir, browserName);
  mkdirSync(browserDir, { recursive: true });
  return path.join(browserDir, filename);
}

test.use({ serviceWorkers: 'block' });

async function readyMultiple(page) {
  await page.goto('./');
  await expect(page.locator('#question-format')).toBeVisible();
  await expect(page.locator('#question-format')).toBeEnabled();
  await expect(page.locator('#card-index-badge')).toBeVisible();
  await expect(page.locator('#question-format')).toHaveValue('todos');
  await page.locator('#question-format').selectOption('multiple');
  await expect(page.locator('#card-index-badge')).toHaveText(`Pregunta 1 de ${multipleQuestions.length}`);
  if (await page.locator('#shuffle-toggle').evaluate(el => el.classList.contains('active'))) {
    await page.locator('#shuffle-toggle').click();
  }
}

function byStatement(statement) {
  return multipleQuestions.find(q => q.pregunta === statement);
}

test('starts in mixed mode and intersects format with every topic', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#question-format')).toBeEnabled();
  await expect(page.locator('#question-format')).toHaveValue('todos');
  await expect(page.locator('#card-index-badge')).toHaveText(`Pregunta 1 de ${vfQuestions.length + multipleQuestions.length}`);

  for (const format of ['vf', 'multiple']) {
    await page.locator('#question-format').selectOption(format);
    const bank = format === 'vf' ? vfQuestions : multipleQuestions;
    for (const topic of topics) {
      await page.locator(`.filter-pill[data-topic="${topic}"]`).click();
      const subset = topic === 'todos' ? bank : bank.filter(q => q.tema === topic);
      await expect(page.locator('#card-index-badge')).toHaveText(`Pregunta 1 de ${subset.length}`);
      await expect(page.locator(`.filter-pill[data-topic="${topic}"]`)).toHaveAttribute('aria-selected', 'true');
    }
  }
});

test('correct and incorrect answers immediately show theory and every option explanation', async ({ page }) => {
  await readyMultiple(page);
  const first = byStatement(await page.locator('#statement-text').textContent());
  expect(first).toBeTruthy();

  await page.locator(`.btn-option[data-choice="${first.respuesta}"]`).click();
  await expect(page.locator('#explanation-card')).toBeVisible();
  await expect(page.locator('#result-badge')).toHaveClass(/badge-success/);
  await expect(page.locator('#explanation-text')).toHaveText(first.explicacion);
  await expectOptionExplanations(page, first);
  await expect(page.locator(`.btn-option[data-choice="${first.respuesta}"]`)).toHaveClass(/state-correct/);
  await expect(page.locator('#multiple-actions .btn-option')).toHaveCount(first.opciones.length);
  await expect(page.locator('#multiple-actions .btn-option:disabled')).toHaveCount(first.opciones.length);

  await page.locator('#btn-next').click();
  const second = byStatement(await page.locator('#statement-text').textContent());
  expect(second).toBeTruthy();
  const wrongChoice = second.respuesta === 0 ? 1 : 0;
  await page.locator(`.btn-option[data-choice="${wrongChoice}"]`).click();
  await expect(page.locator('#result-badge')).toHaveClass(/badge-error/);
  await expect(page.locator('#explanation-text')).toHaveText(second.explicacion);
  await expectOptionExplanations(page, second);
  await expect(page.locator(`.btn-option[data-choice="${second.respuesta}"]`)).toHaveClass(/state-correct/);
  await expect(page.locator(`.btn-option[data-choice="${wrongChoice}"]`)).toHaveClass(/state-wrong-chosen/);
  await expect(page.locator('#stat-correct')).toHaveText('1');
  await expect(page.locator('#stat-wrong')).toHaveText('1');
});

async function expectOptionExplanations(page, question) {
  const options = page.locator('#option-explanations > li');
  await expect(options).toHaveCount(question.opciones.length);
  for (let i = 0; i < question.opciones.length; i++) await expect(options.nth(i)).toContainText(question.explicacionesOpciones[i]);
  if (question.trampa) await expect(page.locator('#trampa-text')).toContainText(question.trampa);
  else await expect(page.locator('#trampa-text')).toBeHidden();
  if (question.fuente) await expect(page.locator('#source-text')).toContainText(question.fuente);
  else await expect(page.locator('#source-text')).toBeHidden();
  if (question.baseRespuesta) await expect(page.locator('#answer-basis-text')).toContainText(question.baseRespuesta);
  else await expect(page.locator('#answer-basis-text')).toBeHidden();
}

test('A-D and 1-4 shortcuts choose the matching option', async ({ page }) => {
  await readyMultiple(page);
  for (const [index, key] of ['1', '2', '3', '4', 'a', 'b', 'c', 'd'].entries()) {
    const current = byStatement(await page.locator('#statement-text').textContent());
    expect(current).toBeTruthy();
    await page.keyboard.press(key);
    await expect(page.locator('#explanation-card')).toBeVisible();
    await expect(page.locator(`.btn-option[data-choice="${index % 4}"]`)).toHaveClass(
      current.respuesta === index % 4 ? /state-correct/ : /state-wrong-chosen/
    );
    if (index < 7) await page.keyboard.press('Space');
  }
});

test('E and 5 shortcuts handle a correct and an incorrect fifth option', async ({ page }) => {
  const correctE = fiveChoiceQuestions.find(q => q.respuesta === 4);
  const wrongE = fiveChoiceQuestions.find(q => q.respuesta !== 4);
  test.skip(!correctE || !wrongE, 'The bank needs five-choice questions with E both correct and incorrect');

  async function reach(target) {
    await readyMultiple(page);
    await page.evaluate(({ bank, target }) => {
      for (const question of bank) {
        if (question.pregunta === target.pregunta) return;
        if (document.getElementById('statement-text').textContent !== question.pregunta) throw new Error('Queue mismatch');
        document.querySelector(`.btn-option[data-choice="${question.respuesta}"]`).click();
        document.getElementById('btn-next').click();
      }
      throw new Error('Five-choice target not found');
    }, { bank: multipleQuestions, target });
  }

  await page.goto('./');
  await reach(correctE);
  await page.keyboard.press('e');
  await expect(page.locator('#result-badge')).toHaveClass(/badge-success/);
  await expect(page.locator('#multiple-actions .btn-option')).toHaveCount(correctE.opciones.length);
  await expectOptionExplanations(page, correctE);

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await reach(wrongE);
  await page.keyboard.press('5');
  await expect(page.locator('#result-badge')).toHaveClass(/badge-error/);
  await expect(page.locator('.btn-option[data-choice="4"]')).toHaveClass(/state-wrong-chosen/);
  await expectOptionExplanations(page, wrongE);
});

test('source figures render with their accessible alternative text', async ({ page }) => {
  const withFigure = multipleQuestions.find(q => q.imagen);
  test.skip(!withFigure, 'No figure-referenced question in this bank snapshot');
  await page.goto('./');
  await page.locator('#question-format').selectOption('multiple');
  if (await page.locator('#shuffle-toggle').evaluate(el => el.classList.contains('active'))) {
    await page.locator('#shuffle-toggle').click();
  }
  await page.evaluate(({ bank, target }) => {
    for (const question of bank) {
      if (question.pregunta === target.pregunta) return;
      if (document.getElementById('statement-text').textContent !== question.pregunta) throw new Error('Queue mismatch');
      document.querySelector(`.btn-option[data-choice="${question.respuesta}"]`).click();
      document.getElementById('btn-next').click();
    }
    throw new Error('Question with source figure not found');
  }, { bank: multipleQuestions, target: withFigure });
  await expect(page.locator('#question-image')).toHaveAttribute('alt', withFigure.imagen.alt);
  await expect.poll(() => page.locator('#question-image').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(page.locator('#question-image')).toBeVisible();
});

test('review queue is scoped to the selected format and topic and survives refresh', async ({ page }) => {
  await readyMultiple(page);
  await page.locator('[data-topic="tema1"]').click();
  const failed = byStatement(await page.locator('#statement-text').textContent());
  expect(failed).toBeTruthy();
  expect(failed.tema).toBe('tema1');
  const wrongChoice = failed.respuesta === 0 ? 1 : 0;
  await page.locator(`.btn-option[data-choice="${wrongChoice}"]`).click();
  await expect(page.locator('#failed-count-badge')).toHaveText('1');
  await page.reload();
  await expect(page.locator('#question-format')).toHaveValue('multiple');
  await expect(page.locator('[data-topic="tema1"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#failed-count-badge')).toHaveText('1');

  await page.locator('#question-format').selectOption('vf');
  await expect(page.locator('#review-mode-btn')).toBeDisabled();
  await page.locator('#question-format').selectOption('multiple');
  await page.locator('[data-topic="tema2"]').click();
  await expect(page.locator('#review-mode-btn')).toBeDisabled();
  await page.locator('[data-topic="tema1"]').click();
  await expect(page.locator('#review-mode-btn')).toBeEnabled();
  await page.locator('#review-mode-btn').click();
  await expect(page.locator('#card-index-badge')).toHaveText('Pregunta 1 de 1');
  await expect(page.locator('#statement-text')).toHaveText(failed.pregunta);
  await expect(page.locator('#card-format-badge')).toContainText(/múltiple|multiple/i);

  await page.locator(`.btn-option[data-choice="${failed.respuesta}"]`).click();
  await page.locator('#btn-next').click();
  await expect(page.locator('#completion-card')).toBeVisible();
  await expect(page.locator('#failed-count-badge')).toHaveText('0');
});

test('all MC questions show exact explanations and verdicts for each available choice', async ({ page }) => {
  test.setTimeout(60_000);
  await readyMultiple(page);
  const reviewed = await page.evaluate(bank => {
    const get = id => document.getElementById(id);
    let count = 0;
    const maxChoiceCount = Math.max(...bank.map(q => q.opciones.length));
    for (let choice = 0; choice < maxChoiceCount; choice++) {
      document.querySelector('[data-topic="todos"]').click();
      for (const q of bank) {
        if (get('statement-text').textContent !== q.pregunta) throw new Error('Sequence mismatch: ' + q.id);
        const selectedChoice = choice < q.opciones.length ? choice : q.respuesta;
        get('multiple-actions').querySelector(`[data-choice="${selectedChoice}"]`).click();
        if (get('explanation-card').hidden) throw new Error('Explanation hidden: ' + q.id);
        if (get('explanation-text').textContent !== q.explicacion) throw new Error('Wrong theory: ' + q.id);
        const explanations = [...get('option-explanations').children].map(el => el.textContent);
        if (explanations.length !== q.opciones.length || q.explicacionesOpciones.some(text => !explanations.some(row => row.includes(text)))) {
          throw new Error('Missing option explanation: ' + q.id);
        }
        if (get('trampa-text').textContent !== (q.trampa || '') || get('trampa-text').hidden === !!q.trampa) throw new Error('Wrong trap: ' + q.id);
        if (get('source-text').textContent !== (q.fuente || '') || get('source-text').hidden === !!q.fuente) throw new Error('Wrong source: ' + q.id);
        const success = selectedChoice === q.respuesta;
        if (get('result-badge').classList.contains('badge-success') !== success) throw new Error('Wrong verdict: ' + q.id);
        const buttons = [...get('multiple-actions').querySelectorAll('.btn-option')];
        if (buttons.length !== q.opciones.length || buttons.some(button => !button.disabled)) throw new Error('Unlocked option: ' + q.id);
        if (!buttons[q.respuesta].classList.contains('state-correct')) throw new Error('Correct option not marked: ' + q.id);
        if (!success && !buttons[selectedChoice].classList.contains('state-wrong-chosen')) throw new Error('Chosen wrong option not marked: ' + q.id);
        get('btn-next').click();
        if (choice < q.opciones.length) count++;
      }
      if (get('completion-card').hidden || get('progress-bar').style.width !== '100%') throw new Error('Incomplete MC round');
    }
    return count;
  }, multipleQuestions);
  expect(reviewed).toBe(multipleQuestions.reduce((sum, q) => sum + q.opciones.length, 0));
  await page.reload();
  await expect(page.locator('#completion-card')).toBeVisible();
  await expect(page.locator('#question-format')).toHaveValue('multiple');
});

test('MC layout fits narrow screens in both themes', async ({ page, browserName }) => {
  const longest = multipleQuestions.reduce((best, question) => {
    const length = question.opciones.reduce((sum, option) => sum + option.length, 0);
    const bestLength = best.opciones.reduce((sum, option) => sum + option.length, 0);
    return length > bestLength ? question : best;
  }, multipleQuestions[0]);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('./');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await readyMultiple(page);
    await page.evaluate(({ bank, target }) => {
      for (let attempts = 0; attempts < bank.length; attempts++) {
        const current = document.getElementById('statement-text').textContent;
        if (current === target) return;
        const question = bank.find(item => item.pregunta === current);
        if (!question) throw new Error('Unknown MC question while locating long options');
        document.querySelector(`.btn-option[data-choice="${question.respuesta}"]`).click();
        document.getElementById('btn-next').click();
      }
      throw new Error('Could not reach question with longest options');
    }, { bank: multipleQuestions, target: longest.pregunta });
    await expect(page.locator('#multiple-actions .btn-option')).toHaveCount(longest.opciones.length);
    const before = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(before, `MC layout overflow at ${width}px`).toBeLessThanOrEqual(width);
    const active = longest;
    await page.locator(`.btn-option[data-choice="${active.respuesta}"]`).click();
    const after = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(after, `MC explanation overflow at ${width}px`).toBeLessThanOrEqual(width);
    await expect(page.locator('#explanation-heading')).toBeFocused();
    await page.locator('#theme-toggle').evaluate(el => {
      if (document.documentElement.dataset.theme !== 'dark') el.click();
    });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const dark = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(dark, `dark MC explanation overflow at ${width}px`).toBeLessThanOrEqual(width);
    if (width === 390) await page.screenshot({ path: screenshotPath(browserName, 'mc-answered-390-dark.png') });
    await page.locator('#theme-toggle').evaluate(el => el.click());
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const light = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(light, `light MC explanation overflow at ${width}px`).toBeLessThanOrEqual(width);
    if (width === 390) {
      await page.screenshot({ path: screenshotPath(browserName, 'mc-answered-390-light.png') });
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
      })).violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })));
      expect(violations, 'axe WCAG violations in answered 390px MC mode').toEqual([]);
    }
  }
});

test('a malformed multiple-choice bank is rejected without enabling options', async ({ page }) => {
  const malformedBank = [...allQuestions, {
    id: 999999,
    tipo: 'multiple',
    tema: 'tema1',
    temaNombre: 'Tema 1',
    pregunta: 'Pregunta de formato incorrecto',
    opciones: ['Falta una opción'],
    respuesta: 0,
    explicacionesOpciones: ['Explicación insuficiente'],
    explicacion: 'Explicación general',
    trampa: 'Trampa',
    fuente: 'Fuente'
  }];
  await page.route('**/preguntas.json', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(malformedBank)
  }));
  await page.goto('./');
  await expect(page.locator('#retry-load-btn')).toBeVisible();
  await expect(page.locator('#multiple-actions .btn-option')).toHaveCount(0);
});

test('more than six choices are rejected instead of silently truncating them', async ({ page }) => {
  const options = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const malformedBank = [...allQuestions, {
    id: 'too-many-options',
    tipo: 'multiple',
    tema: 'tema1',
    temaNombre: 'Tema 1',
    pregunta: 'Pregunta con siete opciones',
    opciones: options,
    respuesta: 6,
    explicacionesOpciones: options.map(option => 'Explicación ' + option),
    explicacion: 'Explicación general'
  }];
  await page.route('**/preguntas.json', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(malformedBank)
  }));
  await page.goto('./');
  await expect(page.locator('#retry-load-btn')).toBeVisible();
  await expect(page.locator('#multiple-actions .btn-option')).toHaveCount(0);
});

test('legacy VF session keeps its answer and stats while appending MC in the saved topic', async ({ page }) => {
  const oldQueue = vfQuestions.filter(q => Number(q.id) >= 26 && Number(q.id) <= 50);
  expect(oldQueue).toHaveLength(25);
  const migratedTopic = oldQueue[0].tema;
  expect(migratedTopic).toBe('tema1');
  const oldQuestion = oldQueue[2];
  await page.addInitScript(({ question, queueIds }) => localStorage.setItem('ajudatsm-state-v2', JSON.stringify({
    version: 2,
    currentTopic: 'tema2',
    isShuffle: false,
    isReviewMode: false,
    queueIds,
    currentIndex: 2,
    answered: true,
    lastChoice: !question.respuesta,
    correct: 2,
    wrong: 1,
    streak: 0,
    maxStreak: 2,
    failedIds: [String(question.id)]
  })), { question: oldQuestion, queueIds: oldQueue.map(q => String(q.id)) });
  await page.goto('./');
  await expect(page.locator('#question-format')).toHaveValue('todos');
  await expect(page.locator(`[data-topic="${migratedTopic}"]`)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#card-index-badge')).toHaveText(`Pregunta 3 de ${oldQueue.length + multipleQuestions.filter(q => q.tema === migratedTopic).length}`);
  await expect(page.locator('#statement-text')).toHaveText(oldQuestion.pregunta);
  await expect(page.locator('#stat-correct')).toHaveText('2');
  await expect(page.locator('#stat-wrong')).toHaveText('1');
  await expect(page.locator('#explanation-card')).toBeVisible();
  await expect(page.locator('#btn-true')).toBeDisabled();
  await expect(page.locator('#btn-false')).toBeDisabled();
  await expect(page.locator('#failed-count-badge')).toHaveText('1');
  await page.locator('#btn-next').click();
  await expect(page.locator('#card-index-badge')).toHaveText(`Pregunta 4 de ${oldQueue.length + multipleQuestions.filter(q => q.tema === migratedTopic).length}`);
  await page.evaluate(tail => {
    for (const question of tail) {
      if (document.getElementById('statement-text').textContent !== question.pregunta) throw new Error('Legacy VF queue changed');
      document.getElementById(question.respuesta ? 'btn-true' : 'btn-false').click();
      document.getElementById('btn-next').click();
    }
  }, oldQueue.slice(3));
  await expect(page.locator('#card-index-badge')).toHaveText(`Pregunta ${oldQueue.length + 1} de ${oldQueue.length + multipleQuestions.filter(q => q.tema === migratedTopic).length}`);
  const appended = byStatement(await page.locator('#statement-text').textContent());
  expect(appended).toBeTruthy();
  expect(appended.tema).toBe(migratedTopic);
});

test('completed legacy VF queue resumes at the first appended MC', async ({ page }) => {
  const oldQueue = vfQuestions.filter(q => Number(q.id) >= 26 && Number(q.id) <= 50);
  expect(oldQueue).toHaveLength(25);
  const migratedTopic = oldQueue[0].tema;
  expect(migratedTopic).toBe('tema1');
  const oldQuestion = oldQueue.at(-1);
  await page.addInitScript(({ question, queueIds }) => localStorage.setItem('ajudatsm-state-v2', JSON.stringify({
    version: 2,
    currentTopic: 'tema2',
    isShuffle: false,
    isReviewMode: false,
    queueIds,
    currentIndex: queueIds.length,
    answered: false,
    lastChoice: null,
    correct: 8,
    wrong: 5,
    streak: 1,
    maxStreak: 3,
    failedIds: [String(question.id)]
  })), { question: oldQuestion, queueIds: oldQueue.map(q => String(q.id)) });
  await page.goto('./');
  await expect(page.locator('#card-index-badge')).toHaveText(`Pregunta ${oldQueue.length + 1} de ${oldQueue.length + multipleQuestions.filter(q => q.tema === migratedTopic).length}`);
  const resumed = byStatement(await page.locator('#statement-text').textContent());
  expect(resumed).toBeTruthy();
  expect(resumed.tema).toBe(migratedTopic);
  await expect(page.locator('#stat-correct')).toHaveText('8');
  await expect(page.locator('#stat-wrong')).toHaveText('5');
});
