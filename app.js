const screen = document.getElementById('screen');
const navItems = document.querySelectorAll('.nav-item');

const TASKS_KEY = 'ru_day_tasks';
const STUDY_KEY = 'ru_study_data';

function loadData(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

let tasks = loadData(TASKS_KEY, []);
let study = loadData(STUDY_KEY, { subjects: [], lessons: [] });
let addingPeriod = null;
let selectedSubject = null;

if (!Array.isArray(tasks)) tasks = [];
if (!Array.isArray(study.subjects)) study.subjects = [];
if (!Array.isArray(study.lessons)) study.lessons = [];

function saveTasks() {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function saveStudy() {
  localStorage.setItem(STUDY_KEY, JSON.stringify(study));
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#039;'
  })[char]);
}

function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function renderPlanner() {
  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  const groups = [
    { id: 'morning', label: 'Утро' },
    { id: 'day', label: 'День' },
    { id: 'evening', label: 'Вечер' }
  ];

  screen.innerHTML = `
    <section class="eva-day">
      <div class="eva-day-heading">
        <div>
          <h1>Сегодня</h1>
          <p class="eva-date">${today}</p>
        </div>
      </div>
      <div class="eva-sections">
        ${groups.map(group => {
          const groupTasks = tasks.filter(task => task.period === group.id);
          return `
            <section class="eva-section">
              <div class="eva-section-heading">
                <h2>${group.label}</h2>
                <span>${groupTasks.length || ''}</span>
              </div>
              <div class="eva-task-list">
                ${groupTasks.map(task => `
                  <article class="eva-task ${task.done ? 'completed' : ''}">
                    <button class="eva-check" data-toggle="${task.id}">${task.done ? '✓' : ''}</button>
                    <span class="eva-task-name">${escapeHTML(task.text)}</span>
                    <button class="eva-delete" data-delete="${task.id}">×</button>
                  </article>
                `).join('')}
                ${addingPeriod === group.id ? `
                  <form class="eva-inline-add" data-form="${group.id}">
                    <input name="task" placeholder="Название задачи" maxlength="120" required>
                    <button type="submit">✓</button>
                    <button type="button" data-cancel>×</button>
                  </form>
                ` : `
                  <button class="eva-empty-add" data-period="${group.id}">+ Добавить задачу</button>
                `}
              </div>
            </section>
          `;
        }).join('')}
      </div>
    </section>
  `;

  screen.querySelectorAll('[data-period]').forEach(button => {
    button.addEventListener('click', () => {
      addingPeriod = button.dataset.period;
      renderPlanner();
      screen.querySelector('.eva-inline-add input')?.focus();
    });
  });

  screen.querySelectorAll('.eva-inline-add').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const text = form.elements.task.value.trim();
      if (!text) return;
      tasks.push({ id: Date.now(), text, period: form.dataset.form, done: false });
      saveTasks();
      addingPeriod = null;
      renderPlanner();
    });
  });

  screen.querySelectorAll('[data-cancel]').forEach(button => {
    button.addEventListener('click', () => {
      addingPeriod = null;
      renderPlanner();
    });
  });

  screen.querySelectorAll('[data-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.toggle);
      tasks = tasks.map(task => task.id === id ? { ...task, done: !task.done } : task);
      saveTasks();
      renderPlanner();
    });
  });

  screen.querySelectorAll('[data-delete]').forEach(button => {
    button.addEventListener('click', () => {
      tasks = tasks.filter(task => task.id !== Number(button.dataset.delete));
      saveTasks();
      renderPlanner();
    });
  });
}

