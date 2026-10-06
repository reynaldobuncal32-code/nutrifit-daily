'use strict';

const STORAGE_KEY = 'nutrifitDailyData';
const WATER_GOAL = 2000;
const STEP_GOAL = 7000;
const ACTIVITY_GOAL = 30;
const CALORIE_GOAL = 2000;

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function createInitialData() {
  return { username: '', meals: [], weightHistory: [], daily: {}, settings: {} };
}

function loadData() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!stored || typeof stored !== 'object') return createInitialData();
    return {
      ...createInitialData(),
      ...stored,
      meals: Array.isArray(stored.meals) ? stored.meals : [],
      weightHistory: Array.isArray(stored.weightHistory) ? stored.weightHistory : [],
      daily: stored.daily && typeof stored.daily === 'object' ? stored.daily : {},
      settings: stored.settings && typeof stored.settings === 'object' ? stored.settings : {}
    };
  } catch (error) {
    return createInitialData();
  }
}

let data = loadData();
let activePage = 'home';
let toastTimer;
const splash = document.getElementById('splash');
const app = document.getElementById('app');
const welcomeScreen = document.getElementById('welcomeScreen');
const mainScreen = document.getElementById('mainScreen');
const screenContent = document.getElementById('screenContent');
const toast = document.getElementById('toast');

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function todayData() {
  const key = todayKey();
  if (!data.daily[key]) data.daily[key] = { water: 0, activities: [] };
  if (!Array.isArray(data.daily[key].activities)) data.daily[key].activities = [];
  if (!Number.isFinite(data.daily[key].water)) data.daily[key].water = 0;
  return data.daily[key];
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function formatDate(dateValue, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  const date = new Date(`${dateValue}T12:00:00`);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : new Intl.DateTimeFormat(undefined, options).format(date);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
}

function todayMeals() {
  return data.meals.filter((meal) => meal.date === todayKey());
}

function totalCalories(meals = todayMeals()) {
  return meals.reduce((sum, meal) => sum + Number(meal.calories || 0), 0);
}

function totalSteps(activities = todayData().activities) {
  return activities.reduce((sum, activity) => sum + Number(activity.steps || 0), 0);
}

function totalMinutes(activities = todayData().activities) {
  return activities.reduce((sum, activity) => sum + Number(activity.minutes || 0), 0);
}

function latestWeight() {
  return data.weightHistory[0] || null;
}

function progressPercent(value, goal) {
  return Math.min(100, Math.round((Number(value || 0) / goal) * 100));
}

function metricCard(icon, iconClass, title, value, detail, page) {
  return `<article class="card metric-card" data-card-nav="${page}" tabindex="0" role="button" aria-label="Open ${title}">
    <div class="metric-top"><span>${title}</span><span class="metric-icon ${iconClass}" aria-hidden="true">${icon}</span></div>
    <p class="metric-number">${value}</p><span class="metric-detail">${detail}</span>
  </article>`;
}

function renderHome() {
  const daily = todayData();
  const meals = todayMeals();
  const calories = totalCalories(meals);
  const water = daily.water;
  const weight = latestWeight();
  const steps = totalSteps();
  const minutes = totalMinutes();
  const completed = [water >= WATER_GOAL, calories > 0, steps >= STEP_GOAL, minutes >= ACTIVITY_GOAL].filter(Boolean).length;
  return `<p class="greeting">${greeting()},</p>
    <h1 class="welcome-heading">Hello, ${escapeHtml(data.username || 'there')}!</h1>
    <p class="dashboard-date">${formatDate(todayKey(), { weekday: 'long', month: 'long', day: 'numeric' })}</p>
    <article class="card hero-card">
      <p class="hero-label">Your daily wellness</p><p class="hero-value">${completed} of 4 goals</p>
      <p class="hero-foot">A little progress adds up. Keep going!</p>
      <button class="button button-small" type="button" data-nav="progress">See today's progress →</button>
    </article>
    <h2 class="section-heading">Your day <button class="text-button" type="button" data-nav="progress">View all</button></h2>
    <div class="metric-grid">
      ${metricCard('◉', 'icon-coral', 'Nutrition', `${calories.toLocaleString()} <small>kcal</small>`, `${meals.length} meal${meals.length === 1 ? '' : 's'} logged`, 'nutrition')}
      ${metricCard('♒', 'icon-blue', 'Water', `${water.toLocaleString()} <small>ml</small>`, `of ${WATER_GOAL.toLocaleString()} ml goal`, 'water')}
      ${metricCard('↕', 'icon-green', 'Weight', weight ? `${escapeHtml(weight.weight)} <small>kg</small>` : 'Add weight', weight ? formatDate(weight.date) : 'Track your journey', 'weight')}
      ${metricCard('↗', 'icon-gold', 'Walking & activity', `${steps.toLocaleString()} <small>steps</small>`, `${minutes} activity min today`, 'activity')}
    </div>
    <h2 class="section-heading">Daily progress</h2>
    <article class="card progress-card">
      <div class="progress-row"><span>Healthy habits</span><strong>${completed}/4</strong></div>
      <div class="progress-track"><div class="progress-fill" style="width:${completed * 25}%"></div></div>
      <p class="metric-detail" style="margin:9px 0 0">${completed === 4 ? 'Wonderful work, all daily goals reached!' : 'Every small step counts toward feeling your best.'}</p>
    </article>
    <h2 class="section-heading">Today's food for thought</h2>
    <article class="card suggestion-card"><span class="suggestion-icon" aria-hidden="true">🥑</span><div><strong>Make room for color</strong><p>Add a fruit or vegetable to your next meal for a simple, nourishing boost.</p></div></article>`;
}

function renderMeals(meals) {
  if (!meals.length) return '<div class="empty-state">No meals yet today. Add your first meal above.</div>';
  return `<div class="history-list">${meals.map((meal) => `<article class="history-item"><div class="history-main"><strong>${escapeHtml(meal.food)}</strong><small>${escapeHtml(meal.type)} · ${formatDate(meal.date, { month: 'short', day: 'numeric' })}</small></div><span class="history-value">${Number(meal.calories).toLocaleString()} kcal</span></article>`).join('')}</div>`;
}

function renderNutrition() {
  const meals = todayMeals();
  const calories = totalCalories(meals);
  const allMeals = [...data.meals].reverse().slice(0, 30);
  return `<h1 class="screen-title">Nutrition</h1><p class="screen-subtitle">A little awareness makes a big difference.</p>
    <article class="card tracker-card"><div class="tracker-header"><strong>Today's calories</strong><span>${calories.toLocaleString()} / ${CALORIE_GOAL.toLocaleString()} kcal</span></div><div class="progress-track"><div class="progress-fill" style="width:${progressPercent(calories, CALORIE_GOAL)}%"></div></div></article>
    <article class="card tracker-card"><div class="tracker-header"><strong>Log a meal</strong><span>All fields required</span></div>
      <form id="mealForm" class="tracker-form">
        <select name="type" aria-label="Meal type" required><option value="Breakfast">Breakfast</option><option value="Lunch">Lunch</option><option value="Dinner">Dinner</option><option value="Snack">Snack</option></select>
        <input name="food" type="text" maxlength="60" placeholder="Food name" required>
        <div class="input-unit"><input name="calories" type="number" min="1" max="10000" step="1" placeholder="Calories" required><span>kcal</span></div>
        <button class="button button-primary" type="submit">Add meal</button>
      </form>
    </article>
    <h2 class="list-heading">Today's meals</h2>${renderMeals(meals)}
    <h2 class="list-heading">Meal history</h2>${allMeals.length ? renderMeals(allMeals) : '<div class="empty-state">Your meal history will appear here.</div>'}`;
}

function renderWater() {
  const amount = todayData().water;
  const percent = progressPercent(amount, WATER_GOAL);
  return `<h1 class="screen-title">Water</h1><p class="screen-subtitle">Stay refreshed, one glass at a time.</p>
    <article class="card water-layout"><div class="water-ring" style="--progress:${Math.min(360, (amount / WATER_GOAL) * 360)}deg"><div class="water-ring-inner"><strong>${percent}%</strong><span>daily goal</span></div></div>
      <div><div class="tracker-header" style="margin-bottom:8px"><strong>${amount.toLocaleString()} ml</strong><span>of ${WATER_GOAL.toLocaleString()} ml</span></div><div class="progress-track" style="width:min(250px, 76vw)"><div class="progress-fill" style="width:${percent}%"></div></div></div>
      <div class="water-presets"><button class="button button-soft" type="button" data-water="250">+250 ml</button><button class="button button-soft" type="button" data-water="500">+500 ml</button><button class="button button-soft" type="button" data-water="1000">+1000 ml</button></div>
      <button class="button button-quiet button-small" type="button" data-action="reset-water">Reset today's water</button>
    </article><p class="goal-caption">Your daily water goal is ${WATER_GOAL.toLocaleString()} ml. Intake is saved automatically.</p>`;
}

function renderActivityHistory(activities) {
  if (!activities.length) return '<div class="empty-state">No activities yet. Record a walk or jog to get started.</div>';
  return `<div class="history-list">${[...activities].reverse().map((activity) => `<article class="history-item"><div class="history-main"><strong>${escapeHtml(activity.type)}</strong><small>${formatDate(activity.date, { month: 'short', day: 'numeric' })} · ${Number(activity.minutes)} min</small></div><span class="history-value">${Number(activity.steps).toLocaleString()} steps</span></article>`).join('')}</div>`;
}

function renderActivity() {
  const activities = todayData().activities;
  const steps = totalSteps(activities);
  const minutes = totalMinutes(activities);
  return `<h1 class="screen-title">Move your way</h1><p class="screen-subtitle">Every movement is worth celebrating.</p>
    <div class="metric-grid"><article class="card metric-card"><div class="metric-top"><span>Steps today</span><span class="metric-icon icon-green">↗</span></div><p class="metric-number">${steps.toLocaleString()}</p><span class="metric-detail">of ${STEP_GOAL.toLocaleString()} step goal</span></article><article class="card metric-card"><div class="metric-top"><span>Activity</span><span class="metric-icon icon-gold">◷</span></div><p class="metric-number">${minutes} <small>min</small></p><span class="metric-detail">of ${ACTIVITY_GOAL} minute goal</span></article></div>
    <article class="card tracker-card" style="margin-top:12px"><div class="tracker-header"><strong>Log an activity</strong><span>Walk or jog</span></div><form id="activityForm" class="tracker-form two-col"><select name="type" aria-label="Activity type"><option>Walking</option><option>Jogging</option></select><div class="input-unit"><input name="minutes" type="number" min="1" max="1440" placeholder="Minutes" required><span>min</span></div><div class="input-unit" style="grid-column:1/-1"><input name="steps" type="number" min="0" max="200000" placeholder="Steps" required><span>steps</span></div><button class="button button-primary" type="submit">Save activity</button></form></article>
    <h2 class="list-heading">Today's activity</h2>${renderActivityHistory(activities)}`;
}

function renderWeight() {
  const history = data.weightHistory.slice(0, 30);
  const current = latestWeight();
  return `<h1 class="screen-title">Weight tracker</h1><p class="screen-subtitle">Your progress, recorded at your pace.</p>
    <article class="card tracker-card"><div class="tracker-header"><strong>Current weight</strong><span>${current ? formatDate(current.date) : 'No records yet'}</span></div><p class="metric-number" style="font-size:30px;margin:0 0 15px">${current ? `${escapeHtml(current.weight)} <small>kg</small>` : '— <small>kg</small>'}</p><form id="weightForm" class="tracker-form"><div class="input-unit"><input name="weight" type="number" min="1" max="500" step="0.1" placeholder="Enter weight" required><span>kg</span></div><button class="button button-primary" type="submit">Save weight</button></form></article>
    <h2 class="list-heading">Weight history</h2>${history.length ? `<div class="history-list">${history.map((record) => `<article class="history-item"><div class="history-main"><strong>Weight recorded</strong><small>${formatDate(record.date)}</small></div><span class="history-value">${escapeHtml(record.weight)} kg</span></article>`).join('')}</div>` : '<div class="empty-state">Your weight records will appear here.</div>'}`;
}

function renderProgress() {
  const daily = todayData();
  const calories = totalCalories();
  const steps = totalSteps();
  const minutes = totalMinutes();
  const waterPercent = progressPercent(daily.water, WATER_GOAL);
  const nutritionPercent = calories > 0 ? progressPercent(calories, CALORIE_GOAL) : 0;
  const habits = [
    ['Water goal', daily.water >= WATER_GOAL, `${daily.water.toLocaleString()} / ${WATER_GOAL.toLocaleString()} ml`],
    ['Nutrition logged', calories > 0, `${calories.toLocaleString()} kcal logged`],
    ['Step goal', steps >= STEP_GOAL, `${steps.toLocaleString()} / ${STEP_GOAL.toLocaleString()} steps`],
    ['Activity goal', minutes >= ACTIVITY_GOAL, `${minutes} / ${ACTIVITY_GOAL} minutes`]
  ];
  const weight = latestWeight();
  return `<h1 class="screen-title">Your progress</h1><p class="screen-subtitle">${formatDate(todayKey(), { weekday: 'long', month: 'long', day: 'numeric' })}</p>
    <article class="card tracker-card"><div class="tracker-header"><strong>Water</strong><span>${waterPercent}%</span></div><div class="progress-track"><div class="progress-fill" style="width:${waterPercent}%"></div></div></article>
    <article class="card tracker-card"><div class="tracker-header"><strong>Nutrition</strong><span>${nutritionPercent}% of calorie guide</span></div><div class="progress-track"><div class="progress-fill" style="width:${nutritionPercent}%"></div></div></article>
    <div class="metric-grid"><article class="card metric-card" data-card-nav="weight" role="button" tabindex="0"><div class="metric-top"><span>Weight</span><span class="metric-icon icon-coral">↕</span></div><p class="metric-number">${weight ? `${escapeHtml(weight.weight)} <small>kg</small>` : '—'}</p><span class="metric-detail">${weight ? formatDate(weight.date) : 'No record yet'}</span></article><article class="card metric-card" data-card-nav="activity" role="button" tabindex="0"><div class="metric-top"><span>Steps</span><span class="metric-icon icon-green">↗</span></div><p class="metric-number">${steps.toLocaleString()}</p><span class="metric-detail">${minutes} activity minutes</span></article></div>
    <h2 class="section-heading">Healthy habits</h2><article class="card habits-list">${habits.map(([label, done, detail]) => `<div class="habit-row"><span><strong>${escapeHtml(label)}</strong><br><small style="color:var(--muted)">${escapeHtml(detail)}</small></span><span class="habit-status" aria-label="${done ? 'Completed' : 'Not completed'}">${done ? '✓' : '○'}</span></div>`).join('')}</article>`;
}

function renderProfile() {
  return `<h1 class="screen-title">Profile</h1><p class="screen-subtitle">Your personal wellness space.</p>
    <article class="card profile-card"><div class="profile-avatar">${escapeHtml((data.username || 'N').charAt(0).toUpperCase())}</div><div><strong>${escapeHtml(data.username || 'NutriFit member')}</strong><p>NutriFit Daily member</p></div></article>
    <h2 class="section-heading">Personal details</h2><article class="card tracker-card"><form id="profileForm" class="tracker-form"><label class="field-label" for="profileName">Your name</label><input id="profileName" name="name" type="text" maxlength="32" value="${escapeHtml(data.username)}" required><button class="button button-primary" type="submit">Save profile</button></form></article>
    <h2 class="section-heading">About</h2><article class="card about-copy"><strong style="color:var(--ink)">NutriFit Daily</strong><br>Nutrition, Weight &amp; Activity Tracker<br><br>Your everyday companion for mindful meals, movement, hydration, and personal progress. Your information is stored on this device and works offline after the app has been opened once online.</article>
    <h2 class="section-heading">Your data</h2><button class="button button-danger" type="button" data-action="reset-all" style="width:100%">Reset all data</button>`;
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

const pages = { home: renderHome, nutrition: renderNutrition, water: renderWater, activity: renderActivity, progress: renderProgress, profile: renderProfile, weight: renderWeight };

function renderPage() {
  const render = pages[activePage] || renderHome;
  screenContent.innerHTML = render();
  document.querySelectorAll('.nav-item').forEach((button) => {
    const isActive = button.dataset.nav === activePage || (activePage === 'weight' && button.dataset.nav === 'home');
    button.classList.toggle('is-active', isActive);
    if (isActive) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.getElementById('avatarInitial').textContent = (data.username || 'N').charAt(0).toUpperCase();
}

function navigate(page) {
  if (!pages[page]) return;
  activePage = page;
  renderPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function startApp() {
  splash.classList.add('is-hidden');
  window.setTimeout(() => { splash.hidden = true; }, 380);
  app.hidden = false;
  if (data.username) {
    mainScreen.hidden = false;
    welcomeScreen.hidden = true;
    renderPage();
  } else {
    welcomeScreen.hidden = false;
    mainScreen.hidden = true;
  }
}

document.getElementById('welcomeForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = new FormData(event.currentTarget).get('name').trim();
  if (!name) return;
  data.username = name;
  saveData();
  welcomeScreen.hidden = true;
  mainScreen.hidden = false;
  navigate('home');
});

document.addEventListener('click', (event) => {
  const navButton = event.target.closest('[data-nav]');
  if (navButton) {
    event.preventDefault();
    navigate(navButton.dataset.nav);
    return;
  }
  const card = event.target.closest('[data-card-nav]');
  if (card) {
    navigate(card.dataset.cardNav);
    return;
  }
  const waterButton = event.target.closest('[data-water]');
  if (waterButton) {
    const daily = todayData();
    daily.water += Number(waterButton.dataset.water);
    saveData();
    renderPage();
    showToast(`${Number(waterButton.dataset.water)} ml added`);
    return;
  }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'reset-water') {
    if (window.confirm("Reset today's water intake?")) {
      todayData().water = 0;
      saveData();
      renderPage();
      showToast('Water intake reset');
    }
  }
  if (action === 'reset-all' && window.confirm('This will permanently delete your profile, meals, weight history, water, and activities. Continue?')) {
    localStorage.removeItem(STORAGE_KEY);
    data = createInitialData();
    activePage = 'home';
    mainScreen.hidden = true;
    welcomeScreen.hidden = false;
    document.getElementById('welcomeName').value = '';
    showToast('All app data has been reset');
  }
});

document.addEventListener('keydown', (event) => {
  const card = event.target.closest('[data-card-nav]');
  if (card && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    navigate(card.dataset.cardNav);
  }
});

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.id === 'mealForm') {
    event.preventDefault();
    const values = new FormData(form);
    data.meals.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), date: todayKey(), type: values.get('type'), food: values.get('food').trim(), calories: Number(values.get('calories')) });
    saveData();
    renderPage();
    showToast('Meal added to your day');
  }
  if (form.id === 'weightForm') {
    event.preventDefault();
    const weight = Number(new FormData(form).get('weight'));
    data.weightHistory.unshift({ date: todayKey(), weight: Math.round(weight * 10) / 10 });
    saveData();
    renderPage();
    showToast('Weight saved');
  }
  if (form.id === 'activityForm') {
    event.preventDefault();
    const values = new FormData(form);
    todayData().activities.push({ type: values.get('type'), minutes: Number(values.get('minutes')), steps: Number(values.get('steps')), date: todayKey() });
    saveData();
    renderPage();
    showToast('Activity saved');
  }
  if (form.id === 'profileForm') {
    event.preventDefault();
    data.username = new FormData(form).get('name').trim();
    saveData();
    renderPage();
    showToast('Profile updated');
  }
});

window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) {
    data = loadData();
    if (!data.username) startApp();
    else if (!mainScreen.hidden) renderPage();
  }
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => showToast('Offline setup could not start. Refresh while online.')));
}

window.setTimeout(startApp, 1300);