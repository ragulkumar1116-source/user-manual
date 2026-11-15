/**
 * Aadhav Intech - Hidden Engineer Administration Dashboard (engadmin.js)
 * Enterprise Portal - Engineer Management & Activity Monitoring Engine
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  push, 
  set, 
  get, 
  update, 
  remove, 
  onValue 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ============================================================================
// 1. FIREBASE CONFIGURATION & INITIALIZATION
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCfc7la06vL3yEN3vCZX5jctD4PjsEtK0g",
  authDomain: "aittest-9ec93.firebaseapp.com",
  databaseURL: "https://aittest-9ec93-default-rtdb.firebaseio.com",
  projectId: "aittest-9ec93",
  storageBucket: "aittest-9ec93.firebasestorage.app",
  messagingSenderId: "628576595149",
  appId: "1:628576595149:web:00905b7b299dc275524d84",
  measurementId: "G-8QH3YFRCR0"
};

let app = null;
let db = null;
let isFirebaseOnline = false;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  db = getDatabase(app);
  isFirebaseOnline = true;
} catch (err) {
  console.warn("Firebase initialization warning:", err);
  isFirebaseOnline = false;
}

// ============================================================================
// 2. STATE MANAGEMENT & CACHE
// ============================================================================
let engineersData = JSON.parse(localStorage.getItem('cached_admin_engineers') || '{}');
let reportsData = JSON.parse(localStorage.getItem('cached_reports') || '{}');

// Default initial engineers if database is clean
const defaultEngineers = {
  eng_ramesh: {
    id: "eng_ramesh",
    fullName: "Ramesh Kumar",
    username: "ramesh.ait",
    email: "ramesh@aadhavintech.com",
    phone: "9790030842",
    role: "Senior Service Engineer",
    assignedLocations: "Everest Industries, Podanur, Coimbatore",
    status: "active",
    lastLogin: "2026-10-16T10:30:00.000Z",
    lastActivity: "2026-10-16T11:45:00.000Z",
    reportsGenerated: 2,
    latestReportDate: "11/06/2026",
    salt: "s8df7g6sdf8g7",
    passwordHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", // 'password'
    createdAt: "2026-10-01T08:00:00.000Z",
    updatedAt: "2026-10-16T11:45:00.000Z"
  },
  eng_praveen: {
    id: "eng_praveen",
    fullName: "Praveen Raj",
    username: "praveen.ait",
    email: "praveen@aadhavintech.com",
    phone: "9944037958",
    role: "Commissioning Engineer",
    assignedLocations: "Adithya Techno Park, Ganga Hospital",
    status: "active",
    lastLogin: "2026-10-15T09:15:00.000Z",
    lastActivity: "2026-10-15T14:20:00.000Z",
    reportsGenerated: 2,
    latestReportDate: "22/08/2026",
    salt: "k3h4g5k3j4g5",
    passwordHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", // 'password'
    createdAt: "2026-10-01T08:00:00.000Z",
    updatedAt: "2026-10-15T14:20:00.000Z"
  }
};

// ============================================================================
// 3. CRYPTOGRAPHIC HELPERS (SHA-256 SALTED HASH)
// ============================================================================
async function hashPassword(plainText, salt) {
  const enc = new TextEncoder();
  const data = enc.encode(plainText + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateRandomSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSecurePassword(length = 8) {
  const charset = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
  let pw = "";
  for (let i = 0; i < length; i++) {
    pw += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return pw;
}

// ============================================================================
// 4. TOAST NOTIFICATIONS & CONFIRMATION HELPERS
// ============================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('admin-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `admin-toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span>${icon}</span>
      <span>${message}</span>
    </div>
    <button type="button" style="background:none; border:none; color:inherit; cursor:pointer; font-size:1.1rem; padding-left:8px;">&times;</button>
  `;

  toast.querySelector('button').addEventListener('click', () => toast.remove());
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function openConfirmModal(title, message, onProceed) {
  const modal = document.getElementById('modal-admin-confirm');
  const titleEl = document.getElementById('modal-admin-confirm-title');
  const msgEl = document.getElementById('modal-admin-confirm-msg');
  const btnProceed = document.getElementById('btn-action-admin-confirm');
  const btnCancel = document.getElementById('btn-cancel-admin-confirm');
  const btnClose = document.getElementById('btn-close-confirm-modal');

  titleEl.textContent = title;
  msgEl.textContent = message;
  modal.classList.add('active');

  const close = () => {
    modal.classList.remove('active');
    btnProceed.onclick = null;
  };

  btnProceed.onclick = () => {
    close();
    if (typeof onProceed === 'function') onProceed();
  };

  btnCancel.onclick = close;
  btnClose.onclick = close;
}

// ============================================================================
// 5. ADMIN AUTHENTICATION WALL & ACCESS GUARD
// ============================================================================
const modalAdminAuth = document.getElementById('modal-admin-auth');
const formAdminLogin = document.getElementById('form-admin-login');
const btnAdminLogout = document.getElementById('btn-admin-logout');

function checkAdminAuth() {
  const isAuth = sessionStorage.getItem('admin_authenticated') === 'true';
  if (!isAuth) {
    modalAdminAuth.classList.add('active');
  } else {
    modalAdminAuth.classList.remove('active');
  }
  return isAuth;
}

formAdminLogin?.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('admin-login-username').value.trim();
  const password = document.getElementById('admin-login-password').value;

  // Root Administrator Authorization
  // Supports admin / admin123 or any custom configured key in localStorage
  const validKey = localStorage.getItem('admin_custom_key') || 'admin123';
  if ((username.toLowerCase() === 'admin' || username.includes('admin')) && (password === validKey || password === 'admin123' || password === 'admin')) {
    sessionStorage.setItem('admin_authenticated', 'true');
    sessionStorage.setItem('admin_user_name', username);
    modalAdminAuth.classList.remove('active');
    document.getElementById('admin-login-password').value = '';
    showToast(`Welcome, Administrator!`, 'success');
  } else {
    showToast('Invalid administrator credentials.', 'error');
  }
});

btnAdminLogout?.addEventListener('click', () => {
  openConfirmModal(
    'Admin Sign Out',
    'Are you sure you want to end your administrative console session?',
    () => {
      sessionStorage.removeItem('admin_authenticated');
      checkAdminAuth();
      showToast('Signed out of admin session.', 'info');
    }
  );
});

document.getElementById('btn-exit-to-report-app')?.addEventListener('click', () => {
  window.location.href = 'index.html';
});
document.getElementById('btn-open-report-app')?.addEventListener('click', () => {
  window.location.href = 'index.html';
});

// Mobile menu toggle
const adminSidebar = document.getElementById('admin-sidebar');
document.getElementById('btn-toggle-sidebar')?.addEventListener('click', () => {
  adminSidebar.classList.toggle('open');
});

// ============================================================================
// 6. VIEW NAVIGATION TABS
// ============================================================================
const sidebarNavItems = document.querySelectorAll('.sidebar-nav-item[data-view]');
const viewSections = document.querySelectorAll('.admin-view-section');

function switchAdminView(targetViewId) {
  viewSections.forEach(section => {
    if (section.id === targetViewId) {
      section.classList.add('active');
    } else {
      section.classList.remove('active');
    }
  });

  sidebarNavItems.forEach(item => {
    if (item.getAttribute('data-view') === targetViewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  if (window.innerWidth <= 900) {
    adminSidebar.classList.remove('open');
  }

  // Refresh view specific data
  if (targetViewId === 'view-dash-overview') renderDashboardOverview();
  if (targetViewId === 'view-engineers-manage') renderEngineersTable();
  if (targetViewId === 'view-activity-monitor') renderActivityTable();
  if (targetViewId === 'view-report-monitor') renderReportAuditTable();
}

sidebarNavItems.forEach(item => {
  item.addEventListener('click', () => {
    const targetId = item.getAttribute('data-view');
    switchAdminView(targetId);
  });
});

document.getElementById('btn-dash-add-eng')?.addEventListener('click', () => openEngineerModal());
document.getElementById('btn-add-engineer-modal')?.addEventListener('click', () => openEngineerModal());
document.getElementById('btn-see-all-activity')?.addEventListener('click', () => switchAdminView('view-activity-monitor'));

// ============================================================================
// 7. ENGINEER ACCOUNT MANAGEMENT (ADD, EDIT, DISABLE, RESET PW)
// ============================================================================
const modalEngineer = document.getElementById('modal-engineer');
const formEngineer = document.getElementById('form-engineer');
const btnCloseEngModal = document.getElementById('btn-close-engineer-modal');
const btnCancelEngModal = document.getElementById('btn-cancel-engineer-modal');
const btnGeneratePw = document.getElementById('btn-generate-password');
const groupInitialPw = document.getElementById('group-initial-password');

function openEngineerModal(engineerId = null) {
  const titleEl = document.getElementById('modal-engineer-title');
  const idInput = document.getElementById('modal-eng-id');
  const pwInput = document.getElementById('eng-password');

  if (engineerId && engineersData[engineerId]) {
    const eng = engineersData[engineerId];
    titleEl.textContent = 'Edit Engineer Account';
    idInput.value = engineerId;
    document.getElementById('eng-full-name').value = eng.fullName || '';
    document.getElementById('eng-username').value = eng.username || '';
    document.getElementById('eng-email').value = eng.email || '';
    document.getElementById('eng-phone').value = eng.phone || '';
    document.getElementById('eng-role').value = eng.role || 'Field Service Engineer';
    document.getElementById('eng-status').value = eng.status || 'active';
    document.getElementById('eng-locations').value = eng.assignedLocations || '';
    groupInitialPw.style.display = 'none'; // Password updated via dedicated reset modal
    pwInput.removeAttribute('required');
  } else {
    titleEl.textContent = 'Add New Engineer Account';
    idInput.value = '';
    formEngineer.reset();
    groupInitialPw.style.display = 'block';
    pwInput.setAttribute('required', 'required');
    pwInput.value = generateSecurePassword(8);
  }

  modalEngineer.classList.add('active');
}

function closeEngineerModal() {
  modalEngineer.classList.remove('active');
  formEngineer.reset();
}

btnGeneratePw?.addEventListener('click', () => {
  document.getElementById('eng-password').value = generateSecurePassword(8);
});

btnCloseEngModal?.addEventListener('click', closeEngineerModal);
btnCancelEngModal?.addEventListener('click', closeEngineerModal);

formEngineer?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const idInput = document.getElementById('modal-eng-id').value.trim();
  const fullName = document.getElementById('eng-full-name').value.trim();
  const username = document.getElementById('eng-username').value.trim().toLowerCase();
  const email = document.getElementById('eng-email').value.trim();
  const phone = document.getElementById('eng-phone').value.trim();
  const role = document.getElementById('eng-role').value.trim();
  const status = document.getElementById('eng-status').value;
  const assignedLocations = document.getElementById('eng-locations').value.trim();
  const plainPassword = document.getElementById('eng-password')?.value || '';

  // Check unique username for new accounts
  if (!idInput) {
    const isDuplicate = Object.values(engineersData).some(
      eng => (eng.username || '').toLowerCase() === username
    );
    if (isDuplicate) {
      showToast(`Username "${username}" is already taken. Please choose another.`, 'warning');
      return;
    }
  }

  const engineerId = idInput || `eng_${Date.now()}`;
  let salt = idInput ? engineersData[idInput]?.salt : generateRandomSalt();
  let passwordHash = idInput ? engineersData[idInput]?.passwordHash : '';

  if (!idInput && plainPassword) {
    passwordHash = await hashPassword(plainPassword, salt);
  }

  const payload = {
    id: engineerId,
    fullName,
    username,
    email,
    phone,
    role,
    status,
    assignedLocations,
    salt,
    passwordHash,
    reportsGenerated: idInput ? (engineersData[idInput]?.reportsGenerated || 0) : 0,
    lastLogin: idInput ? (engineersData[idInput]?.lastLogin || '-') : '-',
    lastActivity: idInput ? (engineersData[idInput]?.lastActivity || '-') : new Date().toISOString(),
    latestReportDate: idInput ? (engineersData[idInput]?.latestReportDate || '-') : '-',
    updatedAt: new Date().toISOString()
  };

  if (!idInput) {
    payload.createdAt = new Date().toISOString();
  }

  // Save to local cache
  engineersData[engineerId] = payload;
  localStorage.setItem('cached_admin_engineers', JSON.stringify(engineersData));

  // Save to Firebase under `customers/_engineers` (and mirror to `engineers`)
  if (isFirebaseOnline && db) {
    try {
      await set(ref(db, `customers/_engineers/${engineerId}`), payload);
      set(ref(db, `engineers/${engineerId}`), payload).catch(() => {});
      showToast(`Engineer "${fullName}" saved successfully!`, 'success');
    } catch (err) {
      console.warn("Cloud save notice:", err);
      showToast(`Saved to local cache. Syncing on reconnect.`, 'warning');
    }
  } else {
    showToast(`Saved to local cache.`, 'success');
  }

  closeEngineerModal();
  renderEngineersTable();
  renderDashboardOverview();

  // If a new account was created with a password, remind the admin to copy it
  if (!idInput && plainPassword) {
    openConfirmModal(
      'Account Created - Temporary Password',
      `Engineer "${fullName}" (Username: ${username}) created successfully.\nInitial Password: ${plainPassword}\nPlease share this securely with the engineer.`,
      () => {}
    );
  }
});

// Toggle Active / Disabled
window.toggleEngineerStatus = function(engineerId) {
  const eng = engineersData[engineerId];
  if (!eng) return;

  const isDisabling = eng.status === 'active';
  const newStatus = isDisabling ? 'disabled' : 'active';
  const actionText = isDisabling ? 'deactivate / disable' : 'activate';

  openConfirmModal(
    `${isDisabling ? 'Disable' : 'Activate'} Engineer Account`,
    `Are you sure you want to ${actionText} "${eng.fullName}" (${eng.username})? ${isDisabling ? 'They will no longer be able to submit reports.' : 'They will regain portal access.'}`,
    async () => {
      eng.status = newStatus;
      eng.updatedAt = new Date().toISOString();
      engineersData[engineerId] = eng;
      localStorage.setItem('cached_admin_engineers', JSON.stringify(engineersData));

      if (isFirebaseOnline && db) {
        try {
          await update(ref(db, `customers/_engineers/${engineerId}`), { status: newStatus, updatedAt: eng.updatedAt });
          update(ref(db, `engineers/${engineerId}`), { status: newStatus, updatedAt: eng.updatedAt }).catch(() => {});
          showToast(`Account for "${eng.fullName}" is now ${newStatus.toUpperCase()}.`, 'info');
        } catch (e) {
          console.warn(e);
        }
      }
      renderEngineersTable();
      renderDashboardOverview();
      renderActivityTable();
    }
  );
};

// Reset Password Modal
const modalResetPw = document.getElementById('modal-reset-pw');
const formResetPw = document.getElementById('form-reset-pw');
const btnCloseResetModal = document.getElementById('btn-close-reset-modal');
const btnCancelResetModal = document.getElementById('btn-cancel-reset-modal');
const btnGenResetPw = document.getElementById('btn-gen-reset-pw');

window.openResetPasswordModal = function(engineerId) {
  const eng = engineersData[engineerId];
  if (!eng) return;

  document.getElementById('reset-eng-id').value = engineerId;
  document.getElementById('reset-eng-name-label').textContent = `${eng.fullName} (${eng.username})`;
  document.getElementById('reset-new-password').value = generateSecurePassword(8);

  modalResetPw.classList.add('active');
};

btnCloseResetModal?.addEventListener('click', () => modalResetPw.classList.remove('active'));
btnCancelResetModal?.addEventListener('click', () => modalResetPw.classList.remove('active'));
btnGenResetPw?.addEventListener('click', () => {
  document.getElementById('reset-new-password').value = generateSecurePassword(8);
});

formResetPw?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const engineerId = document.getElementById('reset-eng-id').value;
  const newPw = document.getElementById('reset-new-password').value.trim();

  if (!engineerId || !engineersData[engineerId] || !newPw) return;

  const eng = engineersData[engineerId];
  const salt = generateRandomSalt();
  const passwordHash = await hashPassword(newPw, salt);

  eng.salt = salt;
  eng.passwordHash = passwordHash;
  eng.updatedAt = new Date().toISOString();

  engineersData[engineerId] = eng;
  localStorage.setItem('cached_admin_engineers', JSON.stringify(engineersData));

  if (isFirebaseOnline && db) {
    try {
      await update(ref(db, `customers/_engineers/${engineerId}`), {
        salt,
        passwordHash,
        updatedAt: eng.updatedAt
      });
      update(ref(db, `engineers/${engineerId}`), { salt, passwordHash, updatedAt: eng.updatedAt }).catch(() => {});
      showToast(`Password updated for "${eng.fullName}"!`, 'success');
    } catch (e) {
      console.warn(e);
    }
  }

  modalResetPw.classList.remove('active');

  openConfirmModal(
    'Password Reset Complete',
    `New password for ${eng.fullName}: "${newPw}"\nPlease share this credential securely with the engineer.`,
    () => {}
  );
});

// Delete Engineer Account
window.confirmDeleteEngineer = function(engineerId) {
  const eng = engineersData[engineerId];
  if (!eng) return;

  openConfirmModal(
    'Delete Engineer Account',
    `Are you sure you want to permanently delete "${eng.fullName}" (${eng.username})? This action cannot be reversed.`,
    async () => {
      delete engineersData[engineerId];
      localStorage.setItem('cached_admin_engineers', JSON.stringify(engineersData));

      if (isFirebaseOnline && db) {
        try {
          await remove(ref(db, `customers/_engineers/${engineerId}`));
          remove(ref(db, `engineers/${engineerId}`)).catch(() => {});
          showToast(`Engineer "${eng.fullName}" deleted.`, 'info');
        } catch (e) {
          console.warn(e);
        }
      }
      renderEngineersTable();
      renderDashboardOverview();
      renderActivityTable();
    }
  );
};

window.editEngineer = function(engineerId) {
  openEngineerModal(engineerId);
};

// ============================================================================
// 8. DATA RENDERING: DASHBOARD, DIRECTORY, ACTIVITY, REPORTS
// ============================================================================
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(isoStr) {
  if (!isoStr || isoStr === '-') return '-';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return isoStr;
  }
}

// Compute dynamic report counts per engineer
function computeEngineerReportStats() {
  const reportsList = Object.values(reportsData);
  const engineersList = Object.values(engineersData);

  engineersList.forEach(eng => {
    // Match reports by engineer username or engineer name in report details
    const myReports = reportsList.filter(r => 
      (r.engineerUsername && r.engineerUsername.toLowerCase() === (eng.username || '').toLowerCase()) ||
      (r.engineerName && r.engineerName.toLowerCase().includes((eng.fullName || '').toLowerCase())) ||
      (r.contactPerson && r.contactPerson.toLowerCase().includes((eng.fullName || '').toLowerCase()))
    );

    eng.reportsGenerated = myReports.length;

    if (myReports.length > 0) {
      // Find latest report date
      const sorted = [...myReports].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
      eng.latestReportDate = sorted[0].serviceDate || sorted[0].date || '-';
      eng.lastActivity = sorted[0].updatedAt || sorted[0].createdAt || eng.lastActivity;
    }
  });
}

function renderDashboardOverview() {
  computeEngineerReportStats();

  const engineersList = Object.values(engineersData);
  const activeCount = engineersList.filter(e => e.status === 'active').length;
  const disabledCount = engineersList.filter(e => e.status === 'disabled').length;

  const reportsList = Object.values(reportsData);
  const curMonth = new Date().toISOString().slice(0, 7);
  const monthReports = reportsList.filter(r => (r.createdAt || r.updatedAt || '').startsWith(curMonth)).length;

  // Update KPI counters
  document.getElementById('metric-total-engineers').textContent = engineersList.length;
  document.getElementById('metric-active-engineers').textContent = activeCount;
  document.getElementById('metric-disabled-engineers').textContent = disabledCount;
  document.getElementById('metric-total-reports').textContent = reportsList.length;
  document.getElementById('metric-month-reports').textContent = monthReports;

  document.getElementById('badge-nav-engineers').textContent = engineersList.length;
  document.getElementById('badge-nav-reports').textContent = reportsList.length;

  // Recent Engineers Preview Table
  const tbody = document.getElementById('tbody-dash-engineers-preview');
  if (tbody) {
    if (engineersList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:24px;">No engineers registered yet. Click "Add New Engineer" to get started.</td></tr>`;
    } else {
      tbody.innerHTML = engineersList.slice(0, 5).map(e => `
        <tr>
          <td>
            <div style="font-weight:700; color:#ffffff;">${escapeHtml(e.fullName)}</div>
            <div style="font-size:0.75rem; color:var(--primary);">@${escapeHtml(e.username)}</div>
          </td>
          <td>
            <span class="badge-pill ${e.status === 'active' ? 'badge-active' : 'badge-disabled'}">
              ${e.status === 'active' ? '🟢 Active' : '🔴 Disabled'}
            </span>
          </td>
          <td style="max-width:240px; font-size:0.78rem;">
            ${escapeHtml(e.assignedLocations || 'General Service')}
          </td>
          <td style="font-size:0.78rem; color:var(--text-muted);">
            ${formatDate(e.lastActivity)}
          </td>
          <td style="font-weight:700; color:var(--primary);">
            ${e.reportsGenerated || 0}
          </td>
          <td style="text-align:right;">
            <button type="button" class="btn btn-xs btn-outline" onclick="editEngineer('${e.id}')">Edit</button>
            <button type="button" class="btn btn-xs ${e.status === 'active' ? 'btn-danger' : 'btn-secondary'}" onclick="toggleEngineerStatus('${e.id}')">
              ${e.status === 'active' ? 'Disable' : 'Activate'}
            </button>
          </td>
        </tr>
      `).join('');
    }
  }
}

function renderEngineersTable() {
  computeEngineerReportStats();

  const tbody = document.getElementById('tbody-engineers-full');
  const searchVal = (document.getElementById('input-search-engineers')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('select-status-filter')?.value || 'all';
  const countBadge = document.getElementById('engineers-count-summary');

  if (!tbody) return;

  let list = Object.values(engineersData);

  if (statusFilter === 'active') list = list.filter(e => e.status === 'active');
  if (statusFilter === 'disabled') list = list.filter(e => e.status === 'disabled');

  if (searchVal) {
    list = list.filter(e => 
      (e.fullName || '').toLowerCase().includes(searchVal) ||
      (e.username || '').toLowerCase().includes(searchVal) ||
      (e.email || '').toLowerCase().includes(searchVal) ||
      (e.phone || '').toLowerCase().includes(searchVal) ||
      (e.assignedLocations || '').toLowerCase().includes(searchVal)
    );
  }

  list.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));

  if (countBadge) countBadge.textContent = `${list.length} Engineers`;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:32px;">No matching engineers found.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(e => `
    <tr>
      <td>
        <div style="font-weight:700; color:#ffffff;">${escapeHtml(e.fullName)}</div>
        <div style="font-size:0.72rem; color:var(--text-muted);">${escapeHtml(e.role || 'Service Engineer')}</div>
      </td>
      <td>
        <div style="font-family:monospace; color:var(--primary); font-weight:600;">@${escapeHtml(e.username)}</div>
      </td>
      <td>
        <div>${escapeHtml(e.phone || '-')}</div>
        <div style="font-size:0.72rem; color:var(--text-muted);">${escapeHtml(e.email || '')}</div>
      </td>
      <td style="max-width:240px; font-size:0.78rem;">
        ${escapeHtml(e.assignedLocations || 'General')}
      </td>
      <td>
        <span class="badge-pill ${e.status === 'active' ? 'badge-active' : 'badge-disabled'}">
          ${e.status === 'active' ? '🟢 Active' : '🔴 Disabled'}
        </span>
      </td>
      <td>
        <strong style="color:var(--primary);">${e.reportsGenerated || 0}</strong>
      </td>
      <td style="text-align:right; white-space:nowrap;">
        <button type="button" class="btn btn-xs btn-secondary" onclick="editEngineer('${e.id}')" title="Edit Profile">
          ✏️ Edit
        </button>
        <button type="button" class="btn btn-xs btn-outline" onclick="openResetPasswordModal('${e.id}')" title="Reset Password">
          🔑 Password
        </button>
        <button type="button" class="btn btn-xs ${e.status === 'active' ? 'btn-outline' : 'btn-primary'}" onclick="toggleEngineerStatus('${e.id}')" title="${e.status === 'active' ? 'Disable Account' : 'Activate Account'}">
          ${e.status === 'active' ? '🚫' : '✅'}
        </button>
        <button type="button" class="btn btn-xs btn-danger" onclick="confirmDeleteEngineer('${e.id}')" title="Delete Account">
          🗑️
        </button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('input-search-engineers')?.addEventListener('input', renderEngineersTable);
document.getElementById('select-status-filter')?.addEventListener('change', renderEngineersTable);

// Activity Monitoring Table
function renderActivityTable() {
  computeEngineerReportStats();

  const tbody = document.getElementById('tbody-activity-full');
  const searchVal = (document.getElementById('input-search-activity')?.value || '').toLowerCase();

  if (!tbody) return;

  let list = Object.values(engineersData);

  if (searchVal) {
    list = list.filter(e => 
      (e.fullName || '').toLowerCase().includes(searchVal) ||
      (e.username || '').toLowerCase().includes(searchVal) ||
      (e.assignedLocations || '').toLowerCase().includes(searchVal)
    );
  }

  list.sort((a, b) => new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0));

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:32px;">No activity logs found.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(e => `
    <tr>
      <td>
        <div style="font-weight:700; color:#ffffff;">${escapeHtml(e.fullName)}</div>
        <div style="font-size:0.72rem; color:var(--primary);">@${escapeHtml(e.username)}</div>
      </td>
      <td>
        <span class="badge-pill ${e.status === 'active' ? 'badge-active' : 'badge-disabled'}">
          ${e.status === 'active' ? '🟢 Active' : '🔴 Disabled'}
        </span>
      </td>
      <td style="font-size:0.78rem;">${formatDate(e.lastLogin)}</td>
      <td style="font-size:0.78rem; color:var(--primary); font-weight:600;">${formatDate(e.lastActivity)}</td>
      <td><strong style="color:#ffffff;">${e.reportsGenerated || 0}</strong></td>
      <td style="font-size:0.78rem;">${escapeHtml(e.latestReportDate || '-')}</td>
      <td style="max-width:240px; font-size:0.78rem;">${escapeHtml(e.assignedLocations || 'General')}</td>
    </tr>
  `).join('');
}

document.getElementById('input-search-activity')?.addEventListener('input', renderActivityTable);

// Report Audit Table
function renderReportAuditTable() {
  const tbody = document.getElementById('tbody-reports-audit');
  const searchVal = (document.getElementById('input-search-reports-audit')?.value || '').toLowerCase();
  const countBadge = document.getElementById('reports-audit-count');

  if (!tbody) return;

  let list = Object.values(reportsData);

  if (searchVal) {
    list = list.filter(r => 
      (r.reportNumber || '').toLowerCase().includes(searchVal) ||
      (r.custName || r.companyName || '').toLowerCase().includes(searchVal) ||
      (r.instName || '').toLowerCase().includes(searchVal) ||
      (r.engineerUsername || '').toLowerCase().includes(searchVal)
    );
  }

  list.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  if (countBadge) countBadge.textContent = `${list.length} Reports Logged`;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:32px;">No service reports logged yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(r => `
    <tr>
      <td><strong style="color:var(--primary);">${escapeHtml(r.reportNumber || r.id)}</strong></td>
      <td>${escapeHtml(r.serviceDate || r.date || '-')}</td>
      <td><strong>${escapeHtml(r.custName || r.companyName || '-')}</strong></td>
      <td>${escapeHtml(r.instName || '-')} ${escapeHtml(r.instModel ? `(${r.instModel})` : '')}</td>
      <td>
        <span style="color:var(--primary); font-weight:600;">
          ${escapeHtml(r.engineerUsername ? `@${r.engineerUsername}` : (r.engineerName || 'Service Team'))}
        </span>
      </td>
      <td><span class="badge-pill badge-location">${escapeHtml(r.reportType || 'SERVICE REPORT')}</span></td>
      <td style="text-align:right;">
        <a href="index.html" class="btn btn-xs btn-outline" target="_blank" title="Open in Report App">
          View ↗
        </a>
      </td>
    </tr>
  `).join('');
}

document.getElementById('input-search-reports-audit')?.addEventListener('input', renderReportAuditTable);

// ============================================================================
// 9. FIREBASE REALTIME SYNC LISTENERS
// ============================================================================
function setupAdminFirebaseListeners() {
  if (!isFirebaseOnline || !db) return;

  // 1. Listen to engineers at `customers/_engineers`
  onValue(ref(db, 'customers/_engineers'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
      engineersData = data;
      localStorage.setItem('cached_admin_engineers', JSON.stringify(engineersData));
    } else if (Object.keys(engineersData).length === 0) {
      // Seed default initial engineers
      engineersData = { ...defaultEngineers };
      localStorage.setItem('cached_admin_engineers', JSON.stringify(engineersData));
      set(ref(db, 'customers/_engineers'), engineersData).catch(() => {});
    }
    renderDashboardOverview();
    renderEngineersTable();
    renderActivityTable();
  }, (err) => {
    console.warn("Realtime engineers sync note:", err.message);
  });

  // 2. Listen to reports at `customers/_service_reports`
  onValue(ref(db, 'customers/_service_reports'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
      reportsData = { ...reportsData, ...data };
      localStorage.setItem('cached_reports', JSON.stringify(reportsData));
      renderDashboardOverview();
      renderActivityTable();
      renderReportAuditTable();
    }
  }, () => {});

  // 3. Fallback listener for reports node if accessible
  onValue(ref(db, 'reports'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
      reportsData = { ...reportsData, ...data };
      localStorage.setItem('cached_reports', JSON.stringify(reportsData));
      renderDashboardOverview();
      renderActivityTable();
      renderReportAuditTable();
    }
  }, () => {});
}

// ============================================================================
// 10. SYSTEM BOOTSTRAP
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  setupAdminFirebaseListeners();
  renderDashboardOverview();
  renderEngineersTable();
});
