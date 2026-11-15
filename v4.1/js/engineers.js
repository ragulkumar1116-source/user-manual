/**
 * Aadhav Intech - Site Engineer Management System (js/engineers.js)
 * Enterprise Portal - Complete Field Engineer Roster, Profiles, KYC Masking & Firebase Realtime Database
 */

import { db, ref, get, set, update, remove, onValue, push } from './firebase.js';
import { showToast, loadCompanySettings } from './utils.js';

// Application State
let engineersData = {};
let currentEditingId = null;
let currentViewingId = null;
let isMaskedInView = true;

// Default Seed Engineers (If cloud database is fresh)
const initialSeedEngineers = {
    eng_rahul_krish: {
        id: "eng_rahul_krish",
        engineerId: "ENG-AIT-001",
        name: "Rahul Krish",
        fullName: "Rahul Krish",
        employeeId: "AIT-EMP-101",
        mobile: "9790030842",
        whatsapp: "9790030842",
        email: "rahul.krish@aadhavintech.com",
        dob: "1994-05-14",
        city: "Coimbatore",
        address: "12/4B, Gandhipuram 4th Cross Street, Coimbatore, Tamil Nadu 641012",
        aadhaar: "7654 3210 9876",
        pan: "ABCDE1234F",
        profilePhotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        insurancePhotoUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=400&q=80",
        otherDocs: "https://aadhavintech.com/docs/cert-rahul-cems.pdf",
        department: "Service & Instrumentation",
        designation: "Senior Field Service Engineer",
        joiningDate: "2021-03-15",
        status: "active",
        createdAt: "2021-03-15T09:00:00.000Z",
        updatedAt: new Date().toISOString()
    },
    eng_karthick_selvam: {
        id: "eng_karthick_selvam",
        engineerId: "ENG-AIT-002",
        name: "Karthick Selvam",
        fullName: "Karthick Selvam",
        employeeId: "AIT-EMP-102",
        mobile: "9944037958",
        whatsapp: "9944037958",
        email: "karthick.selvam@aadhavintech.com",
        dob: "1996-08-22",
        city: "Coimbatore",
        address: "45, Cross Cut Road, RS Puram, Coimbatore, Tamil Nadu 641002",
        aadhaar: "8921 4567 1234",
        pan: "BPKPK8765G",
        profilePhotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
        insurancePhotoUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=400&q=80",
        otherDocs: "https://aadhavintech.com/docs/cert-karthick-scada.pdf",
        department: "OCEMS & Environmental",
        designation: "Site Commissioning Engineer",
        joiningDate: "2022-07-10",
        status: "active",
        createdAt: "2022-07-10T09:00:00.000Z",
        updatedAt: new Date().toISOString()
    },
    eng_ramesh_kumar: {
        id: "eng_ramesh_kumar",
        engineerId: "ENG-AIT-003",
        name: "Ramesh Kumar",
        fullName: "Ramesh Kumar",
        employeeId: "AIT-EMP-103",
        mobile: "9842234567",
        whatsapp: "9842234567",
        email: "ramesh.kumar@aadhavintech.com",
        dob: "1992-11-30",
        city: "Coimbatore",
        address: "88, Kamaraj Road, Podanur, Coimbatore, Tamil Nadu 641023",
        aadhaar: "6543 2109 8765",
        pan: "CDRPG4321H",
        profilePhotoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
        insurancePhotoUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=400&q=80",
        otherDocs: "https://aadhavintech.com/docs/cert-ramesh-lead.pdf",
        department: "Calibration & AMC",
        designation: "Lead Service Engineer",
        joiningDate: "2020-01-20",
        status: "active",
        createdAt: "2020-01-20T09:00:00.000Z",
        updatedAt: new Date().toISOString()
    },
    eng_praveen_raj: {
        id: "eng_praveen_raj",
        engineerId: "ENG-AIT-004",
        name: "Praveen Raj",
        fullName: "Praveen Raj",
        employeeId: "AIT-EMP-104",
        mobile: "9629123456",
        whatsapp: "9629123456",
        email: "praveen.raj@aadhavintech.com",
        dob: "1997-02-18",
        city: "Coimbatore",
        address: "15/2, Trichy Road, Singanallur, Coimbatore, Tamil Nadu 641005",
        aadhaar: "5432 1098 7654",
        pan: "DEFPH5678J",
        profilePhotoUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80",
        insurancePhotoUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=400&q=80",
        otherDocs: "",
        department: "Field Support",
        designation: "Field Service Engineer",
        joiningDate: "2023-04-01",
        status: "active",
        createdAt: "2023-04-01T09:00:00.000Z",
        updatedAt: new Date().toISOString()
    }
};

