/**
 * Aadhav Intech - Field Service Engineer Workspace Portal (js/engineer-portal.js)
 * Enterprise Portal - Role-scoped Tasks, Realtime Task Progression, Navigation & Daily Service Activity Logging
 */

import { db, ref, get, set, update, remove, onValue } from './firebase.js';
import { showToast, loadCompanySettings } from './utils.js';

// Application State
let allEngineers = {};
let currentEngineer = null;
let allTasks = {};
let activeFilter = 'all';

// Modal Instances
let modalActivityInstance = null;
let modalRescheduleInstance = null;

// ============================================================================
// 1. INITIALIZATION & LIFECYCLE
// ============================================================================
document.addEventListener("DOMContentLoaded", async () => {
    // 1. UI basics
    startClock();
    setupThemeToggle();
    setupMobileSidebar();

    // 2. Initialize Bootstrap Modals immediately
    modalActivityInstance = new bootstrap.Modal(document.getElementById('modalServiceActivity'));
    modalRescheduleInstance = new bootstrap.Modal(document.getElementById('modalRescheduleTask'));

    // 3. Attach Listeners immediately
    setupEventListeners();

    // 4. Background branding & engineer identity
    loadCompanySettings().catch(() => {});
    await loadEngineersAndIdentity();

    // 5. Subscribe to Realtime Daily Tasks
    listenToTasks();
});

function startClock() {
    const clockEl = document.getElementById("liveClock");
    if (!clockEl) return;
    const updateTime = () => {
        const now = new Date();
        clockEl.textContent = now.toLocaleDateString("en-IN", {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        });
    };
    updateTime();
    setInterval(updateTime, 1000);
}

function setupThemeToggle() {
    const toggle = document.getElementById("themeToggle");
    if (!toggle) return;
    const savedTheme = localStorage.getItem("ait_theme") || "light";
    document.documentElement.setAttribute("data-bs-theme", savedTheme);
    updateThemeIcon(savedTheme);

    toggle.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-bs-theme");
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-bs-theme", next);
        localStorage.setItem("ait_theme", next);
        updateThemeIcon(next);
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector("#themeToggle i");
    if (icon) {
        icon.className = theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
    }
}

function setupMobileSidebar() {
    const menuToggle = document.getElementById("menu-toggle");
    const wrapper = document.getElementById("wrapper");
    const backdrop = document.getElementById("sidebar-backdrop");
    if (!menuToggle || !wrapper) return;

    menuToggle.addEventListener("click", () => {
        wrapper.classList.toggle("toggled");
        backdrop?.classList.toggle("active");
    });

    backdrop?.addEventListener("click", () => {
        wrapper.classList.remove("toggled");
        backdrop.classList.remove("active");
    });
}

// ============================================================================
// 2. ENGINEER IDENTITY RESOLUTION & PROFILE BINDING
// ============================================================================
async function loadEngineersAndIdentity() {
    try {
        // 1. Primary path in active security rules: customers/_engineers
        const custSnap = await get(ref(db, 'customers/_engineers')).catch(() => null);
        if (custSnap && custSnap.exists()) {
            allEngineers = custSnap.val();
        }

        // 2. Secondary check/merge from root engineers (safe non-blocking)
        try {
            const rootSnap = await get(ref(db, 'engineers'));
            if (rootSnap && rootSnap.exists()) {
                allEngineers = { ...allEngineers, ...rootSnap.val() };
            }
        } catch (authErr) {
            // Root path requires auth in some cloud rule versions, safely ignored
        }
    } catch (e) {
        console.warn("Could not load engineers list:", e);
    }

    const engList = Object.values(allEngineers);
    if (engList.length === 0) {
        // Fallback demo engineer
        allEngineers = {
            eng_rahul_krish: {
                id: "eng_rahul_krish",
                engineerId: "ENG-AIT-001",
                name: "Rahul Krish",
                fullName: "Rahul Krish",
                mobile: "9790030842",
                whatsapp: "9790030842",
                department: "Service & Instrumentation",
                designation: "Senior Field Service Engineer",
                status: "active"
            }
        };
    }

    // Identify active engineer
    let savedId = localStorage.getItem('active_portal_engineer_id');
    const sessionEmail = sessionStorage.getItem('user_email');
    const sessionId = sessionStorage.getItem('user_id');

    if (!savedId && (sessionEmail || sessionId)) {
        const found = Object.values(allEngineers).find(e => 
            (e.email && e.email.toLowerCase() === (sessionEmail || '').toLowerCase()) ||
            (e.engineerId && e.engineerId === sessionId) ||
            (e.employeeId && e.employeeId === sessionId)
        );
        if (found) savedId = found.id || found.engineerId;
    }

    if (!savedId || !allEngineers[savedId]) {
        // Default to first active engineer
        savedId = Object.keys(allEngineers)[0];
    }

    currentEngineer = allEngineers[savedId];
    localStorage.setItem('active_portal_engineer_id', savedId);

    // Render UI Header & Switcher
    renderActiveEngineerProfile();
    populateEngineerSwitcher();
    renderFilteredTasks();
}

