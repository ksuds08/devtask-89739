const API_BASE = ""; // same origin

function getToken() {
  return localStorage.getItem("devtask_token");
}

function setToken(token) {
  if (token) {
    localStorage.setItem("devtask_token", token);
  } else {
    localStorage.removeItem("devtask_token");
  }
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = Object.assign(
    { "Content-Type": "application/json" },
    options.headers || {},
    token ? { Authorization: `Bearer ${token}` } : {}
  );

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const data = await res.json();
      message = data.detail || message;
    } catch (e) {}
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

// Auth flows
async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const errorEl = document.getElementById("login-error");
  errorEl.hidden = true;

  const payload = {
    email: form.email.value,
    password: form.password.value,
  };

  try {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setToken(data.access_token);
    window.location.href = "/static/dashboard.html";
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const form = e.target;
  const errorEl = document.getElementById("signup-error");
  errorEl.hidden = true;

  const payload = {
    email: form.email.value,
    password: form.password.value,
  };

  try {
    await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    // Auto-login after signup
    const login = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setToken(login.access_token);
    window.location.href = "/static/dashboard.html";
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
}

// Dashboard
async function loadTasks() {
  const listEl = document.getElementById("task-list");
  const statsEl = document.getElementById("task-stats");
  if (!listEl) return;

  try {
    const data = await apiRequest("/tasks");
    listEl.innerHTML = "";

    if (!data.items.length) {
      listEl.innerHTML = "<p>No tasks yet. Create your first one above.</p>";
      statsEl.textContent = "";
      return;
    }

    let totalHours = 0;
    let done = 0;

    data.items.forEach((task) => {
      totalHours += task.time_logged || 0;
      if (task.status === "done") done += 1;

      const row = document.createElement("div");
      row.className = "task-item";

      const title = document.createElement("div");
      title.className = "task-item-title";
      title.textContent = task.title;

      const status = document.createElement("div");
      const pill = document.createElement("span");
      pill.className = `task-status-pill task-status-${task.status}`;
      pill.textContent = task.status.replace("_", " ");
      status.appendChild(pill);

      const time = document.createElement("div");
      time.className = "task-item-meta";
      time.textContent = `${task.time_logged.toFixed(1)}h logged`;

      const actions = document.createElement("div");
      actions.className = "task-actions";
      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-ghost";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", async () => {
        if (!confirm("Delete this task?")) return;
        await apiRequest(`/tasks/${task.id}`, { method: "DELETE" });
        loadTasks();
      });
      actions.appendChild(delBtn);

      row.appendChild(title);
      row.appendChild(status);
      row.appendChild(time);
      row.appendChild(actions);

      listEl.appendChild(row);
    });

    statsEl.textContent = `${data.items.length} tasks • ${done} completed • ${totalHours.toFixed(
      1
    )}h logged`;
  } catch (err) {
    listEl.innerHTML = `<p>${err.message}</p>`;
    statsEl.textContent = "";
  }
}

async function handleNewTask(e) {
  e.preventDefault();
  const form = e.target;

  const payload = {
    title: form.title.value,
    status: form.status.value,
    time_logged: form.time_logged.value ? parseFloat(form.time_logged.value) : 0,
  };

  await apiRequest("/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  form.reset();
  loadTasks();
}

function initAuthPages() {
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", handleSignup);
  }
}

function initDashboard() {
  const form = document.getElementById("new-task-form");
  if (form) {
    form.addEventListener("submit", handleNewTask);
    loadTasks();
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      setToken(null);
      window.location.href = "/";
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  initAuthPages();
  initDashboard();
});
