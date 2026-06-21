const API_BASE = 'http://localhost:3001/api';

function getAuth() {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');
  return { token, userId, username };
}

function requireAuth() {
  const { token } = getAuth();
  if (!token) {
    window.location.href = 'login.html';
  }
}

function displayUsername() {
  const { username } = getAuth();
  const el = document.getElementById('usernameDisplay');
  if (el && username) {
    el.textContent = username;
  }
}

async function fetchRecommendations() {
  const { token, userId } = getAuth();
  if (!token || !userId) return;

  const loadingEl = document.getElementById('loadingIndicator');
  const errorEl = document.getElementById('errorDisplay');
  const errorMsg = document.getElementById('errorMessage');
  const cardGrid = document.getElementById('cardGrid');

  loadingEl.style.display = 'block';
  errorEl.style.display = 'none';
  cardGrid.innerHTML = '';

  try {
    const res = await fetch(`${API_BASE}/recommend/daily/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      throw new Error(`请求失败 (${res.status})`);
    }

    const data = await res.json();
    renderCards(data.recipes);
  } catch (err) {
    errorMsg.textContent = err.message || '获取推荐失败，请稍后重试';
    errorEl.style.display = 'block';
  } finally {
    loadingEl.style.display = 'none';
  }
}

function getStars(difficulty) {
  const map = { easy: 1, medium: 2, hard: 3 };
  const count = map[difficulty] || 1;
  return '⭐'.repeat(count);
}

function getCostLabel(cost) {
  const map = { low: '低', medium: '中', high: '高' };
  return map[cost] || cost;
}

function renderCards(recipes) {
  const cardGrid = document.getElementById('cardGrid');
  cardGrid.innerHTML = '';

  if (!recipes || recipes.length === 0) {
    cardGrid.innerHTML = '<p style="text-align:center;color:#999;padding:48px 0;">暂无推荐菜谱</p>';
    return;
  }

  for (const r of recipes) {
    const card = document.createElement('div');
    card.className = 'card';

    card.innerHTML = `
      <div class="card-body">
        <h3 class="card-title">${r.name}</h3>
        <div class="card-info">
          <span class="tag tag-cuisine">${r.cuisine}</span>
          <span class="tag tag-flavor">${r.flavor}</span>
          ${r.season ? `<span class="tag tag-season">${r.season}</span>` : ''}
        </div>
        <div class="card-meta">
          <span>${getStars(r.difficulty)}</span>
          <span>🕐 ${r.duration} 分钟</span>
          <span>💰 ${getCostLabel(r.cost)}</span>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn-detail" data-id="${r.id}">查看详情</button>
      </div>
    `;

    cardGrid.appendChild(card);
  }
}

function initDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  document.getElementById('dateDisplay').textContent = `${y} 年 ${m} 月 ${d} 日`;
}

function searchByIngredients() {
  const input = document.getElementById('ingredientInput');
  const query = input.value.trim();
  if (!query) return;

  const { token } = getAuth();
  const loadingEl = document.getElementById('loadingIndicator');
  const errorEl = document.getElementById('errorDisplay');
  const errorMsg = document.getElementById('errorMessage');
  const cardGrid = document.getElementById('cardGrid');

  loadingEl.style.display = 'block';
  errorEl.style.display = 'none';
  cardGrid.innerHTML = '';

  switchView('home');

  fetch(`${API_BASE}/recommend/by-ingredients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ingredients: query })
  })
    .then(r => {
      if (!r.ok) throw new Error('搜索失败');
      return r.json();
    })
    .then(data => {
      loadingEl.style.display = 'none';
      renderCards(data.recipes);
    })
    .catch(err => {
      loadingEl.style.display = 'none';
      errorMsg.textContent = err.message || '搜索失败，请稍后重试';
      errorEl.style.display = 'block';
    });
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  window.location.href = 'login.html';
}

let currentRecipeId = null;
let selectedRating = 0;