function renderNutrition() {
  const defaultNutrition = {
    goals: { calories: 1800, protein: 100, fat: 60, carbs: 210 },
    mealsByType: {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: []
    }
  };

  let nutrition;

  try {
    nutrition = JSON.parse(
      localStorage.getItem('ruNutrition') || 'null'
    ) || defaultNutrition;
  } catch {
    nutrition = defaultNutrition;
  }

  nutrition.goals = {
    ...defaultNutrition.goals,
    ...(nutrition.goals || {})
  };

  if (!nutrition.mealsByType) {
    nutrition.mealsByType = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: []
    };

    if (Array.isArray(nutrition.meals)) {
      nutrition.mealsByType.breakfast = nutrition.meals;
    }
  }

  const types = [
    { id: 'breakfast', title: 'Завтрак' },
    { id: 'lunch', title: 'Обед' },
    { id: 'dinner', title: 'Ужин' },
    { id: 'snack', title: 'Перекус' }
  ];

  function saveNutrition() {
    localStorage.setItem('ruNutrition', JSON.stringify(nutrition));
  }

  function total(key) {
    return types.reduce((sum, type) => {
      return sum + nutrition.mealsByType[type.id].reduce(
        (subtotal, meal) => subtotal + (Number(meal[key]) || 0),
        0
      );
    }, 0);
  }

  const calories = total('calories');
  const protein = total('protein');
  const fat = total('fat');
  const carbs = total('carbs');

  screen.innerHTML = `
    <section class="nutrition-page">
      <h1 class="eva-other-title">Питание</h1>

      <section class="nutrition-summary">
        <h2>Нормы на день</h2>

        <form id="nutritionGoals" class="nutrition-goals">
          <label>
            Калории, ккал
            <input name="calories" type="number" min="0"
              value="${nutrition.goals.calories}" required>
          </label>

          <label>
            Белки, г
            <input name="protein" type="number" min="0"
              value="${nutrition.goals.protein}" required>
          </label>

          <label>
            Жиры, г
            <input name="fat" type="number" min="0"
              value="${nutrition.goals.fat}" required>
          </label>

          <label>
            Углеводы, г
            <input name="carbs" type="number" min="0"
              value="${nutrition.goals.carbs}" required>
          </label>

          <button class="nutrition-save" type="submit">
            Сохранить нормы
          </button>
        </form>
      </section>

      <h2>Дневник питания</h2>

      <section class="nutrition-summary">
        <p class="nutrition-caption">КАЛОРИИ</p>

        <div class="nutrition-calories">
          <strong>${Math.round(calories)}</strong>
          <span>ккал</span>
        </div>

        <p class="nutrition-caption">
          Цель: ${nutrition.goals.calories} ккал
        </p>

        <div class="nutrition-progress">
          <div style="width:${Math.min(100, calories / Math.max(1, nutrition.goals.calories) * 100)}%"></div>
        </div>

        <div class="nutrition-macros">
          ${[
            ['Белки', protein, nutrition.goals.protein, 'protein'],
            ['Жиры', fat, nutrition.goals.fat, 'fat'],
            ['Углеводы', carbs, nutrition.goals.carbs, 'carbs']
          ].map(([label, value, goal, key]) => `
            <div>
              <span>${label}</span>
              <strong>${Math.round(value)} г / ${goal} г</strong>
            </div>
            <div class="nutrition-progress">
              <div style="width:${Math.min(100, value / Math.max(1, goal) * 100)}%"></div>
            </div>
          `).join('')}
        </div>
      </section>

      <div class="nutrition-meals">
        ${types.map(type => {
          const meals = nutrition.mealsByType[type.id] || [];
          const mealCalories = meals.reduce(
            (sum, meal) => sum + (Number(meal.calories) || 0), 0
          );

          return `
            <details class="nutrition-section" open>
              <summary class="nutrition-section-heading">
                <strong>${type.title}</strong>
                <span>${Math.round(mealCalories)} ккал</span>
                <span class="nutrition-chevron">⌄</span>
              </summary>

              <div class="nutrition-section-content">
                ${meals.length ? meals.map((meal, index) => `
                  <div class="nutrition-meal">
                    <div>
                      <strong>${escapeHTML(meal.name)}</strong>
                      <p>
  ${meal.amount ? `${meal.amount} г · ` : ''}${Math.round(Number(meal.calories) || 0)} ккал ·
  Б ${(Number(meal.protein) || 0).toFixed(1)} г ·
  Ж ${(Number(meal.fat) || 0).toFixed(1)} г ·
  У ${(Number(meal.carbs) || 0).toFixed(1)} г
</p>
                    </div>
                    <button type="button"
                      data-delete-meal="${type.id}"
                      data-meal-index="${index}"
                      aria-label="Удалить продукт">×</button>
                  </div>
                `).join('') : `
                  <p class="nutrition-empty">Пока ничего не добавлено</p>
                `}

                <button type="button" class="nutrition-add"
                  data-add-meal="${type.id}">
                  + Добавить продукт
                </button>

                <form class="nutrition-product-form"
                  data-product-form="${type.id}" hidden>
                  <label>
                    Название продукта
                    <input name="name" type="text"
                      placeholder="Например, овсяная каша" required>
                  </label>
