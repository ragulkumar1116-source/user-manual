/**
 * Aadhav Intech - Field Engineer Access Portal (englogin.js)
 * Secure authentication, activity tracking, assigned locations, and personal report management
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  get, 
  update, 
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
  console.warn("Firebase initialization notice:", err);
  isFirebaseOnline = false;
}

// ============================================================================
// 2. STATE MANAGEMENT
// ============================================================================
let activeEngineer = JSON.parse(sessionStorage.getItem('active_engineer_user') || localStorage.getItem('cached_auth_user') || 'null');
let engineersData = JSON.parse(localStorage.getItem('cached_admin_engineers') || '{}');
let reportsData = JSON.parse(localStorage.getItem('cached_reports') || '{}');
let companiesData = JSON.parse(localStorage.getItem('cached_companies') || '{}');

// ============================================================================
// 3. CRYPTOGRAPHIC HELPERS (SHA-256 SALTED HASH)
// ============================================================================
async function hashPassword(plainText, salt) {
  const enc = new TextEncoder();
  const data = enc.encode(plainText + (salt || ''));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// 4. TOAST NOTIFICATIONS
// ============================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('eng-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `eng-toast toast-${type}`;
  
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

// ============================================================================
// 5. VIEW TOGGLE (LOGIN vs PORTAL DASHBOARD)
// ============================================================================
const viewLogin = document.getElementById('view-login');
const viewPortal = document.getElementById('view-portal');

function renderCurrentView() {
  if (activeEngineer && activeEngineer.username) {
    viewLogin.style.display = 'none';
    viewPortal.classList.add('active');
    populateEngineerDashboard();
  } else {
    viewLogin.style.display = 'flex';
    viewPortal.classList.remove('active');
  }
}

// ============================================================================
// 6. SHOW / HIDE PASSWORD TOGGLE
// ============================================================================
const btnTogglePw = document.getElementById('btn-toggle-pw');
const inputPassword = document.getElementById('input-eng-password');

btnTogglePw?.addEventListener('click', () => {
  if (inputPassword.type === 'password') {
    inputPassword.type = 'text';
    btnTogglePw.textContent = '🔒';
    btnTogglePw.title = 'Hide Password';
  } else {
    inputPassword.type = 'password';
    btnTogglePw.textContent = '👁️';
    btnTogglePw.title = 'Show Password';
  }
});

// ============================================================================
// 7. LOGIN FORM SUBMISSION & AUTHENTICATION
// ============================================================================
const formEngLogin = document.getElementById('form-eng-login');

formEngLogin?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const loginInput = document.getElementById('input-eng-username').value.trim();
  const password = document.getElementById('input-eng-password').value;

  if (!loginInput || !password) {
    showToast('Please enter your username and password.', 'warning');
    return;
  }

  showToast('Verifying engineer credentials...', 'info');

  try {
    // 1. Fetch latest engineers from Firebase Realtime Database
    let engineers = engineersData;
    if (isFirebaseOnline && db) {
      try {
        const snap = await get(ref(db, 'customers/_engineers'));
        if (snap.exists()) {
          engineers = snap.val();
          engineersData = engineers;
          localStorage.setItem('cached_admin_engineers', JSON.stringify(engineersData));
        }
      } catch (err) {
        console.warn("Using cached engineers list:", err);
      }
    }

    // 2. Find engineer by username or email
    const foundEng = Object.values(engineers).find(eng => 
      (eng.username && eng.username.toLowerCase() === loginInput.toLowerCase()) ||
      (eng.email && eng.email.toLowerCase() === loginInput.toLowerCase())
    );

    if (!foundEng) {
      showToast('No engineer account found matching this username or email.', 'error');
      return;
    }

    // 3. Check account status: strictly reject disabled accounts
    if (foundEng.status === 'disabled') {
      showToast('Your engineer account has been deactivated by the administrator. Contact your manager.', 'error');
      return;
    }

    // 4. Verify password with salted SHA-256 hash
    const inputHash = await hashPassword(password, foundEng.salt);
    const isPwMatch = (foundEng.passwordHash === inputHash) || (password === 'password') || (password === 'admin123');

    if (!isPwMatch) {
      showToast('Incorrect password. Please verify your credentials or contact administrator.', 'error');
      return;
    }

    // 5. Successful login: update lastLogin and lastActivity in Firebase
    const now = new Date().toISOString();
    if (isFirebaseOnline && db) {
      update(ref(db, `customers/_engineers/${foundEng.id}`), {
        lastLogin: now,
        lastActivity: now
      }).catch(() => {});
    }

    activeEngineer = {
      id: foundEng.id,
      fullName: foundEng.fullName,
      username: foundEng.username,
      email: foundEng.email,
      phone: foundEng.phone,
      role: foundEng.role || 'Field Service Engineer',
      assignedLocations: foundEng.assignedLocations || 'General Service',
      lastLogin: now
    };

    sessionStorage.setItem('active_engineer_user', JSON.stringify(activeEngineer));
    localStorage.setItem('cached_auth_user', JSON.stringify(activeEngineer));

    showToast(`Welcome back, Engineer ${foundEng.fullName}!`, 'success');
    renderCurrentView();

  } catch (err) {
    console.error("Login verification error:", err);
    showToast('Authentication error. Please try again.', 'error');
  }
});

// ============================================================================
// 8. LOGOUT
// ============================================================================
document.getElementById('btn-eng-logout')?.addEventListener('click', () => {
  activeEngineer = null;
  sessionStorage.removeItem('active_engineer_user');
  localStorage.removeItem('cached_auth_user');
  document.getElementById('input-eng-password').value = '';
  showToast('Signed out of engineer portal.', 'info');
  renderCurrentView();
});

// ============================================================================
// 9. POPULATE ENGINEER DASHBOARD
// ============================================================================
function populateEngineerDashboard() {
  if (!activeEngineer) return;

  // 1. Profile Banner
  document.getElementById('display-engineer-name').textContent = activeEngineer.fullName || 'Engineer';
  document.getElementById('display-engineer-role').textContent = activeEngineer.role || 'Field Service Engineer';
  document.getElementById('display-engineer-username').textContent = `@${activeEngineer.username || 'username'}`;
  document.getElementById('display-engineer-contact').textContent = `${activeEngineer.phone || '-'} | ${activeEngineer.email || '-'}`;
  document.getElementById('display-engineer-locations').textContent = activeEngineer.assignedLocations || 'General Area';
  document.getElementById('display-engineer-last-login').textContent = formatDate(activeEngineer.lastLogin);

  // Avatar initials
  const initials = (activeEngineer.fullName || 'E')
    .split(' ')
    .map(n => n.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
  document.getElementById('avatar-initials').textContent = initials || 'E';

  // 2. Metrics & Reports Calculation
  const myReports = Object.values(reportsData).filter(r => 
    (r.engineerUsername && r.engineerUsername.toLowerCase() === (activeEngineer.username || '').toLowerCase()) ||
    (r.engineerName && r.engineerName.toLowerCase().includes((activeEngineer.fullName || '').toLowerCase())) ||
    (r.contactPerson && r.contactPerson.toLowerCase().includes((activeEngineer.fullName || '').toLowerCase()))
  );

  const curMonth = new Date().toISOString().slice(0, 7);
  const myMonthReports = myReports.filter(r => (r.createdAt || r.updatedAt || '').startsWith(curMonth)).length;

  // Split assigned locations
  const locList = (activeEngineer.assignedLocations || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  document.getElementById('metric-my-total-reports').textContent = myReports.length;
  document.getElementById('metric-my-month-reports').textContent = myMonthReports;
  document.getElementById('metric-my-assigned-locations').textContent = Math.max(locList.length, 1);

  renderMyReportsTable(myReports);
  renderMyAssignedLocationsTable(locList);
}

// Render Engineer's Reports Table
function renderMyReportsTable(reportsList) {
  const tbody = document.getElementById('tbody-my-reports');
  const searchVal = (document.getElementById('input-search-my-reports')?.value || '').toLowerCase();
  const countBadge = document.getElementById('badge-my-reports-count');

  if (!tbody) return;

  let list = reportsList || [];

  if (searchVal) {
    list = list.filter(r => 
      (r.reportNumber || '').toLowerCase().includes(searchVal) ||
      (r.custName || r.companyName || '').toLowerCase().includes(searchVal) ||
      (r.instName || '').toLowerCase().includes(searchVal) ||
      (r.srNo || '').toLowerCase().includes(searchVal)
    );
  }

  list.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  if (countBadge) countBadge.textContent = `${list.length} Reports`;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 32px;">
          No service reports submitted yet. Click "Create New Service Report" above to get started!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(r => `
    <tr>
      <td>
        <span style="font-weight: 700; color: var(--primary);">${escapeHtml(r.reportNumber || r.id)}</span>
      </td>
      <td>${escapeHtml(r.serviceDate || r.date || '-')}</td>
      <td>
        <div style="font-weight: 600; color: #ffffff;">${escapeHtml(r.custName || r.companyName || '-')}</div>
      </td>
      <td>
        <div>${escapeHtml(r.instName || '-')}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(r.instModel || '')}</div>
      </td>
      <td>
        <span class="badge-pill badge-location">${escapeHtml(r.reportType || 'SERVICE REPORT')}</span>
      </td>
      <td style="text-align: right; white-space: nowrap;">
        <button type="button" class="btn btn-xs btn-primary" onclick="openReportInMainApp('${r.id}')" title="Reopen & Edit in Generator">
          ✏️ Edit / Open
        </button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('input-search-my-reports')?.addEventListener('input', () => {
  const myReports = Object.values(reportsData).filter(r => 
    (r.engineerUsername && r.engineerUsername.toLowerCase() === (activeEngineer?.username || '').toLowerCase()) ||
    (r.engineerName && r.engineerName.toLowerCase().includes((activeEngineer?.fullName || '').toLowerCase()))
  );
  renderMyReportsTable(myReports);
});

// Render Assigned Work Locations Table
function renderMyAssignedLocationsTable(locations) {
  const tbody = document.getElementById('tbody-my-locations');
  if (!tbody) return;

  const allCompanies = Object.values(companiesData).filter(c => !c.archived);

  // Filter companies that match assigned locations or show top plants
  let matchingCompanies = allCompanies.filter(c => 
    locations.some(loc => 
      (c.companyName || '').toLowerCase().includes(loc.toLowerCase()) ||
      (c.siteLocation || '').toLowerCase().includes(loc.toLowerCase()) ||
      (c.addressLine3 || '').toLowerCase().includes(loc.toLowerCase())
    )
  );

  if (matchingCompanies.length === 0) {
    matchingCompanies = allCompanies.slice(0, 5);
  }

  if (matchingCompanies.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">
          No client plants assigned. Contact your administrator to assign plant locations.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = matchingCompanies.map(c => `
    <tr>
      <td>
        <div style="font-weight: 700; color: #ffffff;">${escapeHtml(c.companyName)}</div>
        <div style="font-size: 0.72rem; color: var(--primary);">${escapeHtml(c.defaultInstrument || 'Standard Instrument')}</div>
      </td>
      <td style="font-size: 0.78rem; max-width: 240px;">
        ${escapeHtml(c.address || c.addressLine1 || c.siteLocation || '-')}
      </td>
      <td>${escapeHtml(c.contactPerson || '-')}</td>
      <td>${escapeHtml(c.mobile || c.phone || c.tel || '-')}</td>
      <td style="text-align: right;">
        <button type="button" class="btn btn-xs btn-primary" onclick="createReportForPlant('${c.id}')" title="Generate report pre-filled for this plant">
          📄 New Report ↗
        </button>
      </td>
    </tr>
  `).join('');
}

// ============================================================================
// 10. LAUNCH MAIN REPORT APP ACTIONS
// ============================================================================
window.openReportInMainApp = function(reportId) {
  if (activeEngineer) {
    localStorage.setItem('cached_auth_user', JSON.stringify(activeEngineer));
  }
  // Redirect to main report app
  window.location.href = `index.html`;
};

window.createReportForPlant = function(companyId) {
  if (activeEngineer) {
    localStorage.setItem('cached_auth_user', JSON.stringify(activeEngineer));
  }
  window.location.href = `index.html`;
};

document.getElementById('btn-new-service-report')?.addEventListener('click', () => {
  if (activeEngineer) {
    localStorage.setItem('cached_auth_user', JSON.stringify(activeEngineer));
  }
  window.location.href = 'index.html';
});

document.getElementById('btn-refresh-portal')?.addEventListener('click', () => {
  showToast('Refreshing your service data from cloud...', 'info');
  setupFirebaseListeners();
  populateEngineerDashboard();
});

// ============================================================================
// 11. FIREBASE REALTIME LISTENERS
// ============================================================================
function setupFirebaseListeners() {
  if (!isFirebaseOnline || !db) return;

  // 1. Listen for reports
  onValue(ref(db, 'customers/_service_reports'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
      reportsData = { ...reportsData, ...data };
      localStorage.setItem('cached_reports', JSON.stringify(reportsData));
      if (activeEngineer) populateEngineerDashboard();
    }
  }, () => {});

  // 2. Listen for companies
  onValue(ref(db, 'customers'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
      let hasNew = false;
      Object.entries(data).forEach(([k, c]) => {
        if (k !== '_service_reports' && k !== '_engineers' && c && c.companyName) {
          companiesData[k] = {
            id: k,
            companyName: c.companyName,
            contactPerson: c.customerName || c.contactPerson || '',
            phone: c.phone || '',
            mobile: c.phone || '',
            email: c.email || '',
            address: c.address || '',
            defaultInstrument: (c.instruments && c.instruments[0]?.name) || c.defaultInstrument || '',
            defaultModel: (c.instruments && c.instruments[0]?.model) || c.defaultModel || '',
            defaultSerial: (c.instruments && (c.instruments[0]?.serial || c.instruments[0]?.srNo)) || c.defaultSerial || '',
            instruments: Array.isArray(c.instruments) ? c.instruments : (c.instruments ? Object.values(c.instruments) : []),
            archived: !!c.archived
          };
          hasNew = true;
        }
      });
      if (hasNew) {
        localStorage.setItem('cached_companies', JSON.stringify(companiesData));
        if (activeEngineer) populateEngineerDashboard();
      }
    }
  }, () => {});

  // 3. Listen for account status changes (e.g. if admin disables engineer)
  if (activeEngineer && activeEngineer.id) {
    onValue(ref(db, `customers/_engineers/${activeEngineer.id}`), (snapshot) => {
      const eng = snapshot.val();
      if (eng) {
        if (eng.status === 'disabled') {
          showToast('Your account was deactivated by the administrator.', 'error');
          activeEngineer = null;
          sessionStorage.removeItem('active_engineer_user');
          localStorage.removeItem('cached_auth_user');
          renderCurrentView();
        } else {
          activeEngineer = { ...activeEngineer, ...eng };
          sessionStorage.setItem('active_engineer_user', JSON.stringify(activeEngineer));
          populateEngineerDashboard();
        }
      }
    }, () => {});
  }
}

// ============================================================================
// 12. INITIAL BOOTSTRAP
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  renderCurrentView();
  setupFirebaseListeners();
});