function showRecipeInModal(recipe) {
  currentRecipeId = recipe.id;
  selectedRating = 0;
  resetStars();
  document.getElementById('feedbackComment').value = '';

  document.getElementById('recipeName').textContent = recipe.name;

  const tags = document.getElementById('recipeTags');
  tags.innerHTML = [
    recipe.cuisine && `<span class="tag tag-cuisine">${recipe.cuisine}</span>`,
    recipe.flavor && `<span class="tag tag-flavor">${recipe.flavor}</span>`,
    recipe.season && `<span class="tag tag-season">${recipe.season}</span>`
  ].filter(Boolean).join('');

  document.getElementById('recipeMeta').innerHTML = `
    <span>${getStars(recipe.difficulty)}</span>
    <span>🕐 ${recipe.duration} 分钟</span>
    <span>💰 ${getCostLabel(recipe.cost)}</span>
  `;

  const ingList = document.getElementById('ingredientList');
  ingList.innerHTML = (recipe.ingredients || []).map(i =>
    `<li>${i.name}${i.quantity ? ` — ${i.quantity} ${i.unit || ''}` : ''}${i.calories ? `（${i.calories} kcal）` : ''}</li>`
  ).join('') || '<li>暂无食材信息</li>';

  const stepList = document.getElementById('stepList');
  stepList.innerHTML = (recipe.steps || []).map(s =>
    `<li>${s}</li>`
  ).join('') || '<li>暂无步骤信息</li>';

  document.getElementById('modalLoading').style.display = 'none';
  document.getElementById('modalContent').style.display = 'block';

  loadFeedback(recipe.id);
}