<div class="nutrition-barcode-search">

  <label>

    Штрихкод продукта

    <input

      name="barcode"

      type="text"

      inputmode="numeric"

      placeholder="Введи цифры со штрихкода"

    >

  </label>

  <button type="button" class="nutrition-camera-button">

  Сканировать камерой

</button>
<div class="nutrition-camera-reader" hidden></div>
<button type="button" class="nutrition-barcode-button">

  Найти продукт

</button>
  <p class="nutrition-barcode-message"></p>

</div>

                  <label class="nutrition-amount-label">
                Количество, г
                <input name="amount" type="number" min="1"
                  value="100" required>
              </label>
              <p class="nutrition-portion-preview">
                Укажи КБЖУ на 100 г — расчёт порции появится здесь.
              </p>
              <div class="nutrition-product-fields">
                <label>Ккал на 100 г
                  <input name="calories" type="number" min="0"
                    step="any" value="0" required>
                </label>
                <label>Белки, г на 100 г
                  <input name="protein" type="number" min="0"
                    step="any" value="0" required>
                </label>
                <label>Жиры, г на 100 г
                  <input name="fat" type="number" min="0"
                    step="any" value="0" required>
                </label>
                <label>Углеводы, г на 100 г
                  <input name="carbs" type="number" min="0"
                    step="any" value="0" required>
                </label>
              </div>

                  <button class="nutrition-save" type="submit">
                    Сохранить продукт
                  </button>
                </form>
              </div>
            </details>
          `;
        }).join('')}
      </div>
    </section>
  `;

  document.getElementById('nutritionGoals').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;

    nutrition.goals = {
      calories: Number(form.elements.calories.value),
      protein: Number(form.elements.protein.value),
      fat: Number(form.elements.fat.value),
      carbs: Number(form.elements.carbs.value)
    };

    saveNutrition();
    renderNutrition();
  });

  document.querySelectorAll('[data-add-meal]').forEach(button => {
    button.addEventListener('click', () => {
      const form = document.querySelector(
        `[data-product-form="${button.dataset.addMeal}"]`
      );

      form.hidden = !form.hidden;

      if (!form.hidden) {
        form.elements.name.focus();
      }
    });
  });