function renderActiveEngineerProfile() {
    if (!currentEngineer) return;

    const name = currentEngineer.name || currentEngineer.fullName || 'Site Engineer';
    document.getElementById('activeEngNameHeader').textContent = name;
    document.getElementById('portalEngFullName').textContent = name;
    document.getElementById('portalEngDesig').textContent = currentEngineer.designation || 'Field Service Engineer';
    document.getElementById('portalEngDept').textContent = currentEngineer.department || 'Site Operations';
    document.getElementById('portalEngIdBadge').textContent = currentEngineer.engineerId || currentEngineer.employeeId || 'ENG-AIT';

    const avatarEl = document.getElementById('portalEngAvatar');
    avatarEl.src = currentEngineer.profilePhotoUrl || 'manuals/logo (2).ico';

    const badge = document.getElementById('portalEngStatusBadge');
    if (currentEngineer.status === 'active') {
        badge.className = 'badge bg-success';
        badge.textContent = 'Active On-Duty';
    } else {
        badge.className = 'badge bg-secondary';
        badge.textContent = 'Off Duty';
    }
}

function populateEngineerSwitcher() {
    const listEl = document.getElementById('engUserDropdownList');
    if (!listEl) return;

    let html = '<li><h6 class="dropdown-header">Switch Active Field Engineer</h6></li>';
    Object.values(allEngineers).forEach(e => {
        const isCurrent = currentEngineer && (currentEngineer.id === e.id || currentEngineer.engineerId === e.engineerId);
        const name = e.name || e.fullName || 'Engineer';
        const key = e.id || e.engineerId;

        html += `
            <li>
                <a class="dropdown-item d-flex justify-content-between align-items-center ${isCurrent ? 'active fw-bold' : ''}" 
                   href="#" onclick="window.switchActiveEngineer('${key}')">
                    <span>${escapeHtml(name)} <small class="opacity-75">(${escapeHtml(e.engineerId || '')})</small></span>
                    ${isCurrent ? '<i class="fa-solid fa-check ms-2"></i>' : ''}
                </a>
            </li>
        `;
    });

    listEl.innerHTML = html;
}

window.switchActiveEngineer = function(key) {
    if (allEngineers[key]) {
        currentEngineer = allEngineers[key];
        localStorage.setItem('active_portal_engineer_id', key);
        renderActiveEngineerProfile();
        populateEngineerSwitcher();
        renderFilteredTasks();
        showToast(`Switched active portal view to: ${currentEngineer.name || currentEngineer.fullName}`, "info");
    }
};

// ============================================================================
// 3. REALTIME TASKS LISTENER & ROLE SCOPING (Section 9)
// ============================================================================
function listenToTasks() {
    // 1. Primary listener: `customers/daily_tasks` (cloud authorized)
    const primaryRef = ref(db, 'customers/daily_tasks');
    onValue(primaryRef, (snapshot) => {
        const cloudTasks = snapshot.val() || {};
        allTasks = { ...allTasks, ...cloudTasks };
        renderFilteredTasks();
    }, (err) => {
        console.warn("Primary daily_tasks listener warning:", err);
    });

    // 2. Secondary listener: root `daily_tasks` (mirror)
    try {
        const rootRef = ref(db, 'daily_tasks');
        onValue(rootRef, (snapshot) => {
            const rootTasks = snapshot.val() || {};
            allTasks = { ...allTasks, ...rootTasks };
            renderFilteredTasks();
        }, () => {});
    } catch (e) {}
}