function openDetail(recipeId) {
  document.getElementById('modalOverlay').style.display = 'flex';
  document.getElementById('modalLoading').style.display = 'block';
  document.getElementById('modalContent').style.display = 'none';
  document.getElementById('feedbackList').innerHTML = '';

  const { token } = getAuth();
  fetch(`${API_BASE}/recipes/${recipeId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(r => r.json())
    .then(recipe => showRecipeInModal(recipe))
    .catch(() => {
      document.getElementById('modalLoading').innerHTML = '<p style="color:#e74c3c;">加载失败，请稍后重试</p>';
    });
}

function fetchRandomRecipe() {
  document.getElementById('modalOverlay').style.display = 'flex';
  document.getElementById('modalLoading').style.display = 'block';
  document.getElementById('modalContent').style.display = 'none';
  document.getElementById('feedbackList').innerHTML = '';

  const { token } = getAuth();
  fetch(`${API_BASE}/recommend/random`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(r => {
      if (!r.ok) throw new Error('No recipe found');
      return r.json();
    })
    .then(recipe => showRecipeInModal(recipe))
    .catch(() => {
      document.getElementById('modalLoading').innerHTML = '<p style="color:#e74c3c;">没有找到菜谱</p>';
    });
}

function closeDetail() {
  document.getElementById('modalOverlay').style.display = 'none';
}

function resetStars() {
  selectedRating = 0;
  document.querySelectorAll('.star').forEach(el => el.classList.remove('active'));
}

function loadFeedback(recipeId) {
  fetch(`${API_BASE}/feedback/${recipeId}`)
    .then(r => r.json())
    .then(list => {
      const container = document.getElementById('feedbackList');
      if (!list || list.length === 0) {
        container.innerHTML = '<p class="feedback-empty">暂无评价，快来写第一条吧</p>';
        return;
      }
      container.innerHTML = list.map(f =>
        `<div class="feedback-item">
          <div class="feedback-item-header">
            <span class="feedback-user">${f.username}</span>
            <span class="feedback-stars">${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)}</span>
            <span class="feedback-time">${formatTime(f.created_at)}</span>
          </div>
          ${f.comment ? `<p class="feedback-comment">${f.comment}</p>` : ''}
        </div>`
      ).join('');
    })
    .catch(() => {
      document.getElementById('feedbackList').innerHTML = '<p style="color:#999;">加载评价失败</p>';
    });
}

let currentView = 'home';

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  document.getElementById('cardGrid').style.display = view === 'home' ? '' : 'none';
  document.getElementById('historySection').style.display = view === 'history' ? '' : 'none';
  if (view === 'history') fetchHistory();
}

function getDateLabel(dateStr) {
  const today = new Date();
  const d = new Date(dateStr);
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  if (dateStr === todayStr) return '今天';
  if (dateStr === yesterdayStr) return '昨天';
  return '更早';
}

function fetchHistory() {
  const { token, userId } = getAuth();
  if (!token || !userId) return;

  const loading = document.getElementById('historyLoading');
  const content = document.getElementById('historyContent');

  loading.style.display = 'block';
  content.innerHTML = '';

  fetch(`${API_BASE}/history/${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(r => r.json())
    .then(list => {
      loading.style.display = 'none';
      if (!list || list.length === 0) {
        content.innerHTML = '<div class="history-empty">📭 还没有历史记录，快去探索美食吧！</div>';
        return;
      }

      const grouped = {};
      for (const item of list) {
        const label = getDateLabel(item.recommend_date);
        if (!grouped[label]) grouped[label] = [];
        grouped[label].push(item);
      }

      let html = '';
      const order = ['今天', '昨天', '更早'];
      for (const key of order) {
        if (!grouped[key]) continue;
        html += `<div class="history-group"><h3 class="history-group-title">${key}</h3>`;
        for (const item of grouped[key]) {
          const status = item.is_adopted
            ? '<span class="tag tag-adopted">✅ 已吃</span>'
            : '<span class="tag tag-pending">⏳ 待品尝</span>';
          html += `<div class="history-item">
            <div class="history-item-left">
              <span class="history-recipe-name" data-id="${item.recipe_id}">${item.recipe_name}</span>
            </div>
            <div class="history-item-right">${status}</div>
          </div>`;
        }
        html += '</div>';
      }
      content.innerHTML = html;

      content.querySelectorAll('.history-recipe-name').forEach(el => {
        el.addEventListener('click', () => openDetail(el.dataset.id));
      });
    })
    .catch(() => {
      loading.style.display = 'none';
      content.innerHTML = '<div class="history-empty" style="color:#e74c3c;">加载失败，请稍后重试</div>';
    });
}

function formatTime(dateStr) {
  try {
    const d = new Date(dateStr);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return dateStr;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  displayUsername();
  initDate();

  document.getElementById('fetchRecommendBtn').addEventListener('click', fetchRecommendations);
  document.getElementById('randomExploreBtn').addEventListener('click', fetchRandomRecipe);
  document.getElementById('randomSwitchBtn').addEventListener('click', fetchRandomRecipe);
  document.getElementById('logoutBtn').addEventListener('click', logout);

  document.getElementById('ingredientSearchBtn').addEventListener('click', searchByIngredients);
  document.getElementById('ingredientInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchByIngredients();
  });

  document.getElementById('navHome').addEventListener('click', () => switchView('home'));
  document.getElementById('navHistory').addEventListener('click', () => switchView('history'));

  document.getElementById('cardGrid').addEventListener('click', e => {
    const btn = e.target.closest('.btn-detail');
    if (btn) openDetail(btn.dataset.id);
  });

  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDetail();
  });

  document.getElementById('modalClose').addEventListener('click', closeDetail);

  document.getElementById('starRating').addEventListener('click', e => {
    const star = e.target.closest('.star');
    if (!star) return;
    selectedRating = parseInt(star.dataset.value);
    document.querySelectorAll('.star').forEach(el => {
      el.classList.toggle('active', parseInt(el.dataset.value) <= selectedRating);
    });
  });

  document.getElementById('submitFeedback').addEventListener('click', () => {
    const { token } = getAuth();
    if (!token) {
      alert('请先登录');
      return;
    }
    if (!selectedRating) {
      alert('请选择评分');
      return;
    }
    const comment = document.getElementById('feedbackComment').value.trim();
    fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ recipe_id: currentRecipeId, rating: selectedRating, comment: comment || null })
    })
      .then(r => {
        if (!r.ok) throw new Error('提交失败');
        return r.json();
      })
      .then(() => {
        resetStars();
        document.getElementById('feedbackComment').value = '';
        loadFeedback(currentRecipeId);
      })
      .catch(err => {
        alert('提交评价失败，请重试');
      });
  });
});