document.querySelectorAll('.nutrition-barcode-button').forEach(button => {
  button.addEventListener('click', async () => {
    const form = button.closest('.nutrition-product-form');
    const barcodeInput = form.querySelector('[name="barcode"]');
    const message = form.querySelector('.nutrition-barcode-message');
    const barcode = barcodeInput.value.trim();

    if (!/^\d{8,14}$/.test(barcode)) {
      message.textContent = 'Введи корректный штрихкод из 8–14 цифр.';
      return;
    }

    button.disabled = true;
    message.textContent = 'Ищу продукт в базе FoodBase…';

    try {
      const response = await fetch(
        `https://ru-food-api.rukaechka2010.workers.dev/lookup?barcode=${encodeURIComponent(barcode)}`
      );

      const data = await response.json();

      if (!response.ok) {
        message.textContent =
          response.status === 404
            ? 'Продукт не найден. Введи данные вручную.'
            : (data.error || 'Не удалось найти продукт. Попробуй ещё раз.');
        return;
      }

      const nutrients = data.nutrition_summary || {};
      const nameInput = form.querySelector('[name="name"]');

      nameInput.value = data.name_default || data.name || '';
      form.elements.calories.value = nutrients.energy_kcal ?? '';
      form.elements.protein.value = nutrients.proteins_g ?? '';
      form.elements.fat.value = nutrients.fat_g ?? '';
      form.elements.carbs.value = nutrients.carbs_g ?? '';

      message.textContent =
        'Продукт найден! Проверь данные: показатели указаны на 100 г.';
    } catch (error) {
      console.error('Ошибка поиска продукта:', error);
      message.textContent =
        'Не удалось связаться с базой. Проверь интернет и попробуй ещё раз.';
    } finally {
      button.disabled = false;
    }
  });
});
  document.querySelectorAll('.nutrition-camera-button').forEach(button => {
    button.addEventListener('click', async () => {
      const form = button.closest('.nutrition-product-form');
      const barcodeInput = form.querySelector('[name="barcode"]');
      const reader = form.querySelector('.nutrition-camera-reader');
      const message = form.querySelector('.nutrition-barcode-message');

      if (typeof Html5Qrcode === 'undefined') {
        message.textContent = 'Сканер не загрузился. Проверь интернет.';
        return;
      }

      if (reader.dataset.running === 'true') {
        return;
      }

      reader.hidden = false;
      reader.id = 'nutrition-reader';
      button.disabled = true;

      const scanner = new Html5Qrcode(reader.id);
      message.textContent = 'Запрашиваю доступ к камере…';

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          async decodedText => {
            barcodeInput.value = decodedText;
            message.textContent = 'Штрихкод считан!';

            try {
              await scanner.stop();
            } catch (error) {}

            reader.dataset.running = 'false';
            reader.hidden = true;
            button.disabled = false;

            form.querySelector('.nutrition-barcode-button').click();
          },
          () => {}
        );

        reader.dataset.running = 'true';
        message.textContent = 'Наведи камеру на штрихкод.';
      } catch (error) {
        reader.hidden = true;
        button.disabled = false;
        message.textContent =
          'Не удалось открыть камеру. Проверь разрешение и HTTPS.';
      }
    });
  });
  document.querySelectorAll('[data-product-form]').forEach(form => {
  const amountInput = form.elements.amount;
  const preview = form.querySelector('.nutrition-portion-preview');

  function updatePortionPreview() {
    const amount = Number(amountInput.value) || 0;
    const factor = amount / 100;

    const calories = (Number(form.elements.calories.value) || 0) * factor;
    const protein = (Number(form.elements.protein.value) || 0) * factor;
    const fat = (Number(form.elements.fat.value) || 0) * factor;
    const carbs = (Number(form.elements.carbs.value) || 0) * factor;

    preview.textContent =
      `Для ${amount} г: ${Math.round(calories)} ккал · ` +
      `Б ${protein.toFixed(1)} г · Ж ${fat.toFixed(1)} г · ` +
      `У ${carbs.toFixed(1)} г`;
  }

  [
    amountInput,
    form.elements.calories,
    form.elements.protein,
    form.elements.fat,
    form.elements.carbs
  ].forEach(input => {
    input.addEventListener('input', updatePortionPreview);
  });

  updatePortionPreview();

  form.addEventListener('submit', event => {
    event.preventDefault();

    const values = new FormData(form);
    const amount = Number(values.get('amount')) || 100;
    const factor = amount / 100;

    nutrition.mealsByType[form.dataset.productForm].push({
      name: String(values.get('name')).trim(),
      amount,
      calories: (Number(values.get('calories')) || 0) * factor,
      protein: (Number(values.get('protein')) || 0) * factor,
      fat: (Number(values.get('fat')) || 0) * factor,
      carbs: (Number(values.get('carbs')) || 0) * factor
    });

    saveNutrition();
    renderNutrition();
  });
});

  document.querySelectorAll('[data-delete-meal]').forEach(button => {
    button.addEventListener('click', () => {
      const type = button.dataset.deleteMeal;
      const index = Number(button.dataset.mealIndex);

      nutrition.mealsByType[type].splice(index, 1);

      saveNutrition();
      renderNutrition();
    });
  });
}
function renderStudy() {
  const subject = study.subjects.find(item => item.id === selectedSubject);

  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + index);
    const key = dateKey(date);
    const count = study.lessons.filter(
      lesson => lesson.done && lesson.completedDate === key
    ).length;

    return {
      key,
      count,
      label: date.toLocaleDateString('ru-RU', { weekday: 'short' })
        .replace('.', '')
    };
  });

  const maxCount = Math.max(1, ...week.map(day => day.count));

  screen.innerHTML = `
    <section class="eva-day study-screen">
      <h1 class="eva-other-title">Учёба</h1>

      <div class="study-section-heading">
        <h2>Твои предметы</h2>
        <button class="study-add-button" id="addSubject" aria-label="Добавить предмет">+</button>
      </div>

      <form class="study-subject-form" id="subjectForm" hidden>
        <input name="subject" placeholder="Название предмета" maxlength="60" required>
        <button type="submit">Добавить</button>
      </form>

      <div class="study-subject-list">
        ${study.subjects.length ? study.subjects.map(item => `
          <div class="study-subject-row">
            <button class="study-subject ${selectedSubject === item.id ? 'selected' : ''}" data-subject="${item.id}">
              <span>${escapeHTML(item.name)}</span><span>›</span>
            </button>
            <button class="study-remove-item" data-remove-subject="${item.id}" aria-label="Удалить предмет">×</button>
          </div>
        `).join('') : `
          <p class="study-empty">Добавь первый предмет с помощью плюса.</p>
        `}
      </div>

      <div class="study-section-heading">
        <h2>Твои занятия</h2>
        <button class="study-add-button" id="addLesson" aria-label="Добавить занятие">+</button>
      </div>

      ${!study.subjects.length ? `
        <p class="study-empty">Сначала добавь предмет, затем сможешь создавать занятия.</p>
      ` : `
        <form class="study-lesson-form" id="lessonForm" hidden>
          <select name="subjectId" aria-label="Предмет" required>
            ${study.subjects.map(item => `
              <option value="${item.id}" ${selectedSubject === item.id ? 'selected' : ''}>
                ${escapeHTML(item.name)}
              </option>
            `).join('')}
          </select>
          <input name="lesson" placeholder="Название занятия" maxlength="100" required>
          <button type="submit">Добавить</button>
        </form>

        <div class="study-lesson-list">
          ${study.lessons
            .filter(lesson => !subject || lesson.subjectId === subject.id)
            .map(lesson => {
              const lessonSubject = study.subjects.find(item => item.id === lesson.subjectId);
              return `
                <article class="study-lesson ${lesson.done ? 'completed' : ''}">
                  <button class="eva-check" data-lesson-toggle="${lesson.id}" aria-label="Отметить занятие">${lesson.done ? '✓' : ''}</button>
                  <span>
                    ${escapeHTML(lesson.name)}
                    <small>${escapeHTML(lessonSubject?.name || '')}</small>
                  </span>
                  <button class="eva-delete" data-lesson-delete="${lesson.id}" aria-label="Удалить занятие">×</button>
                </article>
              `;
            }).join('') || '<p class="study-empty">Занятий пока нет. Добавь первое!</p>'}
        </div>
      `}

      <section class="study-chart-card">

  <h2>Прогресс недели</h2>

  <p class="study-chart-subtitle">Выполненные занятия по дням</p>

  <div class="study-chart">

    <svg class="study-line-graph" viewBox="0 0 320 150" role="img" aria-label="График прогресса недели">

  <g class="study-grid">

    <line x1="12" y1="25" x2="308" y2="25" />

    <line x1="12" y1="60" x2="308" y2="60" />

    <line x1="12" y1="95" x2="308" y2="95" />

    <line x1="12" y1="130" x2="308" y2="130" />

  </g>

  <line class="study-line-segment" x1="12" y1="75" x2="61" y2="45" />

  <line class="study-line-segment" x1="61" y1="45" x2="110" y2="67" />

  <line class="study-line-segment" x1="110" y1="67" x2="160" y2="30" />

  <line class="study-line-segment" x1="160" y1="30" x2="209" y2="82" />

  <line class="study-line-segment" x1="209" y1="82" x2="258" y2="53" />

  <line class="study-line-segment" x1="258" y1="53" x2="308" y2="70" />

</svg>
      <CodeBlock language="html" editable>
${week.map((day, index) => {
const heights = [52, 30, 43, 18, 37, 12, 25];
const nextHeights = [30, 43, 18, 37, 12, 25, 35];
const x = 12 + index * (296 / 6);
const y1 = 130 - heights[index];
const y2 = 130 - nextHeights[index];
return `
`;
}).join('')}
</CodeBlock>

    <div class="study-chart-days">

      ${week.map(day => `

        <div class="study-chart-day">

          <span>${escapeHTML(day.label)}</span>

          <small>${day.count}</small>

        </div>

      `).join('')}

    </div>

  </div>

</section>
  `;

  document.getElementById('addSubject').addEventListener('click', () => {
    const form = document.getElementById('subjectForm');
    form.hidden = !form.hidden;
    if (!form.hidden) form.elements.subject.focus();
  });

  document.getElementById('subjectForm').addEventListener('submit', event => {
    event.preventDefault();
    const name = event.currentTarget.elements.subject.value.trim();
    if (!name) return;

    const id = Date.now();
    study.subjects.push({ id, name });
    selectedSubject = id;
    saveStudy();
    renderStudy();
  });

  screen.querySelectorAll('[data-subject]').forEach(button => {
    button.addEventListener('click', () => {
      selectedSubject = Number(button.dataset.subject);
      renderStudy();
    });
  });

  screen.querySelectorAll('[data-remove-subject]').forEach(button => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.removeSubject);
      study.subjects = study.subjects.filter(item => item.id !== id);
      study.lessons = study.lessons.filter(lesson => lesson.subjectId !== id);
      if (selectedSubject === id) selectedSubject = null;
      saveStudy();
      renderStudy();
    });
  });

  document.getElementById('addLesson')?.addEventListener('click', () => {
    const form = document.getElementById('lessonForm');
    if (!form) return;
    form.hidden = !form.hidden;
    if (!form.hidden) form.elements.lesson.focus();
  });

  document.getElementById('lessonForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const name = event.currentTarget.elements.lesson.value.trim();
    const subjectId = Number(event.currentTarget.elements.subjectId.value);
    if (!name || !study.subjects.some(item => item.id === subjectId)) return;

    study.lessons.push({
      id: Date.now(),
      subjectId,
      name,
      done: false,
      completedDate: null
    });

    selectedSubject = subjectId;
    saveStudy();
    renderStudy();
  });

  screen.querySelectorAll('[data-lesson-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.lessonToggle);
      study.lessons = study.lessons.map(lesson => {
        if (lesson.id !== id) return lesson;
        const done = !lesson.done;
        return {
          ...lesson,
          done,
          completedDate: done ? dateKey() : null
        };
      });
      saveStudy();
      renderStudy();
    });
  });

  screen.querySelectorAll('[data-lesson-delete]').forEach(button => {
    button.addEventListener('click', () => {
      study.lessons = study.lessons.filter(
        lesson => lesson.id !== Number(button.dataset.lessonDelete)
      );
      saveStudy();
      renderStudy();
    });
  });
}

function showPage(page) {
  navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  if (page === 'planner') {
    renderPlanner();
  } else if (page === 'study') {
      renderStudy();
    } else if (page === 'nutrition') {
      renderNutrition();
    } else {
    const titles = {
      nutrition: 'Питание',
      sport: 'Спорт',
      focus: 'Focus Time',
      profile: 'Профиль'
    };

    screen.innerHTML = `
      <section class="eva-day">
        <h1 class="eva-other-title">${titles[page] || ''}</h1>
      </section>
    `;
  }
}

navItems.forEach(item => {
  item.addEventListener('click', () => showPage(item.dataset.page));
});

document.getElementById('homeLogo').addEventListener('click', event => {
  event.preventDefault();
  showPage('planner');
});

renderPlanner();