// Bootstrap Modal Instances
let modalFormInstance = null;
let modalViewInstance = null;

// ============================================================================
// 1. INITIALIZATION & LIFECYCLE
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. UI basics
    startClock();
    setupThemeToggle();
    setupMobileSidebar();

    // 2. Initialize Bootstrap Modals immediately
    modalFormInstance = new bootstrap.Modal(document.getElementById('modalEngineerForm'));
    modalViewInstance = new bootstrap.Modal(document.getElementById('modalViewEngineer'));

    // 3. Attach Event Listeners immediately
    setupEventListeners();

    // 4. Load company branding & subscribe to realtime engineers
    loadCompanySettings().catch(() => {});
    listenToEngineers();
});

// Live Clock
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

// Theme Toggle
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

// Mobile Sidebar
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
// 2. SENSITIVE IDENTIFIER MASKING UTILITIES
// ============================================================================
function maskAadhaar(val) {
    if (!val) return "Not Recorded";
    const cleaned = val.toString().replace(/\s+/g, '');
    if (cleaned.length < 4) return "XXXX-XXXX-XXXX";
    const last4 = cleaned.slice(-4);
    return `XXXX-XXXX-${last4}`;
}

function maskPan(val) {
    if (!val) return "Not Recorded";
    const cleaned = val.toString().trim().toUpperCase();
    if (cleaned.length < 6) return "ABCDE****F";
    const first5 = cleaned.slice(0, 5);
    const last1 = cleaned.slice(-1);
    return `${first5}****${last1}`;
}

function generateNextEngId() {
    const count = Object.keys(engineersData).length + 101;
    return `ENG-AIT-${count}`;
}

function generateEmployeeId() {
    const count = Object.keys(engineersData).length + 101;
    return `AIT-EMP-${count}`;
}

// ============================================================================
// 3. REALTIME FIREBASE SUBSCRIPTION
// ============================================================================
function listenToEngineers() {
    // 1. Primary listener: `customers/_engineers` (permitted by active rules)
    const primaryRef = ref(db, 'customers/_engineers');
    onValue(primaryRef, (snapshot) => {
        const cloudData = snapshot.val();
        if (cloudData && Object.keys(cloudData).length > 0) {
            engineersData = cloudData;
            localStorage.setItem('cached_engineers', JSON.stringify(engineersData));
            populateDepartmentFilter();
            renderEngineersTable();
            updateStats();
        }
    }, (error) => {
        console.warn("Primary engineers listener notice:", error);
    });

    // 2. Secondary listener: root `engineers` (mirror)
    try {
        const rootRef = ref(db, 'engineers');
        onValue(rootRef, (snapshot) => {
            const rootData = snapshot.val();
            if (rootData && Object.keys(rootData).length > 0) {
                engineersData = { ...engineersData, ...rootData };
                localStorage.setItem('cached_engineers', JSON.stringify(engineersData));
                populateDepartmentFilter();
                renderEngineersTable();
                updateStats();
            }
        }, () => {});
    } catch (e) {}

    // 3. Fallback: local cached data
    const cached = localStorage.getItem('cached_engineers');
    if (cached) {
        try {
            engineersData = JSON.parse(cached);
            populateDepartmentFilter();
            renderEngineersTable();
            updateStats();
        } catch (e) {}
    }
}