// Filter tasks strictly for current engineer!
function getScopedEngineerTasks() {
    if (!currentEngineer) return [];

    const engId = (currentEngineer.engineerId || currentEngineer.id || '').toLowerCase();
    const engName = (currentEngineer.name || currentEngineer.fullName || '').toLowerCase();
    const engPhone = cleanPhone(currentEngineer.whatsapp || currentEngineer.mobile || '');

    return Object.keys(allTasks).map(k => ({ taskId: k, ...allTasks[k] })).filter(task => {
        const tEngId = (task.engineerId || '').toLowerCase();
        const tEngName = (task.engineerName || '').toLowerCase();
        const tPhone = cleanPhone(task.engineerWhatsapp || task.engineerMobile || '');

        return (tEngId && tEngId === engId) ||
               (tEngName && tEngName === engName) ||
               (tPhone && engPhone && tPhone === engPhone);
    });
}

function renderFilteredTasks() {
    const container = document.getElementById('engineerTasksContainer');
    if (!container) return;

    const scopedTasks = getScopedEngineerTasks();
    const todayStr = new Date().toISOString().slice(0, 10);

    // Calculate tab metrics
    let countToday = 0;
    let countUpcoming = 0;
    let countAccepted = 0;
    let countOnTheWay = 0;
    let countInProgress = 0;
    let countCompleted = 0;
    let countRescheduled = 0;
    let countPending = 0;

    scopedTasks.forEach(t => {
        const isToday = t.plannedDate === todayStr;
        const isUpcoming = t.plannedDate > todayStr;
        const st = (t.status || 'assigned').toLowerCase();

        if (isToday) countToday++;
        if (isUpcoming) countUpcoming++;
        if (st === 'accepted') countAccepted++;
        if (st === 'on the way') countOnTheWay++;
        if (st === 'in progress') countInProgress++;
        if (st === 'completed') countCompleted++;
        if (st === 'rescheduled') countRescheduled++;
        if (st === 'assigned' || st === 'pending') countPending++;
    });

    // Update Tab Badges
    document.getElementById('badgeFilterAll').textContent = scopedTasks.length;
    document.getElementById('badgeFilterToday').textContent = countToday;
    document.getElementById('badgeFilterUpcoming').textContent = countUpcoming;
    document.getElementById('badgeFilterAccepted').textContent = countAccepted;
    document.getElementById('badgeFilterOnTheWay').textContent = countOnTheWay;
    document.getElementById('badgeFilterInProgress').textContent = countInProgress;
    document.getElementById('badgeFilterCompleted').textContent = countCompleted;
    document.getElementById('badgeFilterRescheduled').textContent = countRescheduled;

    // Overview Stats
    document.getElementById('metricTodayTasks').textContent = countToday;
    document.getElementById('metricPendingTasks').textContent = countPending;
    document.getElementById('metricActiveTasks').textContent = countAccepted + countOnTheWay + countInProgress;
    document.getElementById('metricCompletedTasks').textContent = countCompleted;

    // Filter tasks based on activeFilter tab
    let displayList = scopedTasks.filter(t => {
        const st = (t.status || 'assigned').toLowerCase();
        if (activeFilter === 'all') return true;
        if (activeFilter === 'today') return t.plannedDate === todayStr;
        if (activeFilter === 'upcoming') return t.plannedDate > todayStr;
        if (activeFilter === 'accepted') return st === 'accepted';
        if (activeFilter === 'on-the-way') return st === 'on the way';
        if (activeFilter === 'in-progress') return st === 'in progress';
        if (activeFilter === 'completed') return st === 'completed';
        if (activeFilter === 'rescheduled') return st === 'rescheduled';
        return true;
    });

    // Sort: Priority Urgent/High first, then Planned Date
    const priorityWeight = { 'Urgent': 4, 'High': 3, 'Medium': 2, 'Normal': 1 };
    displayList.sort((a, b) => {
        const pDiff = (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
        if (pDiff !== 0) return pDiff;
        return (a.plannedDate || '').localeCompare(b.plannedDate || '');
    });

    if (displayList.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5 text-muted card border-dashed">
                <i class="fa-solid fa-calendar-check fa-3x mb-3 text-secondary opacity-50"></i>
                <h5>No Tasks Matching "${activeFilter.toUpperCase()}" Filter</h5>
                <p class="small text-muted">You have no tasks assigned in this status category.</p>
                <div>
                    <button class="btn btn-outline-primary btn-sm" onclick="window.setFilter('all')">
                        Show All Tasks (${scopedTasks.length})
                    </button>
                </div>
            </div>
        `;
        return;
    }

    let html = '';
    displayList.forEach(task => {
        const st = (task.status || 'assigned').toLowerCase();
        const statusSlug = st.replace(/\s+/g, '-');
        const priorityClass = `priority-${(task.priority || 'Normal').toLowerCase()}`;

        // Status Badge
        let statusBadge = '';
        if (st === 'completed') {
            statusBadge = `<span class="badge bg-success"><i class="fa-solid fa-check me-1"></i>Completed</span>`;
        } else if (st === 'in progress') {
            statusBadge = `<span class="badge bg-primary"><i class="fa-solid fa-spinner fa-spin me-1"></i>In Progress</span>`;
        } else if (st === 'on the way') {
            statusBadge = `<span class="badge" style="background:#8b5cf6;"><i class="fa-solid fa-route me-1"></i>On The Way</span>`;
        } else if (st === 'accepted') {
            statusBadge = `<span class="badge bg-info text-dark"><i class="fa-solid fa-thumbs-up me-1"></i>Accepted</span>`;
        } else if (st === 'rescheduled') {
            statusBadge = `<span class="badge bg-secondary"><i class="fa-solid fa-calendar-xmark me-1"></i>Rescheduled</span>`;
        } else {
            statusBadge = `<span class="badge bg-warning text-dark"><i class="fa-solid fa-clock me-1"></i>Action Required</span>`;
        }

        // Action Progression Buttons based on current status
        let actionButtons = '';
        if (st === 'assigned' || st === 'pending') {
            actionButtons = `
                <button class="btn btn-primary btn-sm fw-bold w-100" onclick="window.updateTaskStatus('${task.taskId}', 'accepted')">
                    <i class="fa-solid fa-check me-1"></i> Accept Assignment
                </button>
            `;
        } else if (st === 'accepted') {
            actionButtons = `
                <button class="btn btn-sm text-white fw-bold w-100" style="background-color: #8b5cf6;" onclick="window.updateTaskStatus('${task.taskId}', 'on the way')">
                    <i class="fa-solid fa-route me-1"></i> Start Travel / On The Way
                </button>
            `;
        } else if (st === 'on the way') {
            actionButtons = `
                <button class="btn btn-primary btn-sm fw-bold w-100" onclick="window.updateTaskStatus('${task.taskId}', 'in progress')">
                    <i class="fa-solid fa-screwdriver-wrench me-1"></i> Arrived on Site & Start Work
                </button>
            `;
        } else if (st === 'in progress') {
            actionButtons = `
                <div class="d-flex gap-2 w-100">
                    <button class="btn btn-outline-warning btn-sm" onclick="window.openRescheduleModal('${task.taskId}')" title="Reschedule Task">
                        <i class="fa-solid fa-calendar-xmark"></i> Reschedule
                    </button>
                    <button class="btn btn-success btn-sm fw-bold flex-grow-1" onclick="window.openActivityModal('${task.taskId}')">
                        <i class="fa-solid fa-clipboard-check me-1"></i> Record Activity & Complete
                    </button>
                </div>
            `;
        } else if (st === 'completed') {
            actionButtons = `
                <div class="d-flex justify-content-between align-items-center w-100 small text-success bg-success-subtle p-2 rounded">
                    <span><i class="fa-solid fa-circle-check me-1"></i> Service Log Recorded</span>
                    <button class="btn btn-link btn-sm text-success p-0" onclick="window.openActivityModal('${task.taskId}')">View Notes</button>
                </div>
            `;
        } else if (st === 'rescheduled') {
            actionButtons = `
                <div class="d-flex justify-content-between align-items-center w-100">
                    <span class="small text-muted"><i class="fa-solid fa-clock-rotate-left me-1"></i> Rescheduled for ${formatDate(task.plannedDate)}</span>
                    <button class="btn btn-primary btn-sm" onclick="window.updateTaskStatus('${task.taskId}', 'in progress')">Resume Work</button>
                </div>
            `;
        }

        // Customer contact buttons
        const cleanCustPhone = cleanPhone(task.contactMobile);
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((task.companyAddress || task.companyLocation || '') + ' Coimbatore')}`;

        html += `
            <div class="col-12 col-lg-6">
                <div class="task-card h-100 d-flex flex-column">
                    <div class="task-status-bar task-status-${statusSlug}"></div>
                    <div class="p-3 p-md-4 flex-grow-1 d-flex flex-column justify-content-between">
                        <div>
                            <!-- Top Header: Service ID, Priority, Status -->
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <div class="d-flex align-items-center gap-2">
                                    <span class="font-monospace fw-bold small text-primary">${escapeHtml(task.serviceId || task.taskId)}</span>
                                    <span class="priority-pill ${priorityClass}">${escapeHtml(task.priority || 'Normal')}</span>
                                </div>
                                <div>
                                    ${statusBadge}
                                </div>
                            </div>

                            <!-- Company Name & Service Type -->
                            <h5 class="fw-bold text-dark mb-1">${escapeHtml(task.companyName)}</h5>
                            <div class="d-flex align-items-center gap-2 mb-3">
                                <span class="badge bg-light text-dark border small">${escapeHtml(task.serviceType)}</span>
                                <span class="small text-muted"><i class="fa-regular fa-calendar me-1"></i> Planned: <strong>${formatDate(task.plannedDate)}</strong></span>
                            </div>

                            <!-- Address & Location with Google Maps Link (Section 9) -->
                            <div class="p-2 rounded bg-light border mb-3">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div class="small text-dark">
                                        <i class="fa-solid fa-location-dot text-danger me-1"></i>
                                        <span>${escapeHtml(task.companyAddress || task.companyLocation || 'Location details unavailable')}</span>
                                    </div>
                                    <a href="${mapUrl}" target="_blank" class="btn btn-sm btn-outline-danger py-0 px-2 text-nowrap ms-2" style="font-size: 0.75rem;">
                                        <i class="fa-solid fa-map-location-dot me-1"></i> Maps
                                    </a>
                                </div>
                            </div>

                            <!-- Customer Contact Section (Section 9: tel & wa) -->
                            <div class="d-flex justify-content-between align-items-center p-2 rounded bg-light border mb-3">
                                <div>
                                    <div class="small fw-semibold text-dark">${escapeHtml(task.contactPerson)} ${task.contactDesignation ? '(' + escapeHtml(task.contactDesignation) + ')' : ''}</div>
                                    <div class="small text-muted font-monospace">${escapeHtml(task.contactMobile || 'No Phone')}</div>
                                </div>
                                <div class="d-flex gap-1">
                                    <a href="tel:${escapeHtml(task.contactMobile || '')}" class="btn btn-sm btn-outline-primary" title="Call Customer">
                                        <i class="fa-solid fa-phone"></i>
                                    </a>
                                    <a href="https://wa.me/${cleanCustPhone}" target="_blank" class="btn btn-sm btn-outline-success" title="WhatsApp Customer">
                                        <i class="fa-brands fa-whatsapp"></i>
                                    </a>
                                </div>
                            </div>

                            <!-- Instruments List (Section 9) -->
                            <div class="mb-3">
                                <div class="small text-muted mb-1"><i class="fa-solid fa-microchip text-primary me-1"></i> Instruments:</div>
                                <div class="small fw-semibold text-dark bg-light p-2 rounded border">${escapeHtml(task.instruments || 'General Instruments')}</div>
                            </div>

                            <!-- Work Instructions (Section 9) -->
                            <div class="mb-3">
                                <div class="small text-muted mb-1"><i class="fa-solid fa-clipboard-list text-primary me-1"></i> Work Instructions:</div>
                                <div class="small bg-white p-2 rounded border border-info-subtle text-dark">${escapeHtml(task.workInstructions || 'No instructions provided')}</div>
                            </div>

                            ${task.serviceActivity ? `
                            <div class="mb-3 p-2 bg-success-subtle rounded border border-success-subtle">
                                <div class="small fw-bold text-success mb-1"><i class="fa-solid fa-file-signature me-1"></i> Daily Activity Logged:</div>
                                <div class="small text-dark">${escapeHtml(task.serviceActivity.notes || '')}</div>
                                ${task.serviceActivity.readings ? `<div class="small font-monospace text-muted mt-1">Readings: ${escapeHtml(task.serviceActivity.readings)}</div>` : ''}
                            </div>
                            ` : ''}
                        </div>

                        <!-- Action Progression Buttons Bar -->
                        <div class="pt-3 border-top mt-2">
                            ${actionButtons}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ============================================================================
// 4. TASK ACTION HANDLERS (Section 9)
// ============================================================================

window.updateTaskStatus = async function(taskId, newStatus) {
    const task = allTasks[taskId];
    if (!task) return;

    try {
        const updates = {
            status: newStatus,
            updatedAt: new Date().toISOString()
        };

        if (newStatus === 'accepted') updates.acceptedAt = new Date().toISOString();
        if (newStatus === 'on the way') updates.departedAt = new Date().toISOString();
        if (newStatus === 'in progress') updates.startedAt = new Date().toISOString();

        // 1. Primary write to `customers/daily_tasks` (cloud authorized)
        await update(ref(db, `customers/daily_tasks/${taskId}`), updates);

        // 2. Secondary mirror to root `daily_tasks`
        update(ref(db, `daily_tasks/${taskId}`), updates).catch(() => {});

        showToast(`Task status updated to "${newStatus.toUpperCase()}".`, "success");
    } catch (err) {
        console.error("Status update error:", err);
        showToast(`Error updating status: ${err.message}`, "danger");
    }
};

window.openActivityModal = function(taskId) {
    const task = allTasks[taskId];
    if (!task) return;

    document.getElementById('actTaskId').value = taskId;
    document.getElementById('actSummaryCompany').textContent = task.companyName;
    document.getElementById('actSummaryServiceId').textContent = task.serviceId;
    document.getElementById('actSummaryType').textContent = task.serviceType;

    // Prefill if already logged
    if (task.serviceActivity) {
        document.getElementById('actNotes').value = task.serviceActivity.notes || '';
        document.getElementById('actReadings').value = task.serviceActivity.readings || '';
        document.getElementById('actTimeSpent').value = task.serviceActivity.timeSpent || '';
        document.getElementById('actSpares').value = task.serviceActivity.spares || '';
        document.getElementById('actSignoffPerson').value = task.serviceActivity.signoffPerson || '';
        document.getElementById('actRemarks').value = task.serviceActivity.remarks || '';
        document.getElementById('actStatus').value = task.status === 'completed' ? 'completed' : 'in progress';
    } else {
        document.getElementById('formServiceActivity').reset();
        document.getElementById('actStatus').value = 'completed';
    }

    modalActivityInstance.show();
};

window.openRescheduleModal = function(taskId) {
    const task = allTasks[taskId];
    if (!task) return;

    document.getElementById('reschedTaskId').value = taskId;
    document.getElementById('reschedNewDate').value = task.plannedDate || new Date().toISOString().slice(0, 10);
    document.getElementById('reschedReason').value = '';

    modalRescheduleInstance.show();
};

window.setFilter = function(filterName) {
    activeFilter = filterName;
    document.querySelectorAll('.filter-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === filterName);
    });
    renderFilteredTasks();
};

// ============================================================================
// 5. EVENT LISTENERS
// ============================================================================
function setupEventListeners() {
    // Filter tab buttons
    document.querySelectorAll('.filter-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const f = btn.getAttribute('data-filter');
            window.setFilter(f);
        });
    });

    // Refresh tasks button
    document.getElementById('btnRefreshTasks')?.addEventListener('click', () => {
        renderFilteredTasks();
        showToast("Tasks updated.", "info");
    });

    // Submit Daily Service Activity Form
    document.getElementById('formServiceActivity')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const taskId = document.getElementById('actTaskId').value;
        if (!taskId) return;

        const btn = document.getElementById('btnSubmitActivity');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Saving Log...';

        const status = document.getElementById('actStatus').value;
        const notes = document.getElementById('actNotes').value.trim();
        const readings = document.getElementById('actReadings').value.trim();
        const timeSpent = document.getElementById('actTimeSpent').value.trim();
        const spares = document.getElementById('actSpares').value.trim();
        const signoffPerson = document.getElementById('actSignoffPerson').value.trim();
        const remarks = document.getElementById('actRemarks').value.trim();

        const activityPayload = {
            notes: notes,
            readings: readings,
            timeSpent: timeSpent,
            spares: spares,
            signoffPerson: signoffPerson,
            remarks: remarks,
            recordedBy: currentEngineer?.name || 'Engineer',
            recordedAt: new Date().toISOString()
        };

        try {
            const actUpdates = {
                status: status,
                serviceActivity: activityPayload,
                completedAt: status === 'completed' ? new Date().toISOString() : null,
                updatedAt: new Date().toISOString()
            };

            // 1. Primary write to `customers/daily_tasks` (cloud authorized)
            await update(ref(db, `customers/daily_tasks/${taskId}`), actUpdates);

            // 2. Secondary mirror to root `daily_tasks`
            update(ref(db, `daily_tasks/${taskId}`), actUpdates).catch(() => {});

            modalActivityInstance.hide();
            showToast("Daily service activity recorded successfully!", "success");
        } catch (err) {
            console.error("Save activity error:", err);
            showToast(`Error saving activity: ${err.message}`, "danger");
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up me-1"></i> Save Daily Activity Log';
        }
    });

    // Submit Reschedule Form
    document.getElementById('formReschedule')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const taskId = document.getElementById('reschedTaskId').value;
        const newDate = document.getElementById('reschedNewDate').value;
        const reason = document.getElementById('reschedReason').value.trim();

        if (!taskId || !newDate || !reason) {
            showToast("Please provide both new date and reason.", "warning");
            return;
        }

        const btn = document.getElementById('btnConfirmReschedule');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Rescheduling...';

        try {
            const reschedPayload = {
                status: 'rescheduled',
                plannedDate: newDate,
                rescheduleReason: reason,
                rescheduledAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // 1. Primary write to `customers/daily_tasks` (cloud authorized)
            await update(ref(db, `customers/daily_tasks/${taskId}`), reschedPayload);

            // 2. Secondary mirror to root `daily_tasks`
            update(ref(db, `daily_tasks/${taskId}`), reschedPayload).catch(() => {});

            modalRescheduleInstance.hide();
            showToast(`Task rescheduled for ${formatDate(newDate)}.`, "success");
        } catch (err) {
            console.error("Reschedule error:", err);
            showToast(`Error rescheduling: ${err.message}`, "danger");
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-calendar-check me-1"></i> Confirm Reschedule';
        }
    });
}

// ============================================================================
// 6. UTILITY HELPERS
// ============================================================================
function cleanPhone(phone) {
    if (!phone) return "";
    let cleaned = phone.toString().replace(/[^0-9]/g, '');
    if (cleaned.length === 10) {
        cleaned = '91' + cleaned;
    }
    return cleaned;
}

function formatDate(isoOrDateStr) {
    if (!isoOrDateStr) return "-";
    try {
        const d = new Date(isoOrDateStr);
        if (isNaN(d.getTime())) return isoOrDateStr;
        return d.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
        return isoOrDateStr;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
