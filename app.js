/**
 * AjudaTSM — Eina d'estudi interactiva de Tecnologia i Selecció de Materials
 * ETSEIB · UPC
 *
 * Lògica de l'aplicació, gestió d'estat, filtre per temes i mode repàs.
 */

(function () {
  'use strict';
  const STORAGE_KEY = 'ajudatsm-state-v2';
  const LEGACY_THEME_KEY = 'ajudatsm-theme';
  const VALID_TOPICS = new Set(['todos', 'tema1', 'tema2', 'tema3']);
  const VALID_FORMATS = new Set(['todos', 'vf', 'multiple']);
  let isLoading = false;
  let questionsReady = false;

  const state = {
    allQuestions: [], questionsById: new Map(), activeQueue: [], currentIndex: 0,
    currentTopic: 'todos', currentFormat: 'todos', isShuffle: true, isReviewMode: false, answered: false,
    lastChoice: null, stats: createEmptyStats()
  };

  const dom = {
    html: document.documentElement,
    themeToggle: document.getElementById('theme-toggle'),
    topicFilters: document.getElementById('topic-filters'),
    questionFormat: document.getElementById('question-format'),
    shuffleToggle: document.getElementById('shuffle-toggle'),
    reviewModeBtn: document.getElementById('review-mode-btn'),
    failedCountBadge: document.getElementById('failed-count-badge'),
    resetBtn: document.getElementById('reset-btn'),
    countTodos: document.getElementById('count-todos'),
    countTema1: document.getElementById('count-tema1'),
    countTema2: document.getElementById('count-tema2'),
    countTema3: document.getElementById('count-tema3'),
    statCorrect: document.getElementById('stat-correct'),
    statWrong: document.getElementById('stat-wrong'),
    statStreak: document.getElementById('stat-streak'),
    statAccuracy: document.getElementById('stat-accuracy'),
    progressText: document.getElementById('progress-text'),
    progressBar: document.getElementById('progress-bar'),
    quizCard: document.getElementById('quiz-card'),
    cardTopicBadge: document.getElementById('card-topic-badge'),
    cardFormatBadge: document.getElementById('card-format-badge'),
    cardIndexBadge: document.getElementById('card-index-badge'),
    statementText: document.getElementById('statement-text'),
    btnTrue: document.getElementById('btn-true'),
    btnFalse: document.getElementById('btn-false'),
    vfActions: document.getElementById('vf-actions'),
    multipleActions: document.getElementById('multiple-actions'),
    explanationCard: document.getElementById('explanation-card'),
    explanationHeading: document.getElementById('explanation-heading') || document.querySelector('.explanation-heading'),
    resultBadge: document.getElementById('result-badge'),
    resultIcon: document.getElementById('result-icon'),
    resultTitle: document.getElementById('result-title'),
    verdictTag: document.getElementById('verdict-tag'),
    explanationText: document.getElementById('explanation-text'),
    optionExplanations: document.getElementById('option-explanations'),
    explanationTags: document.getElementById('explanation-tags'),
    trampaText: document.getElementById('trampa-text'),
    sourceText: document.getElementById('source-text'),
    btnNext: document.getElementById('btn-next'),
    completionCard: document.getElementById('completion-card'),
    completionTitle: document.getElementById('completion-title'),
    completionMessage: document.getElementById('completion-message'),
    cCorrect: document.getElementById('c-correct'),
    cWrong: document.getElementById('c-wrong'),
    cAccuracy: document.getElementById('c-accuracy'),
    cStreak: document.getElementById('c-streak'),
    cRetryAllBtn: document.getElementById('c-retry-all-btn'),
    cRetryFailedBtn: document.getElementById('c-retry-failed-btn'),
    cFailedCount: document.getElementById('c-failed-count'),
    cAllTopicsBtn: document.getElementById('c-all-topics-btn')
  };

  function createEmptyStats() {
    return { correct: 0, wrong: 0, streak: 0, maxStreak: 0, failedIds: new Set() };
  }

  function storageGet(key) {
    try { return window.localStorage.getItem(key); }
    catch (error) { reportStorageFailure('read', error); return null; }
  }

  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); return true; }
    catch (error) { reportStorageFailure('write', error); return false; }
  }

  function storageRemove(key) {
    try { window.localStorage.removeItem(key); }
    catch (error) { reportStorageFailure('remove', error); }
  }

  function reportStorageFailure(operation, error) {
    console.warn('El almacenamiento local no está disponible.', error);
    const status = document.getElementById('connection-status');
    if (status) status.textContent = 'No es pot desar el progrés en aquest navegador';
    window.dispatchEvent(new CustomEvent('ajudatsm:storage-unavailable', {
      detail: { operation, message: error && error.message ? error.message : 'Storage unavailable' }
    }));
  }

  function initTheme() {
    const savedTheme = storageGet(LEGACY_THEME_KEY);
    const theme = savedTheme === 'dark' || savedTheme === 'light' ? savedTheme :
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    dom.html.setAttribute('data-theme', theme);
    if (!dom.themeToggle) return;
    dom.themeToggle.addEventListener('click', () => {
      const nextTheme = dom.html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      dom.html.setAttribute('data-theme', nextTheme);
      storageSet(LEGACY_THEME_KEY, nextTheme);
    });
  }

  async function init() {
    initTheme();
    setupEventListeners();
    await loadQuestions();
  }

  async function loadQuestions() {
    if (isLoading) return;
    isLoading = true;
    setQuizControlsDisabled(true);
    setLoadingMessage('Carregant preguntes…');
    try {
      const response = await fetch('preguntas.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('El servidor ha respost ' + response.status + '.');
      const data = await response.json();
      const validation = validateQuestionBank(data);
      if (!validation.ok) throw new Error(validation.message);
      questionsReady = true;
      isLoading = false;
      const retryButton = document.getElementById('retry-load-btn');
      if (retryButton) retryButton.remove();
      state.allQuestions = data;
      state.questionsById = new Map(data.map(question => [String(question.id), question]));
      restoreSavedState();
      updateFormatControl();
      updateTopicPillCounts();
      setQuizControlsDisabled(false);
      updateStatsUI();
      if (state.activeQueue.length > 0 && state.currentIndex < state.activeQueue.length) {
        const restoredAnswered = state.answered;
        const restoredChoice = state.lastChoice;
        renderCurrentQuestion();
        if (restoredAnswered && restoredChoice !== null) {
          state.answered = true;
          state.lastChoice = restoredChoice;
          const question = state.activeQueue[state.currentIndex];
          paintAnswerFeedback(state.lastChoice, question);
          showExplanationCard(state.lastChoice === question.respuesta, question, true);
          updateProgressUI();
        }
      } else {
        showCompletionScreen(true);
      }
      persistState();
    } catch (error) {
      isLoading = false;
      console.error('No se pudieron cargar las preguntas.', error);
      showLoadError(error);
    }
  }

  function validateQuestionBank(data) {
    if (!Array.isArray(data) || data.length === 0)
      return { ok: false, message: 'El banco de preguntas está vacío o no tiene el formato esperado.' };
    const ids = new Set();
    for (let index = 0; index < data.length; index++) {
      const q = data[index];
      if (!q || typeof q !== 'object' ||
          (typeof q.id !== 'number' && typeof q.id !== 'string') || String(q.id).trim() === '' ||
          !VALID_TOPICS.has(q.tema) || q.tema === 'todos' ||
          (q.tipo !== undefined && q.tipo !== 'vf' && q.tipo !== 'multiple') ||
          typeof q.temaNombre !== 'string' || !q.temaNombre.trim() ||
          typeof q.pregunta !== 'string' || !q.pregunta.trim() ||
          typeof q.explicacion !== 'string' || !q.explicacion.trim())
        return { ok: false, message: 'La pregunta ' + (index + 1) + ' no cumple el formato requerido.' };
      const type = getQuestionType(q);
      if (type === 'vf' && typeof q.respuesta !== 'boolean')
        return { ok: false, message: 'La respuesta de la pregunta VF ' + (index + 1) + ' debe ser booleana.' };
      if (type === 'multiple' && (!Array.isArray(q.opciones) || q.opciones.length !== 4 ||
          q.opciones.some(option => typeof option !== 'string' || !option.trim()) ||
          !Number.isInteger(q.respuesta) || q.respuesta < 0 || q.respuesta > 3 ||
          !Array.isArray(q.explicacionesOpciones) || q.explicacionesOpciones.length !== 4 ||
          q.explicacionesOpciones.some(explanation => typeof explanation !== 'string' || !explanation.trim())))
        return { ok: false, message: 'La pregunta de test ' + (index + 1) + ' necesita cuatro opciones y cuatro explicaciones válidas.' };
      const id = String(q.id);
      if (ids.has(id)) return { ok: false, message: 'Hay identificadores repetidos en el banco (id ' + id + ').' };
      ids.add(id);
    }
    for (const topic of ['tema1', 'tema2', 'tema3']) {
      if (!data.some(question => question.tema === topic))
        return { ok: false, message: 'Falten preguntes per al filtre ' + topic + '.' };
    }
    if (!data.some(question => getQuestionType(question) === 'multiple'))
      return { ok: false, message: 'El banc no conté cap pregunta d’opció múltiple.' };
    return { ok: true };
  }

  function setLoadingMessage(message) {
    if (dom.statementText) dom.statementText.textContent = message;
  }

  function setQuizControlsDisabled(disabled) {
    [dom.btnTrue, dom.btnFalse, dom.shuffleToggle, dom.reviewModeBtn, dom.questionFormat].forEach(button => {
      if (button) button.disabled = disabled || (button === dom.reviewModeBtn && getScopedFailedQuestions().length === 0);
    });
  }

  function showLoadError(error) {
    setQuizControlsDisabled(true);
    if (dom.completionCard) dom.completionCard.hidden = true;
    if (dom.quizCard) dom.quizCard.hidden = false;
    if (dom.explanationCard) dom.explanationCard.hidden = true;
    if (dom.statementText)
      dom.statementText.textContent = "No s'ha pogut carregar preguntas.json. " + error.message + ' Comprova la connexió i torna-ho a provar.';
    let retry = document.getElementById('retry-load-btn');
    if (!retry && dom.statementText && dom.statementText.parentElement) {
      retry = document.createElement('button');
      retry.id = 'retry-load-btn';
      retry.type = 'button';
      retry.className = 'btn-next';
      retry.textContent = 'Tornar a provar';
      dom.statementText.parentElement.appendChild(retry);
      retry.addEventListener('click', loadQuestions);
    }
  }

  function updateTopicPillCounts() {
    const visibleQuestions = state.allQuestions.filter(question => questionMatchesFormat(question));
    const counts = {
      todos: visibleQuestions.length,
      tema1: visibleQuestions.filter(q => q.tema === 'tema1').length,
      tema2: visibleQuestions.filter(q => q.tema === 'tema2').length,
      tema3: visibleQuestions.filter(q => q.tema === 'tema3').length
    };
    if (dom.countTodos) dom.countTodos.textContent = counts.todos;
    if (dom.countTema1) dom.countTema1.textContent = counts.tema1;
    if (dom.countTema2) dom.countTema2.textContent = counts.tema2;
    if (dom.countTema3) dom.countTema3.textContent = counts.tema3;
  }

  function updateFormatControl() {
    if (dom.questionFormat) dom.questionFormat.value = state.currentFormat;
  }

  function applyFormatFilter(format) {
    if (!questionsReady || isLoading) return;
    state.currentFormat = VALID_FORMATS.has(format) ? format : 'todos';
    updateFormatControl();
    updateTopicPillCounts();
    if (state.isReviewMode) startReviewMode();
    else applyTopicFilter(state.currentTopic);
  }

  function restoreSavedState() {
    const raw = storageGet(STORAGE_KEY);
    if (!raw) {
      state.activeQueue = [];
      state.currentIndex = 0;
      state.stats = createEmptyStats();
      applyTopicFilter('todos', false);
      return;
    }
    try {
      const saved = JSON.parse(raw);
      if (!saved || saved.version !== 2) throw new Error('Versión de progreso desconocida.');
      const allIds = new Set(state.allQuestions.map(q => String(q.id)));
      const failed = Array.isArray(saved.failedIds) ? saved.failedIds : [];
      state.stats = {
        correct: nonNegativeInteger(saved.correct),
        wrong: nonNegativeInteger(saved.wrong),
        streak: nonNegativeInteger(saved.streak),
        maxStreak: nonNegativeInteger(saved.maxStreak),
        failedIds: new Set(failed.map(String).filter(id => allIds.has(id)))
      };
      const savedTopic = VALID_TOPICS.has(saved.currentTopic) ? saved.currentTopic : 'todos';
      state.currentTopic = savedTopic;
      state.isShuffle = saved.isShuffle !== false;
      const hasSavedFormat = VALID_FORMATS.has(saved.currentFormat);
      state.currentFormat = hasSavedFormat ? saved.currentFormat : 'todos';
      if (!hasSavedFormat) {
        // Preserve public V/F progress; append the new format after its saved queue.
        state.isReviewMode = saved.isReviewMode === true;
        const legacyIds = Array.isArray(saved.queueIds) ? saved.queueIds.map(String) : [];
        const legacyQueue = legacyIds.map(id => state.questionsById.get(id));
        const legacyQueueIsValid = legacyQueue.length > 0 && legacyQueue.every(question =>
          question && getQuestionType(question) === 'vf');
        if (legacyQueueIsValid) {
          const queuedTopics = new Set(legacyQueue.map(question => question.tema));
          state.currentTopic = queuedTopics.size === 1 ? queuedTopics.values().next().value : 'todos';
          state.activeQueue = legacyQueue;
          if (!state.isReviewMode) {
            let newMultiple = state.allQuestions.filter(question =>
              getQuestionType(question) === 'multiple' &&
              (state.currentTopic === 'todos' || question.tema === state.currentTopic));
            if (state.isShuffle) shuffleArray(newMultiple);
            state.activeQueue.push(...newMultiple);
          }
          state.currentIndex = Math.min(nonNegativeInteger(saved.currentIndex), state.activeQueue.length);
          state.lastChoice = typeof saved.lastChoice === 'boolean' ? saved.lastChoice : null;
          state.answered = saved.answered === true && state.currentIndex < state.activeQueue.length && state.lastChoice !== null;
          if (!state.answered) state.lastChoice = null;
          updateShuffleControl();
          updateTopicFilterUI();
          return;
        }
        state.currentTopic = savedTopic === 'tema2' ? 'tema1' :
          (savedTopic === 'tema3' ? 'todos' : savedTopic);
        if (state.isReviewMode) startReviewMode();
        else applyTopicFilter(state.currentTopic, false);
        return;
      }
      state.isReviewMode = saved.isReviewMode === true;
      const queueIds = Array.isArray(saved.queueIds) ? saved.queueIds.map(String) : [];
      const queueIsValid = queueIds.length > 0 && queueIds.every(id => {
        const question = state.questionsById.get(id);
        return allIds.has(id) && question && questionMatchesScope(question);
      });
      if (!queueIsValid) {
        if (state.isReviewMode) startReviewMode();
        else applyTopicFilter(state.currentTopic, false);
        return;
      }
      state.activeQueue = queueIds.map(id => state.questionsById.get(id));
      state.currentIndex = Math.min(nonNegativeInteger(saved.currentIndex), state.activeQueue.length);
      const currentQuestion = state.activeQueue[state.currentIndex];
      state.lastChoice = isValidChoice(currentQuestion, saved.lastChoice) ? saved.lastChoice : null;
      state.answered = saved.answered === true && state.currentIndex < state.activeQueue.length && state.lastChoice !== null;
      if (!state.answered) state.lastChoice = null;
      updateShuffleControl();
      updateTopicFilterUI();
    } catch (error) {
      console.warn('El progreso guardado no es válido; se inicia una ronda nueva.', error);
      state.stats = createEmptyStats();
      state.isReviewMode = false;
      state.answered = false;
      state.lastChoice = null;
      storageRemove(STORAGE_KEY);
      applyTopicFilter('todos', false);
    }
  }

  function nonNegativeInteger(value) {
    return Number.isInteger(value) && value >= 0 ? value : 0;
  }

  function getQuestionType(question) {
    return question && question.tipo === 'multiple' ? 'multiple' : 'vf';
  }

  function questionMatchesFormat(question, format = state.currentFormat) {
    return format === 'todos' || getQuestionType(question) === format;
  }

  function questionMatchesScope(question) {
    return questionMatchesFormat(question) &&
      (state.currentTopic === 'todos' || question.tema === state.currentTopic);
  }

  function persistState() {
    storageSet(STORAGE_KEY, JSON.stringify({
      version: 2,
      currentTopic: state.currentTopic,
      currentFormat: state.currentFormat,
      isShuffle: state.isShuffle,
      isReviewMode: state.isReviewMode,
      queueIds: state.activeQueue.map(q => String(q.id)),
      currentIndex: state.currentIndex,
      answered: state.answered,
      lastChoice: state.lastChoice,
      correct: state.stats.correct,
      wrong: state.stats.wrong,
      streak: state.stats.streak,
      maxStreak: state.stats.maxStreak,
      failedIds: Array.from(state.stats.failedIds)
    }));
  }

  function applyTopicFilter(topicKey, resetRound = true) {
    if (!questionsReady || isLoading) return;
    if (!VALID_TOPICS.has(topicKey)) topicKey = 'todos';
    state.currentTopic = topicKey;
    state.isReviewMode = false;
    if (resetRound) state.stats = { ...state.stats, correct: 0, wrong: 0, streak: 0, maxStreak: 0 };
    updateTopicFilterUI();
    let pool = state.allQuestions.filter(q => questionMatchesFormat(q) &&
      (topicKey === 'todos' || q.tema === topicKey));
    if (state.isShuffle) shuffleArray(pool);
    state.activeQueue = pool;
    state.currentIndex = 0;
    state.answered = false;
    state.lastChoice = null;
    renderCurrentQuestion();
    updateStatsUI();
    persistState();
  }

  function startReviewMode() {
    if (!questionsReady || isLoading) return;
    const questions = getScopedFailedQuestions();
    state.isReviewMode = true;
    state.stats = { ...state.stats, correct: 0, wrong: 0, streak: 0, maxStreak: 0 };
    if (state.isShuffle) shuffleArray(questions);
    state.activeQueue = questions;
    state.currentIndex = 0;
    state.answered = false;
    state.lastChoice = null;
    updateTopicFilterUI();
    renderCurrentQuestion();
    updateStatsUI();
    if (!questions.length) showCompletionScreen(true);
    persistState();
  }

  function getScopedFailedQuestions() {
    return state.allQuestions.filter(question =>
      state.stats.failedIds.has(String(question.id)) && questionMatchesScope(question));
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function updateTopicFilterUI() {
    document.querySelectorAll('.filter-pill').forEach(pill => {
      const active = !state.isReviewMode && pill.getAttribute('data-topic') === state.currentTopic;
      pill.classList.toggle('active', active);
      pill.setAttribute('aria-selected', active ? 'true' : 'false');
      pill.tabIndex = pill.getAttribute('data-topic') === state.currentTopic ? 0 : -1;
    });
  }

  function renderCurrentQuestion() {
    if (!dom.quizCard || !dom.completionCard) return;
    dom.completionCard.hidden = true;
    dom.quizCard.hidden = false;
    if (!state.activeQueue.length || state.currentIndex >= state.activeQueue.length) {
      showCompletionScreen();
      return;
    }
    state.answered = false;
    state.lastChoice = null;
    const q = state.activeQueue[state.currentIndex];
    const isMultipleChoice = getQuestionType(q) === 'multiple';
    dom.vfActions.hidden = isMultipleChoice;
    dom.multipleActions.hidden = !isMultipleChoice;
    if (isMultipleChoice) renderMultipleOptions(q);
    else dom.multipleActions.replaceChildren();
    dom.btnTrue.disabled = false;
    dom.btnFalse.disabled = false;
    dom.btnTrue.className = 'btn-action btn-true';
    dom.btnFalse.className = 'btn-action btn-false';
    dom.explanationCard.hidden = true;
    dom.optionExplanations.hidden = true;
    dom.optionExplanations.replaceChildren();
    dom.cardFormatBadge.textContent = isMultipleChoice ? 'Opció múltiple' : 'V/F';
    dom.cardTopicBadge.textContent = state.isReviewMode ? 'Mode Repàs (preguntes fallades)' : q.temaNombre;
    dom.cardIndexBadge.textContent = 'Pregunta ' + (state.currentIndex + 1) + ' de ' + state.activeQueue.length;
    dom.statementText.textContent = q.pregunta;
    updateProgressUI();
  }

  function renderMultipleOptions(question) {
    dom.multipleActions.replaceChildren();
    const letters = ['A', 'B', 'C', 'D'];
    question.opciones.forEach((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn-option';
      button.dataset.choice = String(index);
      button.setAttribute('aria-pressed', 'false');
      const letter = document.createElement('span');
      letter.className = 'option-letter';
      letter.textContent = letters[index];
      const text = document.createElement('span');
      text.className = 'option-text';
      text.textContent = option;
      button.append(letter, text);
      button.addEventListener('click', () => handleAnswer(index));
      dom.multipleActions.appendChild(button);
    });
  }

  function handleAnswer(choice) {
    if (state.answered || !state.activeQueue.length || state.currentIndex >= state.activeQueue.length) return;
    const q = state.activeQueue[state.currentIndex];
    if (!q || !isValidChoice(q, choice)) return;
    state.answered = true;
    state.lastChoice = choice;
    const correct = choice === q.respuesta;
    paintAnswerFeedback(choice, q);
    if (correct) {
      state.stats.correct++;
      state.stats.streak++;
      state.stats.maxStreak = Math.max(state.stats.maxStreak, state.stats.streak);
      if (state.isReviewMode) state.stats.failedIds.delete(String(q.id));
    } else {
      state.stats.wrong++;
      state.stats.streak = 0;
      state.stats.failedIds.add(String(q.id));
    }
    updateStatsUI();
    updateProgressUI();
    persistState();
    showExplanationCard(correct, q, true);
  }

  function isValidChoice(question, choice) {
    if (!question) return false;
    if (getQuestionType(question) === 'multiple')
      return Number.isInteger(choice) && choice >= 0 && choice < question.opciones.length;
    return typeof choice === 'boolean';
  }

  function paintAnswerFeedback(choice, q) {
    const correct = choice === q.respuesta;
    if (getQuestionType(q) === 'multiple') {
      const buttons = Array.from(dom.multipleActions.querySelectorAll('.btn-option'));
      buttons.forEach((button, index) => {
        button.disabled = true;
        button.setAttribute('aria-pressed', index === choice ? 'true' : 'false');
        if (index === q.respuesta) button.classList.add('state-correct');
        else if (index === choice && !correct) button.classList.add('state-wrong-chosen');
        else button.classList.add('state-dimmed');
      });
      return;
    }
    dom.btnTrue.disabled = true;
    dom.btnFalse.disabled = true;
    const correctButton = q.respuesta ? dom.btnTrue : dom.btnFalse;
    const otherButton = q.respuesta ? dom.btnFalse : dom.btnTrue;
    correctButton.classList.add('state-correct');
    otherButton.classList.add(correct ? 'state-dimmed' : 'state-wrong-chosen');
  }

  function showExplanationCard(correct, q, shouldScroll) {
    dom.resultBadge.className = correct ? 'result-badge badge-success' : 'result-badge badge-error';
    dom.resultIcon.textContent = correct ? '✓' : '✕';
    dom.resultTitle.textContent = correct ? 'Molt bé! Resposta correcta' : 'Resposta incorrecta';
    const isMultipleChoice = getQuestionType(q) === 'multiple';
    dom.verdictTag.replaceChildren(document.createTextNode(isMultipleChoice ? 'Respuesta correcta: ' : "L'afirmació és "));
    const verdict = document.createElement('strong');
    verdict.textContent = isMultipleChoice
      ? ['A', 'B', 'C', 'D'][q.respuesta] + ' · ' + q.opciones[q.respuesta]
      : (q.respuesta ? 'VERDADERA' : 'FALSA');
    dom.verdictTag.appendChild(verdict);
    dom.explanationText.textContent = q.explicacion;
    renderOptionExplanations(q);
    dom.explanationTags.replaceChildren();
    if (Array.isArray(q.palabrasClave)) q.palabrasClave.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'concept-tag';
      span.textContent = '#' + String(tag);
      dom.explanationTags.appendChild(span);
    });
    setOptionalText(dom.trampaText, q.trampa);
    setOptionalText(dom.sourceText, q.fuente);
    dom.explanationCard.hidden = false;
    if (shouldScroll) {
      const heading = dom.explanationHeading || dom.explanationCard;
      if (heading === dom.explanationCard && !heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }
  }

  function renderOptionExplanations(question) {
    dom.optionExplanations.replaceChildren();
    const isMultipleChoice = getQuestionType(question) === 'multiple';
    dom.optionExplanations.hidden = !isMultipleChoice;
    if (!isMultipleChoice) return;
    const letters = ['A', 'B', 'C', 'D'];
    question.explicacionesOpciones.forEach((explanation, index) => {
      const item = document.createElement('li');
      if (index === question.respuesta) item.classList.add('correct-option');
      const label = document.createElement('strong');
      label.textContent = letters[index] + ' · ' + (index === question.respuesta
        ? 'Resposta que cal triar'
        : 'No és la resposta demanada');
      item.append(label, document.createTextNode(' — ' + explanation));
      dom.optionExplanations.appendChild(item);
    });
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function focusAndScroll(element) {
    if (!element) return;
    if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
    element.focus({ preventScroll: true });
    element.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  function setOptionalText(element, value) {
    if (!element) return;
    const text = value == null ? '' : String(value).trim();
    element.textContent = text;
    element.hidden = !text;
  }

  function nextQuestion() {
    if (!state.answered) return;
    state.currentIndex++;
    state.answered = false;
    state.lastChoice = null;
    persistState();
    if (state.currentIndex < state.activeQueue.length) {
      renderCurrentQuestion();
      focusAndScroll(dom.statementText);
    }
    else {
      updateProgressUI();
      showCompletionScreen(true);
      persistState();
    }
  }

  function showCompletionScreen(shouldFocus = false) {
    if (!dom.quizCard || !dom.completionCard) return;
    dom.quizCard.hidden = true;
    dom.completionCard.hidden = false;
    const total = state.stats.correct + state.stats.wrong;
    const accuracy = total ? Math.round((state.stats.correct / total) * 100) : 0;
    dom.cCorrect.textContent = state.stats.correct;
    dom.cWrong.textContent = state.stats.wrong;
    dom.cAccuracy.textContent = accuracy + '%';
    dom.cStreak.textContent = state.stats.maxStreak;
    const failedCount = getScopedFailedQuestions().length;
    dom.cFailedCount.textContent = failedCount;
    dom.cRetryFailedBtn.hidden = !failedCount;
    const emptyReview = state.isReviewMode && state.activeQueue.length === 0;
    const emptyScope = !state.isReviewMode && state.activeQueue.length === 0;
    dom.completionTitle.textContent = emptyReview ? 'No hi ha errades en aquest filtre' :
      (emptyScope ? 'No hi ha preguntes disponibles' : 'Tanda completada!');
    dom.completionMessage.textContent = emptyReview
      ? 'No hi ha preguntes fallades per al tema i format seleccionats.'
      : (emptyScope ? 'Canvia el tema o el format per trobar preguntes.' :
        'Has arribat al final de la tanda de preguntes seleccionada.');
    updateProgressUI();
    if (shouldFocus) focusAndScroll(dom.completionCard);
  }

  function updateStatsUI() {
    const total = state.stats.correct + state.stats.wrong;
    const accuracy = total ? Math.round((state.stats.correct / total) * 100) : 0;
    dom.statCorrect.textContent = state.stats.correct;
    dom.statWrong.textContent = state.stats.wrong;
    dom.statStreak.textContent = state.stats.streak;
    dom.statAccuracy.textContent = accuracy + '%';
    const count = getScopedFailedQuestions().length;
    dom.failedCountBadge.textContent = count;
    dom.reviewModeBtn.disabled = !count;
    dom.reviewModeBtn.classList.toggle('has-failed', count > 0);
    if (dom.cFailedCount) dom.cFailedCount.textContent = count;
    if (dom.cRetryFailedBtn) dom.cRetryFailedBtn.hidden = !count;
  }

  function updateProgressUI() {
    const total = state.activeQueue.length;
    const completed = Math.min(state.currentIndex + (state.answered ? 1 : 0), total);
    dom.progressText.textContent = completed + ' / ' + total;
    const percentage = total ? Math.round((completed / total) * 100) : 0;
    dom.progressBar.style.width = percentage + '%';
    dom.progressBar.setAttribute('aria-valuenow', String(percentage));
  }

  function updateShuffleControl() {
    if (!dom.shuffleToggle) return;
    dom.shuffleToggle.classList.toggle('active', state.isShuffle);
    const text = dom.shuffleToggle.querySelector('.toggle-text');
    if (text) text.innerHTML = 'Aleatori: <strong>' + (state.isShuffle ? 'Activat' : 'Desactivat') + '</strong>';
  }

  function resetSession() {
    if (!questionsReady || isLoading) return;
    const hasHistory = state.stats.correct > 0 || state.stats.wrong > 0 || state.stats.failedIds.size > 0;
    if (hasHistory && !window.confirm('Vols reiniciar les estadístiques i esborrar totes les preguntes fallades guardades?')) return;
    state.stats = createEmptyStats();
    state.isReviewMode = false;
    state.answered = false;
    state.lastChoice = null;
    applyTopicFilter(state.currentTopic);
  }

  function setupEventListeners() {
    dom.btnTrue.addEventListener('click', () => { if (questionsReady && !isLoading) handleAnswer(true); });
    dom.btnFalse.addEventListener('click', () => { if (questionsReady && !isLoading) handleAnswer(false); });
    dom.btnNext.addEventListener('click', nextQuestion);
    dom.questionFormat.addEventListener('change', event => applyFormatFilter(event.target.value));
    dom.topicFilters.addEventListener('click', event => {
      const pill = event.target.closest('.filter-pill');
      if (pill && questionsReady && !isLoading) applyTopicFilter(pill.getAttribute('data-topic'));
    });
    dom.topicFilters.addEventListener('keydown', event => {
      const currentPill = event.target.closest('.filter-pill');
      if (!currentPill) return;
      const pills = Array.from(dom.topicFilters.querySelectorAll('.filter-pill'));
      const currentIndex = pills.indexOf(currentPill);
      let nextIndex = currentIndex;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % pills.length;
      else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + pills.length) % pills.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = pills.length - 1;
      else return;

      event.preventDefault();
      event.stopPropagation();
      if (!questionsReady || isLoading) return;
      const nextPill = pills[nextIndex];
      nextPill.focus();
      applyTopicFilter(nextPill.getAttribute('data-topic'));
    });
    dom.shuffleToggle.addEventListener('click', () => {
      if (!questionsReady || isLoading) return;
      state.isShuffle = !state.isShuffle;
      updateShuffleControl();
      if (state.isReviewMode) startReviewMode();
      else applyTopicFilter(state.currentTopic);
    });
    dom.reviewModeBtn.addEventListener('click', startReviewMode);
    dom.resetBtn.addEventListener('click', resetSession);
    dom.cRetryAllBtn.addEventListener('click', () => applyTopicFilter(state.currentTopic));
    dom.cRetryFailedBtn.addEventListener('click', startReviewMode);
    dom.cAllTopicsBtn.addEventListener('click', () => applyTopicFilter('todos'));

    window.addEventListener('keydown', event => {
      if (!questionsReady || isLoading || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      if (!state.answered) {
        const question = state.activeQueue[state.currentIndex];
        if (!question || state.currentIndex >= state.activeQueue.length) return;
        if (getQuestionType(question) === 'multiple') {
          const key = event.key.toUpperCase();
          const letterChoice = ['A', 'B', 'C', 'D'].indexOf(key);
          const numberChoice = ['1', '2', '3', '4'].indexOf(event.key);
          const choice = letterChoice >= 0 ? letterChoice : numberChoice;
          if (choice >= 0) {
            event.preventDefault();
            handleAnswer(choice);
          }
        } else if (['v', 'V', 'ArrowLeft'].includes(event.key)) {
          event.preventDefault();
          handleAnswer(true);
        } else if (['f', 'F', 'ArrowRight'].includes(event.key)) {
          event.preventDefault();
          handleAnswer(false);
        }
        return;
      }
      const canAdvance = target === document.body || target === dom.explanationHeading || target === dom.btnNext;
      if (canAdvance && [' ', 'Enter', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        nextQuestion();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