// ============================================================================
// 4. STATS & FILTERS
// ============================================================================
function updateStats() {
    const keys = Object.keys(engineersData);
    let total = keys.length;
    let active = 0;
    let inactive = 0;
    const depts = new Set();

    keys.forEach(k => {
        const eng = engineersData[k];
        if (eng.status === 'active') active++;
        else inactive++;
        if (eng.department) depts.add(eng.department);
    });

    document.getElementById('statTotalEngineers').textContent = total;
    document.getElementById('statActiveEngineers').textContent = active;
    document.getElementById('statInactiveEngineers').textContent = inactive;
    document.getElementById('statDepartments').textContent = depts.size;
    document.getElementById('badgeTotalCount').textContent = `${total} engineers registered`;
}

function populateDepartmentFilter() {
    const select = document.getElementById('filterDepartment');
    if (!select) return;
    const currentVal = select.value;
    const depts = new Set();

    Object.values(engineersData).forEach(eng => {
        if (eng.department) depts.add(eng.department);
    });

    select.innerHTML = '<option value="all">All Departments</option>';
    Array.from(depts).sort().forEach(dept => {
        const opt = document.createElement('option');
        opt.value = dept;
        opt.textContent = dept;
        select.appendChild(opt);
    });

    if (currentVal) select.value = currentVal;
}

// ============================================================================
// 5. TABLE RENDERING
// ============================================================================
function renderEngineersTable() {
    const tbody = document.getElementById('engineersTableBody');
    if (!tbody) return;

    const searchTerm = (document.getElementById('searchEngineerInput')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('filterStatus')?.value || 'all';
    const deptFilter = document.getElementById('filterDepartment')?.value || 'all';

    const keys = Object.keys(engineersData);
    if (keys.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5 text-muted">
                    <i class="fa-solid fa-users-slash fa-2x mb-2 text-secondary opacity-50"></i>
                    <div>No engineers registered yet. Click "Add Engineer" to register your first site engineer.</div>
                </td>
            </tr>`;
        return;
    }

    let filtered = keys.map(k => ({ key: k, ...engineersData[k] })).filter(eng => {
        const matchesStatus = statusFilter === 'all' || eng.status === statusFilter;
        const matchesDept = deptFilter === 'all' || eng.department === deptFilter;

        const hay = `${eng.name || ''} ${eng.fullName || ''} ${eng.engineerId || ''} ${eng.employeeId || ''} ${eng.mobile || ''} ${eng.whatsapp || ''} ${eng.email || ''} ${eng.department || ''} ${eng.designation || ''} ${eng.city || ''}`.toLowerCase();
        const matchesSearch = !searchTerm || hay.includes(searchTerm);

        return matchesStatus && matchesDept && matchesSearch;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4 text-muted">
                    No engineers match the current filter or search criteria.
                </td>
            </tr>`;
        return;
    }

    // Sort by name
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    let html = '';
    filtered.forEach(eng => {
        const isActive = eng.status === 'active';
        const photoUrl = eng.profilePhotoUrl || 'manuals/logo (2).ico';
        const engName = eng.name || eng.fullName || 'Unnamed Engineer';
        const engInitials = engName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'E';

        const maskedAadhaar = maskAadhaar(eng.aadhaar);
        const maskedPan = maskPan(eng.pan);

        const statusBadge = isActive
            ? `<span class="badge badge-soft-success"><i class="fa-solid fa-circle-check me-1"></i>Active</span>`
            : `<span class="badge badge-soft-secondary"><i class="fa-solid fa-circle-xmark me-1"></i>Inactive</span>`;

        html += `
            <tr>
                <td>
                    <img src="${escapeHtml(photoUrl)}" 
                         class="eng-avatar shadow-sm" 
                         alt="${escapeHtml(engName)}" 
                         onerror="this.onerror=null; this.src='manuals/logo (2).ico';">
                </td>
                <td>
                    <div class="fw-bold text-dark cursor-pointer text-hover-primary" onclick="window.viewEngineerDetails('${eng.key}')">
                        ${escapeHtml(engName)}
                    </div>
                    <div class="small text-muted">${escapeHtml(eng.designation || 'Service Engineer')}</div>
                    <div class="mt-1">
                        <span class="badge bg-light text-secondary border small">ID: ${escapeHtml(eng.engineerId || eng.key)}</span>
                        ${(eng.assignedCompaniesCount > 0 || (Array.isArray(eng.assignedCompanies) && eng.assignedCompanies.length > 0)) ? `
                            <span class="badge bg-primary-subtle text-primary border border-primary-subtle small ms-1" title="Responsible for these plants">
                                <i class="fa-solid fa-building me-1"></i>${eng.assignedCompaniesCount || eng.assignedCompanies.length} Plants
                            </span>
                        ` : ''}
                    </div>
                </td>
                <td>
                    <div class="fw-semibold small">${escapeHtml(eng.employeeId || '-')}</div>
                    <div class="small text-muted">${escapeHtml(eng.department || '-')}</div>
                </td>
                <td>
                    <div class="small"><i class="fa-solid fa-phone text-muted me-1"></i> <a href="tel:${escapeHtml(eng.mobile || '')}" class="text-decoration-none">${escapeHtml(eng.mobile || '-')}</a></div>
                    <div class="small text-success mt-1">
                        <i class="fa-brands fa-whatsapp me-1"></i>
                        <a href="https://wa.me/${cleanPhone(eng.whatsapp || eng.mobile || '')}" target="_blank" class="text-success text-decoration-none fw-semibold">
                            ${escapeHtml(eng.whatsapp || eng.mobile || '-')}
                        </a>
                    </div>
                </td>
                <td>
                    <div class="small font-monospace text-muted">Aadhaar: <span class="fw-semibold text-dark">${maskedAadhaar}</span></div>
                    <div class="small font-monospace text-muted mt-1">PAN: <span class="fw-semibold text-dark">${maskedPan}</span></div>
                </td>
                <td>
                    <div class="small text-muted">${eng.joiningDate ? formatDate(eng.joiningDate) : '-'}</div>
                </td>
                <td>
                    ${statusBadge}
                </td>
                <td class="text-end">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="window.viewEngineerDetails('${eng.key}')" title="View Dossier">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-secondary" onclick="window.editEngineer('${eng.key}')" title="Edit Profile">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn ${isActive ? 'btn-outline-warning' : 'btn-outline-success'}" onclick="window.toggleEngineerStatus('${eng.key}')" title="${isActive ? 'Deactivate' : 'Activate'}">
                            <i class="fa-solid ${isActive ? 'fa-user-slash' : 'fa-user-check'}"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="window.deleteEngineer('${eng.key}')" title="Delete Engineer Profile">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    });

    tbody.innerHTML = html;
}

// ============================================================================
// 6. EVENT LISTENERS & MODAL BINDINGS
// ============================================================================
function setupEventListeners() {
    // Open Add Engineer Modal
    document.getElementById('btnOpenAddEngineer')?.addEventListener('click', () => {
        openAddEngineerModal();
    });

    // Refresh List
    document.getElementById('btnRefreshList')?.addEventListener('click', () => {
        renderEngineersTable();
        showToast("Roster refreshed from database.", "info");
    });

    // Search and Filters
    document.getElementById('searchEngineerInput')?.addEventListener('input', renderEngineersTable);
    document.getElementById('filterStatus')?.addEventListener('change', renderEngineersTable);
    document.getElementById('filterDepartment')?.addEventListener('change', renderEngineersTable);
    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
        document.getElementById('searchEngineerInput').value = '';
        document.getElementById('filterStatus').value = 'all';
        document.getElementById('filterDepartment').value = 'all';
        renderEngineersTable();
    });

    // Checkbox: "Same as Mobile" for WhatsApp
    document.getElementById('chkSameAsMobile')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.getElementById('inputEngWhatsapp').value = document.getElementById('inputEngMobile').value;
        }
    });
    document.getElementById('inputEngMobile')?.addEventListener('input', () => {
        if (document.getElementById('chkSameAsMobile')?.checked) {
            document.getElementById('inputEngWhatsapp').value = document.getElementById('inputEngMobile').value;
        }
    });

    // Live URL image previews
    document.getElementById('inputEngPhotoUrl')?.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        const preview = document.getElementById('previewEngPhoto');
        preview.src = val || 'manuals/logo (2).ico';
    });
    document.getElementById('inputEngInsuranceUrl')?.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        const preview = document.getElementById('previewEngInsurance');
        preview.src = val || 'manuals/logo (2).ico';
    });

    // Regenerate ID
    document.getElementById('btnRegenEngId')?.addEventListener('click', () => {
        document.getElementById('inputEngId').value = generateNextEngId();
    });

    // Submit Form
    document.getElementById('formEngineer')?.addEventListener('submit', handleFormSubmit);

    // Toggle Mask in Profile View Modal
    document.getElementById('btnToggleMaskView')?.addEventListener('click', () => {
        isMaskedInView = !isMaskedInView;
        updateViewModalMasking();
    });

    // Print Profile
    document.getElementById('btnPrintProfile')?.addEventListener('click', () => {
        window.print();
    });

    // Edit from View Modal
    document.getElementById('btnEditFromView')?.addEventListener('click', () => {
        if (currentViewingId) {
            modalViewInstance.hide();
            window.editEngineer(currentViewingId);
        }
    });

    // Delete from View Modal
    document.getElementById('btnDeleteFromView')?.addEventListener('click', () => {
        if (currentViewingId) {
            window.deleteEngineer(currentViewingId);
        }
    });
}

// Open Add Modal
function openAddEngineerModal() {
    currentEditingId = null;
    document.getElementById('formEngineer').reset();
    document.getElementById('editEngineerKey').value = '';
    document.getElementById('modalEngineerFormTitle').innerHTML = '<i class="fa-solid fa-user-plus text-primary me-2"></i>Add Site Engineer';

    document.getElementById('inputEngId').value = generateNextEngId();
    document.getElementById('inputEngEmpId').value = generateEmployeeId();
    document.getElementById('inputEngStatus').value = 'active';

    document.getElementById('previewEngPhoto').src = 'manuals/logo (2).ico';
    document.getElementById('previewEngInsurance').src = 'manuals/logo (2).ico';

    modalFormInstance.show();
}

// Edit Engineer Window Function
window.editEngineer = function(key) {
    const eng = engineersData[key];
    if (!eng) return;

    currentEditingId = key;
    document.getElementById('editEngineerKey').value = key;
    document.getElementById('modalEngineerFormTitle').innerHTML = '<i class="fa-solid fa-user-pen text-primary me-2"></i>Edit Site Engineer Profile';

    document.getElementById('inputEngId').value = eng.engineerId || key;
    document.getElementById('inputEngName').value = eng.name || eng.fullName || '';
    document.getElementById('inputEngEmpId').value = eng.employeeId || '';
    document.getElementById('inputEngDept').value = eng.department || '';
    document.getElementById('inputEngDesignation').value = eng.designation || '';
    document.getElementById('inputEngStatus').value = eng.status || 'active';

    document.getElementById('inputEngMobile').value = eng.mobile || '';
    document.getElementById('inputEngWhatsapp').value = eng.whatsapp || '';
    document.getElementById('inputEngEmail').value = eng.email || '';
    document.getElementById('inputEngDob').value = eng.dob || '';
    document.getElementById('inputEngJoiningDate').value = eng.joiningDate || '';
    document.getElementById('inputEngCity').value = eng.city || '';
    document.getElementById('inputEngAddress').value = eng.address || '';

    // Sensitive
    document.getElementById('inputEngAadhaar').value = eng.aadhaar || '';
    document.getElementById('inputEngPan').value = eng.pan || '';

    // Documents & Photos
    document.getElementById('inputEngPhotoUrl').value = eng.profilePhotoUrl || '';
    document.getElementById('previewEngPhoto').src = eng.profilePhotoUrl || 'manuals/logo (2).ico';

    document.getElementById('inputEngInsuranceUrl').value = eng.insurancePhotoUrl || '';
    document.getElementById('previewEngInsurance').src = eng.insurancePhotoUrl || 'manuals/logo (2).ico';

    document.getElementById('inputEngOtherDocs').value = eng.otherDocs || '';

    modalFormInstance.show();
};

// View Engineer Details Modal
window.viewEngineerDetails = function(key) {
    const eng = engineersData[key];
    if (!eng) return;

    currentViewingId = key;
    isMaskedInView = true;

    const engName = eng.name || eng.fullName || 'Engineer';
    document.getElementById('viewName').textContent = engName;
    document.getElementById('viewDesignation').textContent = eng.designation || 'Site Service Engineer';
    document.getElementById('viewEngId').textContent = eng.engineerId || key;
    document.getElementById('viewEmpId').textContent = eng.employeeId || '-';
    document.getElementById('viewDept').textContent = eng.department || '-';

    document.getElementById('viewMobile').textContent = eng.mobile || '-';
    document.getElementById('viewWhatsapp').textContent = eng.whatsapp || eng.mobile || '-';
    document.getElementById('viewEmail').textContent = eng.email || '-';
    document.getElementById('viewCity').textContent = eng.city || '-';
    document.getElementById('viewAddress').textContent = eng.address || 'Address not provided';

    document.getElementById('viewDob').textContent = eng.dob ? formatDate(eng.dob) : '-';
    document.getElementById('viewJoiningDate').textContent = eng.joiningDate ? formatDate(eng.joiningDate) : '-';
    document.getElementById('viewCreatedAt').textContent = eng.createdAt ? new Date(eng.createdAt).toLocaleDateString() : '-';
    document.getElementById('viewUpdatedAt').textContent = eng.updatedAt ? new Date(eng.updatedAt).toLocaleDateString() : '-';

    // Status Badge
    const badge = document.getElementById('viewStatusBadge');
    if (eng.status === 'active') {
        badge.className = 'badge bg-success';
        badge.textContent = 'Active On-Duty';
    } else {
        badge.className = 'badge bg-secondary';
        badge.textContent = 'Inactive / On Leave';
    }

    // Images
    const photoEl = document.getElementById('viewProfilePhoto');
    photoEl.src = eng.profilePhotoUrl || 'manuals/logo (2).ico';

    const insEl = document.getElementById('viewInsurancePhoto');
    insEl.src = eng.insurancePhotoUrl || 'manuals/logo (2).ico';

    const insLink = document.getElementById('viewInsuranceLink');
    if (eng.insurancePhotoUrl) {
        insLink.href = eng.insurancePhotoUrl;
        insLink.classList.remove('disabled');
    } else {
        insLink.href = '#';
        insLink.classList.add('disabled');
    }

    // Other docs
    const otherDocsContainer = document.getElementById('viewOtherDocsList');
    if (eng.otherDocs && eng.otherDocs.trim()) {
        const urls = eng.otherDocs.split(/[\n,]+/).map(u => u.trim()).filter(Boolean);
        otherDocsContainer.innerHTML = urls.map((u, i) => `
            <a href="${escapeHtml(u)}" target="_blank" class="btn btn-sm btn-outline-secondary">
                <i class="fa-solid fa-paperclip me-1"></i> Document ${i + 1}
            </a>
        `).join('');
    } else {
        otherDocsContainer.innerHTML = '<span class="text-muted small">No additional documents recorded</span>';
    }

    // Render Dedicated Company Responsibilities
    const companiesContainer = document.getElementById('viewAssignedCompaniesContainer');
    if (companiesContainer) {
        const assigned = Array.isArray(eng.assignedCompanies) ? eng.assignedCompanies : [];
        if (assigned.length > 0) {
            companiesContainer.innerHTML = `
                <div class="row g-2">
                    ${assigned.map(c => `
                        <div class="col-md-6">
                            <div class="p-2 border rounded bg-white">
                                <div class="fw-bold small text-dark"><i class="fa-solid fa-building text-primary me-1"></i>${escapeHtml(c.companyName || c.name || 'Company')}</div>
                                <div class="small text-muted"><i class="fa-solid fa-location-dot text-danger me-1"></i>${escapeHtml(c.siteLocation || 'Coimbatore')}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            companiesContainer.innerHTML = '<span class="text-muted small">No dedicated client companies currently assigned to this engineer.</span>';
        }
    }

    updateViewModalMasking();
    document.getElementById('viewGeneratedDate').textContent = `Dossier Generated: ${new Date().toLocaleDateString('en-IN')}`;

    modalViewInstance.show();
};

function updateViewModalMasking() {
    if (!currentViewingId) return;
    const eng = engineersData[currentViewingId];
    if (!eng) return;

    const aadhaarEl = document.getElementById('viewAadhaar');
    const panEl = document.getElementById('viewPan');
    const toggleText = document.getElementById('toggleMaskText');
    const toggleBtn = document.getElementById('btnToggleMaskView');

    if (isMaskedInView) {
        aadhaarEl.textContent = maskAadhaar(eng.aadhaar);
        panEl.textContent = maskPan(eng.pan);
        toggleText.textContent = "Unmask Values";
        toggleBtn.querySelector('i').className = "fa-solid fa-eye me-1";
    } else {
        aadhaarEl.textContent = eng.aadhaar || 'Not Recorded';
        panEl.textContent = (eng.pan || 'Not Recorded').toUpperCase();
        toggleText.textContent = "Mask Values";
        toggleBtn.querySelector('i').className = "fa-solid fa-eye-slash me-1";
    }
}

// Toggle Engineer Active / Inactive
window.toggleEngineerStatus = async function(key) {
    const eng = engineersData[key];
    if (!eng) return;

    const newStatus = eng.status === 'active' ? 'inactive' : 'active';
    const confirmMsg = `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} engineer "${eng.name || eng.fullName}"?`;

    if (!confirm(confirmMsg)) return;

    try {
        const updates = {
            status: newStatus,
            updatedAt: new Date().toISOString()
        };

        // Primary update in customers/_engineers/ (cloud permitted)
        await update(ref(db, `customers/_engineers/${key}`), updates);
        // Mirror in root engineers/ (if permitted)
        update(ref(db, `engineers/${key}`), updates).catch(() => {});

        engineersData[key].status = newStatus;
        renderEngineersTable();
        updateStats();
        showToast(`Engineer status changed to ${newStatus}.`, "success");
    } catch (err) {
        console.error("Status update error:", err);
        showToast(`Error changing status: ${err.message}`, "danger");
    }
};

// Permanently Delete Engineer Action
window.deleteEngineer = async function(key) {
    const eng = engineersData[key];
    if (!eng) return;

    const engName = eng.name || eng.fullName || 'this engineer';
    const confirmMsg = `Are you sure you want to permanently delete engineer "${engName}" (${eng.engineerId || key})?\n\nThis will remove their profile from the cloud database. This action cannot be undone.`;

    if (!confirm(confirmMsg)) return;

    try {
        let deletedFromCloud = false;

        // 1. Primary deletion from customers/_engineers/ (cloud permitted)
        try {
            await remove(ref(db, `customers/_engineers/${key}`));
            deletedFromCloud = true;
        } catch (cErr) {
            console.warn("Primary customers/_engineers deletion note:", cErr);
        }

        // 2. Secondary mirror deletion from root engineers/ (non-blocking)
        try {
            await remove(ref(db, `engineers/${key}`));
            deletedFromCloud = true;
        } catch (rErr) {
            console.warn("Root engineers deletion note (rules restricted):", rErr);
        }

        delete engineersData[key];
        localStorage.setItem('cached_engineers', JSON.stringify(engineersData));

        renderEngineersTable();
        updateStats();
        populateDepartmentFilter();

        if (modalViewInstance) {
            modalViewInstance.hide();
        }

        if (deletedFromCloud) {
            showToast(`Engineer "${engName}" has been permanently deleted from cloud database.`, "success");
        } else {
            showToast(`Engineer "${engName}" removed from local list.`, "info");
        }
    } catch (err) {
        console.error("Delete engineer error:", err);
        delete engineersData[key];
        localStorage.setItem('cached_engineers', JSON.stringify(engineersData));
        renderEngineersTable();
        updateStats();
        showToast(`Removed from local view. Notice: ${err.message}`, "warning");
    }
};

// ============================================================================
// 7. FORM SUBMISSION (ADD / EDIT)
// ============================================================================
async function handleFormSubmit(e) {
    e.preventDefault();

    const saveBtn = document.getElementById('btnSaveEngineer');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Saving...';

    const key = document.getElementById('editEngineerKey').value.trim() || 
                (push(ref(db, 'engineers')).key || `eng_${Date.now()}`);

    const engineerId = document.getElementById('inputEngId').value.trim();
    const name = document.getElementById('inputEngName').value.trim();
    const employeeId = document.getElementById('inputEngEmpId').value.trim();
    const department = document.getElementById('inputEngDept').value.trim();
    const designation = document.getElementById('inputEngDesignation').value.trim();
    const status = document.getElementById('inputEngStatus').value;

    const mobile = document.getElementById('inputEngMobile').value.trim();
    const whatsapp = document.getElementById('inputEngWhatsapp').value.trim() || mobile;
    const email = document.getElementById('inputEngEmail').value.trim();
    const dob = document.getElementById('inputEngDob').value;
    const joiningDate = document.getElementById('inputEngJoiningDate').value;
    const city = document.getElementById('inputEngCity').value.trim();
    const address = document.getElementById('inputEngAddress').value.trim();

    // Sensitive fields
    const aadhaar = document.getElementById('inputEngAadhaar').value.trim();
    const pan = document.getElementById('inputEngPan').value.trim().toUpperCase();

    // URLs
    const profilePhotoUrl = document.getElementById('inputEngPhotoUrl').value.trim();
    const insurancePhotoUrl = document.getElementById('inputEngInsuranceUrl').value.trim();
    const otherDocs = document.getElementById('inputEngOtherDocs').value.trim();

    const payload = {
        id: key,
        engineerId: engineerId,
        name: name,
        fullName: name,
        employeeId: employeeId,
        department: department,
        designation: designation,
        status: status,
        mobile: mobile,
        whatsapp: whatsapp,
        phone: mobile,
        email: email,
        dob: dob,
        joiningDate: joiningDate,
        city: city,
        address: address,
        aadhaar: aadhaar,
        pan: pan,
        profilePhotoUrl: profilePhotoUrl,
        insurancePhotoUrl: insurancePhotoUrl,
        otherDocs: otherDocs,
        updatedAt: new Date().toISOString()
    };

    if (!currentEditingId) {
        payload.createdAt = new Date().toISOString();
    }

    try {
        // Primary save to Firebase: customers/_engineers/{key} (cloud authorized)
        let savedToCloud = false;
        try {
            await set(ref(db, `customers/_engineers/${key}`), payload);
            savedToCloud = true;
        } catch (cErr) {
            console.warn("Primary customers/_engineers save note:", cErr);
        }

        // Secondary mirror save to root engineers/{key} (safe catch)
        try {
            await set(ref(db, `engineers/${key}`), payload);
            savedToCloud = true;
        } catch (rErr) {
            console.warn("Root engineers save note (rules restricted):", rErr);
        }

        engineersData[key] = payload;
        localStorage.setItem('cached_engineers', JSON.stringify(engineersData));

        modalFormInstance.hide();
        renderEngineersTable();
        updateStats();
        populateDepartmentFilter();

        if (savedToCloud) {
            showToast(`Engineer "${name}" profile saved to cloud successfully!`, "success");
        } else {
            showToast(`Engineer "${name}" saved to local cache.`, "info");
        }
    } catch (err) {
        console.error("Save engineer error:", err);
        // Fallback: local memory save
        engineersData[key] = payload;
        localStorage.setItem('cached_engineers', JSON.stringify(engineersData));
        modalFormInstance.hide();
        renderEngineersTable();
        updateStats();
        showToast(`Saved to local memory. Notice: ${err.message}`, "warning");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk me-1"></i> Save Engineer Profile';
    }
}

// ============================================================================
// 8. STRING HELPERS
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
