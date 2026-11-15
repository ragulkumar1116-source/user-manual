/**
 * Aadhav Intech - Bulk Daily Service Dispatch & Multiple Company Scheduling (js/dispatch.js)
 * Enterprise Portal - Multi-company Assignment Engine, Firebase Realtime Database & WhatsApp Dispatch Queue
 */

import { db, ref, get, set, update, remove, onValue, push } from './firebase.js';
import { showToast, loadCompanySettings } from './utils.js';

// Application State
let customersData = {};
let engineersData = {};
let preparedAssignments = [];
let dispatchBatchesData = {};

// Active WhatsApp Queue State
let activeQueueBatchId = null;
let activeQueueIndex = 0;
let activeQueueItems = [];

// Bootstrap Modal Instances
let modalAssignmentInstance = null;
let modalWhatsappInstance = null;

// Default Seed Customers (Aligned with Prompt Section 4)
const defaultSeedCustomers = {
    comp_global_calcium: {
        id: "comp_global_calcium",
        companyName: "Global Calcium Pvt Ltd",
        customerName: "S. Murugan",
        contactPerson: "S. Murugan",
        designation: "Plant Maintenance Manager",
        phone: "9842109876",
        mobile: "9842109876",
        email: "maintenance@globalcalcium.com",
        siteLocation: "Coimbatore / Hosur Region",
        address: "Plot 125/1, Industrial Complex, Coimbatore Region, Tamil Nadu 641021",
        instruments: [
            { name: "OCEMS", model: "L-800", serial: "GC-OCEMS-2024-09" },
            { name: "Dust Monitor", model: "AAD-CEMS-200", serial: "DM-2023-45" },
            { name: "Flow Meter", model: "EMFM-100", serial: "FM-8891-B" }
        ],
        createdAt: new Date().toISOString()
    },
    comp_adithya: {
        id: "comp_adithya",
        companyName: "Adithya Tech Park",
        customerName: "A. Esaimaran",
        contactPerson: "A. Esaimaran",
        designation: "Facility Engineer",
        phone: "9944037958",
        mobile: "9944037958",
        email: "Aesaimaran27@gmail.com",
        siteLocation: "Saravanampatti, Coimbatore",
        address: "368, Thudiyalur Rd, Vasantham Nagar, Saravanampatti, Coimbatore, Tamil Nadu 641035",
        instruments: [
            { name: "OCEMS", model: "L - 600", serial: "IN2304 – 112B" },
            { name: "pH Analyzer", model: "AIT-PH-400", serial: "PH-2024-118" }
        ],
        createdAt: new Date().toISOString()
    },
    comp_ganga: {
        id: "comp_ganga",
        companyName: "Ganga Hospital",
        customerName: "Hospital Operations",
        contactPerson: "Dr. K. Senthil",
        designation: "Bio-Medical In-charge",
        phone: "9842211223",
        mobile: "9842211223",
        email: "operations@gangahospital.com",
        siteLocation: "Mettupalayam Road, Coimbatore",
        address: "313, Mettupalayam Road, near Saibaba Koil, Coimbatore, Tamil Nadu 641043",
        instruments: [
            { name: "OCEMS", model: "L - 600", serial: "IN2209 – 087C" },
            { name: "ETP Sensor Suite", model: "AIT-ETP-100", serial: "ETP-9921" }
        ],
        createdAt: new Date().toISOString()
    },
    comp_everest: {
        id: "comp_everest",
        companyName: "Everest Industries Ltd",
        customerName: "K. Mohan",
        contactPerson: "K. Mohan",
        designation: "Safety & Plant Head",
        phone: "9790030842",
        mobile: "9790030842",
        email: "mohan.k@everestind.com",
        siteLocation: "Podanur, Coimbatore",
        address: "Podanur Road, Chettipalayam, Coimbatore, Tamil Nadu 641201",
        instruments: [
            { name: "CEMS Dust Monitor", model: "SPM-2026", serial: "EV-CEMS-101" },
            { name: "Multi-Gas Analyzer", model: "MGA-9000", serial: "GA-4402" }
        ],
        createdAt: new Date().toISOString()
    }
};

// ============================================================================
// 1. INITIALIZATION & LIFECYCLE
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. UI basics
    startClock();
    setupThemeToggle();
    setupMobileSidebar();

    // 2. Initialize Bootstrap Modals immediately
    modalAssignmentInstance = new bootstrap.Modal(document.getElementById('modalAssignmentForm'));
    modalWhatsappInstance = new bootstrap.Modal(document.getElementById('modalWhatsappDispatch'));

    // 3. Setup Listeners immediately
    setupEventListeners();

    // 4. Restore any draft assignments from localStorage
    restoreCachedAssignments();

    // 5. Background loads: Company branding, Customers, Engineers, Batches
    loadCompanySettings().catch(() => {});
    listenToCustomers();
    listenToEngineers();
    listenToDispatchBatches();

    // Check if opened with pre-selected company (e.g. from companies.html)
    const urlParams = new URLSearchParams(window.location.search);
    const preCompId = urlParams.get('companyId');
    if (preCompId) {
        setTimeout(() => {
            openAddAssignmentModal();
            const selectComp = document.getElementById('modalSelectCompany');
            if (selectComp) {
                selectComp.value = preCompId;
                handleCompanySelected(preCompId);
            }
        }, 700);
    }
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
// 2. FIREBASE REALTIME LISTENERS
// ============================================================================

// 1. Listen to Customers Database
function listenToCustomers() {
    const custRef = ref(db, 'customers');
    onValue(custRef, async (snapshot) => {
        const data = snapshot.val() || {};
        const validCompanies = {};

        // Filter out internal system nodes starting with '_'
        Object.keys(data).forEach(k => {
            if (!k.startsWith('_')) {
                validCompanies[k] = { id: k, ...data[k] };
            }
        });

        // If no customers or fewer than 2 exist, seed demo companies
        if (Object.keys(validCompanies).length < 2) {
            Object.keys(defaultSeedCustomers).forEach(k => {
                if (!validCompanies[k]) {
                    validCompanies[k] = defaultSeedCustomers[k];
                    set(ref(db, `customers/${k}`), defaultSeedCustomers[k]).catch(() => {});
                }
            });
        }

        customersData = validCompanies;
        localStorage.setItem('cached_dispatch_customers', JSON.stringify(customersData));
        populateCompanyDropdown();
    }, (err) => {
        console.warn("Customers listener warning:", err);
        const cached = localStorage.getItem('cached_dispatch_customers');
        if (cached) {
            customersData = JSON.parse(cached);
        } else {
            customersData = { ...defaultSeedCustomers };
        }
        populateCompanyDropdown();
    });
}

// 2. Listen to Engineers Database
function listenToEngineers() {
    // Primary: customers/_engineers (permitted)
    const primaryRef = ref(db, 'customers/_engineers');
    onValue(primaryRef, (snapshot) => {
        const data = snapshot.val();
        if (data && Object.keys(data).length > 0) {
            engineersData = data;
            localStorage.setItem('cached_dispatch_engineers', JSON.stringify(engineersData));
            populateEngineerDropdown();
        }
    }, () => {});

    // Secondary: root engineers (mirror)
    try {
        const engRef = ref(db, 'engineers');
        onValue(engRef, (snapshot) => {
            const data = snapshot.val();
            if (data && Object.keys(data).length > 0) {
                engineersData = { ...engineersData, ...data };
                localStorage.setItem('cached_dispatch_engineers', JSON.stringify(engineersData));
                populateEngineerDropdown();
            }
        }, () => {});
    } catch (e) {}

    const cached = localStorage.getItem('cached_dispatch_engineers');
    if (cached) {
        try {
            engineersData = JSON.parse(cached);
            populateEngineerDropdown();
        } catch (e) {}
    }
}

// 3. Listen to Dispatch Batches History
function listenToDispatchBatches() {
    // Primary: customers/dispatch_batches
    const primaryBatchesRef = ref(db, 'customers/dispatch_batches');
    onValue(primaryBatchesRef, (snapshot) => {
        const data = snapshot.val() || {};
        dispatchBatchesData = data;
        renderBatchesTable();
    }, () => {});

    // Secondary: root dispatch_batches
    try {
        const batchesRef = ref(db, 'dispatch_batches');
        onValue(batchesRef, (snapshot) => {
            const data = snapshot.val() || {};
            dispatchBatchesData = { ...dispatchBatchesData, ...data };
            renderBatchesTable();
        }, () => {});
    } catch (e) {}
}

// ============================================================================
// 3. DROPDOWN POPULATION & AUTO-RETRIEVAL
// ============================================================================

function populateCompanyDropdown() {
    const select = document.getElementById('modalSelectCompany');
    if (!select) return;
    const currentVal = select.value;

    select.innerHTML = '<option value="">-- Choose a company from database --</option>';

    // Deduplicate companies by normalized company name (clean duplicate double entries)
    const seenNames = new Set();
    const uniqueCompanies = [];

    // Prioritize richer records (with phone/mobile or instruments)
    const allList = Object.values(customersData).sort((a, b) => {
        const aRichness = (a.mobile || a.phone ? 2 : 0) + (a.instruments ? 1 : 0);
        const bRichness = (b.mobile || b.phone ? 2 : 0) + (b.instruments ? 1 : 0);
        if (bRichness !== aRichness) return bRichness - aRichness;
        return (a.companyName || a.name || '').localeCompare(b.companyName || b.name || '');
    });

    allList.forEach(c => {
        const rawName = (c.companyName || c.name || c.cName || c.customerName || '').trim();
        if (!rawName) return;
        const norm = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seenNames.has(norm)) return; // Prevents double entry of any company
        seenNames.add(norm);
        uniqueCompanies.push(c);
    });

    // Alphabetical sort for dropdown display
    uniqueCompanies.sort((a, b) => 
        (a.companyName || a.name || '').localeCompare(b.companyName || b.name || '')
    );

    uniqueCompanies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id || c.companyId;
        const loc = c.siteLocation || c.address || 'Coimbatore';
        opt.textContent = `${c.companyName || c.name || 'Unnamed'} - ${loc}`;
        select.appendChild(opt);
    });

    if (currentVal && customersData[currentVal]) {
        select.value = currentVal;
    }
}

function populateEngineerDropdown() {
    const select = document.getElementById('modalSelectEngineer');
    if (!select) return;
    const currentVal = select.value;

    select.innerHTML = '<option value="">-- Choose site engineer --</option>';
    const sorted = Object.values(engineersData).filter(e => e.status !== 'inactive').sort((a, b) => 
        (a.name || a.fullName || '').localeCompare(b.name || b.fullName || '')
    );

    sorted.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id || e.engineerId;
        opt.textContent = `${e.name || e.fullName || 'Engineer'} (${e.department || 'Service'}) - 📞 ${e.mobile || e.phone || ''}`;
        select.appendChild(opt);
    });

    if (currentVal && engineersData[currentVal]) {
        select.value = currentVal;
    }
}

// Handle Company Selection in Modal -> Auto-retrieve fields
function handleCompanySelected(companyId) {
    const comp = customersData[companyId];
    if (!comp) return;

    document.getElementById('modalCompanyId').value = comp.id || companyId;
    document.getElementById('modalCompanyLocation').value = comp.siteLocation || comp.locationUrl || 'Coimbatore';
    
    const contact = comp.contactPerson || comp.customerName || 'Maintenance Lead';
    const desig = comp.designation ? ` (${comp.designation})` : '';
    document.getElementById('modalCompanyContact').value = `${contact}${desig}`;
    document.getElementById('modalCompanyMobile').value = comp.mobile || comp.phone || '';
    document.getElementById('modalCompanyAddress').value = comp.address || comp.siteLocation || '';

    // Render Instruments as selectable chips
    renderInstrumentChips(comp.instruments || []);

    // Auto-select responsible engineer if assigned!
    const respEngId = comp.responsibleEngineerId || comp.assignedEngineerId;
    if (respEngId && engineersData[respEngId]) {
        const engSelect = document.getElementById('modalSelectEngineer');
        if (engSelect) {
            engSelect.value = respEngId;
            handleEngineerSelected(respEngId);
            showToast(`Dedicated site engineer ${engineersData[respEngId].name || 'assigned'} auto-selected for this plant.`, "info");
        }
    }
}

function renderInstrumentChips(instruments) {
    const container = document.getElementById('modalInstrumentsContainer');
    if (!container) return;

    if (!instruments || instruments.length === 0) {
        container.innerHTML = '<span class="text-muted small p-1">No registered instruments recorded for this company. Enter instruments below.</span>';
        document.getElementById('modalCustomInstruments').value = 'OCEMS System';
        return;
    }

    let html = '';
    instruments.forEach((inst, index) => {
        const label = `${inst.name || 'Instrument'} ${inst.model ? '(' + inst.model + ')' : ''} ${inst.serial ? '[SN: ' + inst.serial + ']' : ''}`;
        html += `
            <div class="inst-chip selected" data-index="${index}" onclick="this.classList.toggle('selected'); window.updateCustomInstrumentsField();">
                <i class="fa-solid fa-microchip text-primary"></i>
                <span>${escapeHtml(label)}</span>
            </div>
        `;
    });
    container.innerHTML = html;
    window.updateCustomInstrumentsField();
}

window.updateCustomInstrumentsField = function() {
    const chips = document.querySelectorAll('#modalInstrumentsContainer .inst-chip.selected');
    const selectedNames = Array.from(chips).map(c => c.querySelector('span')?.textContent?.trim()).filter(Boolean);
    document.getElementById('modalCustomInstruments').value = selectedNames.join(', ');
};

// Handle Engineer Selection in Modal -> Auto-retrieve fields
function handleEngineerSelected(engId) {
    const eng = engineersData[engId];
    if (!eng) return;

    document.getElementById('modalEngineerId').value = eng.engineerId || eng.id || engId;
    document.getElementById('modalEngineerWhatsapp').value = eng.whatsapp || eng.mobile || '';
    document.getElementById('modalEngineerMobile').value = eng.mobile || eng.phone || '';
}

// ============================================================================
// 4. ASSIGNMENT BUILDER & MULTI-COMPANY SCHEDULING (Section 4)
// ============================================================================

function generateNextServiceId() {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(100 + Math.random() * 900);
    const count = preparedAssignments.length + 1;
    return `AIT-SRV-${dateStr}-${String(count).padStart(2, '0')}${randNum}`;
}

function openAddAssignmentModal(editIndex = null) {
    const form = document.getElementById('formAssignment');
    form.reset();

    const isEdit = editIndex !== null && preparedAssignments[editIndex];
    document.getElementById('modalAssignmentIndex').value = isEdit ? editIndex : '';
    document.getElementById('modalAssignmentTitle').innerHTML = isEdit
        ? '<i class="fa-solid fa-pen-to-square text-primary me-2"></i>Edit Company Service Assignment'
        : '<i class="fa-solid fa-building-circle-check text-primary me-2"></i>Add Company Service Assignment';

    // Set Default Planned Date to Today / Tomorrow
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('modalPlannedDate').value = today;

    if (isEdit) {
        const item = preparedAssignments[editIndex];
        document.getElementById('modalSelectCompany').value = item.companyId || '';
        handleCompanySelected(item.companyId);

        document.getElementById('modalSelectEngineer').value = item.engineerId || '';
        handleEngineerSelected(item.engineerId);

        document.getElementById('modalServiceId').value = item.serviceId;
        document.getElementById('modalPlannedDate').value = item.plannedDate;
        document.getElementById('modalPriority').value = item.priority || 'Normal';
        document.getElementById('modalServiceType').value = item.serviceType || 'OCEMS AMC';
        document.getElementById('modalWorkInstructions').value = item.workInstructions || '';
        document.getElementById('modalAdditionalInstructions').value = item.additionalInstructions || '';
        document.getElementById('modalCustomInstruments').value = item.instruments || '';
    } else {
        document.getElementById('modalServiceId').value = generateNextServiceId();
        document.getElementById('modalServiceType').value = 'OCEMS AMC';
        document.getElementById('modalPriority').value = 'Normal';
        document.getElementById('modalWorkInstructions').value = 'Check instrument communication, sensor calibration, optical lens alignment, and parameter readings.';
        document.getElementById('modalAdditionalInstructions').value = 'Wear company badge and safety shoes at entrance.';
    }

    modalAssignmentInstance.show();
}

function saveAssignmentFromModal(keepOpenForNext = false) {
    const companySelect = document.getElementById('modalSelectCompany');
    const engineerSelect = document.getElementById('modalSelectEngineer');

    const companyId = companySelect.value;
    const engineerId = engineerSelect.value;
    const plannedDate = document.getElementById('modalPlannedDate').value;
    const serviceType = document.getElementById('modalServiceType').value.trim();
    const workInstructions = document.getElementById('modalWorkInstructions').value.trim();

    if (!companyId) {
        showToast("Please select a company for this assignment.", "warning");
        companySelect.focus();
        return false;
    }
    if (!engineerId) {
        showToast("Please assign a site engineer for this company.", "warning");
        engineerSelect.focus();
        return false;
    }
    if (!plannedDate) {
        showToast("Please select the planned service date.", "warning");
        return false;
    }
    if (!serviceType) {
        showToast("Please enter or select a service type.", "warning");
        return false;
    }
    if (!workInstructions) {
        showToast("Please provide work instructions for the engineer.", "warning");
        return false;
    }

    const comp = customersData[companyId] || {};
    const eng = engineersData[engineerId] || {};

    const serviceId = document.getElementById('modalServiceId').value.trim() || generateNextServiceId();
    const priority = document.getElementById('modalPriority').value;
    const instruments = document.getElementById('modalCustomInstruments').value.trim() || 'General Instruments';
    const additionalInstructions = document.getElementById('modalAdditionalInstructions').value.trim();

    const editIndex = document.getElementById('modalAssignmentIndex').value;

    const assignmentData = {
        serviceId: serviceId,
        companyId: companyId,
        companyName: comp.companyName || document.getElementById('modalSelectCompany').selectedOptions[0]?.text?.split('-')[0]?.trim() || 'Company',
        companyLocation: document.getElementById('modalCompanyLocation').value.trim() || comp.siteLocation || 'Coimbatore',
        companyAddress: document.getElementById('modalCompanyAddress').value.trim() || comp.address || 'Company Address',
        contactPerson: comp.contactPerson || comp.customerName || 'Contact Person',
        contactDesignation: comp.designation || '',
        contactMobile: document.getElementById('modalCompanyMobile').value.trim() || comp.mobile || comp.phone || '',
        engineerId: engineerId,
        engineerName: eng.name || eng.fullName || 'Site Engineer',
        engineerWhatsapp: document.getElementById('modalEngineerWhatsapp').value.trim() || eng.whatsapp || eng.mobile || '',
        engineerMobile: document.getElementById('modalEngineerMobile').value.trim() || eng.mobile || '',
        serviceType: serviceType,
        plannedDate: plannedDate,
        priority: priority,
        instruments: instruments,
        workInstructions: workInstructions,
        additionalInstructions: additionalInstructions,
        status: 'assigned',
        whatsappStatus: 'pending', // pending, sent, skipped
        createdAt: new Date().toISOString()
    };

    if (editIndex !== '' && !isNaN(parseInt(editIndex, 10))) {
        preparedAssignments[parseInt(editIndex, 10)] = assignmentData;
        showToast(`Updated assignment for ${assignmentData.companyName}.`, "success");
    } else {
        preparedAssignments.push(assignmentData);
        showToast(`Added assignment #${preparedAssignments.length}: ${assignmentData.companyName}.`, "success");
    }

    saveCachedAssignments();
    renderAssignmentsView();

    if (keepOpenForNext) {
        // Clear for next company entry
        document.getElementById('modalAssignmentIndex').value = '';
        document.getElementById('modalSelectCompany').value = '';
        document.getElementById('modalCompanyLocation').value = '';
        document.getElementById('modalCompanyContact').value = '';
        document.getElementById('modalCompanyMobile').value = '';
        document.getElementById('modalCompanyId').value = '';
        document.getElementById('modalCompanyAddress').value = '';
        document.getElementById('modalInstrumentsContainer').innerHTML = '<span class="text-muted small p-1">Select a company first to see its registered instruments.</span>';
        document.getElementById('modalCustomInstruments').value = '';
        document.getElementById('modalServiceId').value = generateNextServiceId();
        document.getElementById('modalSelectCompany').focus();
    } else {
        modalAssignmentInstance.hide();
    }

    return true;
}

// Render visual cards and summary table
function renderAssignmentsView() {
    const container = document.getElementById('assignmentsContainer');
    const tbody = document.getElementById('summaryTableBody');
    const badgeCount = document.getElementById('badgeAssignmentsCount');
    const badgeTable = document.getElementById('badgeTableTotal');

    const total = preparedAssignments.length;
    badgeCount.textContent = `${total} Prepared`;
    badgeTable.textContent = `${total} Ready to Dispatch`;

    if (total === 0) {
        container.innerHTML = `
            <div class="card p-5 text-center text-muted border-dashed" id="emptyStatePlaceholder">
                <i class="fa-solid fa-building-circle-check fa-3x mb-3 text-secondary opacity-50"></i>
                <h5>No Companies Scheduled In This Session</h5>
                <p class="small text-muted mb-3">Prepare multiple company visits by clicking <strong>"Add Company"</strong> or click <strong>"Load Example Plan"</strong> to auto-fill sample assignments (Global Calcium, Adithya Tech Park, etc.)</p>
                <div>
                    <button class="btn btn-primary btn-sm me-2" onclick="document.getElementById('btnAddCompanyBtn').click()">
                        <i class="fa-solid fa-plus me-1"></i> Add Company
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="document.getElementById('btnLoadDemoAssignments').click()">
                        <i class="fa-solid fa-wand-magic-sparkles me-1"></i> Load Example Plan
                    </button>
                </div>
            </div>`;
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-4 text-muted">
                    No assignments prepared yet. Click "Add Company" above.
                </td>
            </tr>`;
        updateDashboardMetrics();
        return;
    }

    // 1. Render Visual Assignment Cards
    let cardsHtml = '';
    preparedAssignments.forEach((item, index) => {
        const priorityClass = `priority-${(item.priority || 'Normal').toLowerCase()}`;
        const whatsappBadge = item.whatsappStatus === 'sent'
            ? `<span class="badge badge-soft-success"><i class="fa-solid fa-check me-1"></i>Sent</span>`
            : item.whatsappStatus === 'skipped'
            ? `<span class="badge badge-soft-secondary">Skipped</span>`
            : `<span class="badge badge-soft-warning"><i class="fa-solid fa-clock me-1"></i>Pending</span>`;

        cardsHtml += `
            <div class="assignment-card mb-3">
                <div class="assignment-card-header">
                    <div class="d-flex align-items-center gap-2">
                        <span class="assignment-number-badge">Assignment #${index + 1}</span>
                        <h6 class="mb-0 fw-bold text-dark">${escapeHtml(item.companyName)}</h6>
                        <span class="text-muted small">&bull; ${escapeHtml(item.companyLocation)}</span>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="priority-pill ${priorityClass}">${escapeHtml(item.priority || 'Normal')}</span>
                        ${whatsappBadge}
                        <div class="btn-group btn-group-sm ms-2">
                            <button class="btn btn-outline-primary btn-sm" onclick="window.previewSingleAssignmentWhatsApp(${index})" title="Preview WhatsApp Dispatch Message">
                                <i class="fa-brands fa-whatsapp text-success"></i> Preview
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="window.editAssignment(${index})" title="Edit Assignment">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="window.removeAssignment(${index})" title="Remove Assignment">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="p-3">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <div class="small text-muted mb-1"><i class="fa-solid fa-user-gear text-primary me-1"></i> Assigned Site Engineer:</div>
                            <div class="fw-bold">${escapeHtml(item.engineerName)}</div>
                            <div class="small text-success mt-1">
                                <i class="fa-brands fa-whatsapp me-1"></i>
                                <a href="https://wa.me/${cleanPhone(item.engineerWhatsapp)}" target="_blank" class="text-success text-decoration-none">
                                    ${escapeHtml(item.engineerWhatsapp)}
                                </a>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="small text-muted mb-1"><i class="fa-solid fa-calendar-day text-primary me-1"></i> Planned Date & Service Type:</div>
                            <div class="fw-semibold">${formatDate(item.plannedDate)} &bull; <span class="badge bg-light text-dark border">${escapeHtml(item.serviceType)}</span></div>
                            <div class="small text-muted mt-1 font-monospace">Service ID: ${escapeHtml(item.serviceId)}</div>
                        </div>
                        <div class="col-md-4">
                            <div class="small text-muted mb-1"><i class="fa-solid fa-microchip text-primary me-1"></i> Instruments:</div>
                            <div class="small fw-semibold text-truncate" title="${escapeHtml(item.instruments)}">${escapeHtml(item.instruments)}</div>
                            <div class="small text-muted mt-1">Contact: ${escapeHtml(item.contactPerson)} (${escapeHtml(item.contactMobile || '-')})</div>
                        </div>
                        <div class="col-12 pt-2 border-top">
                            <div class="small text-muted"><i class="fa-solid fa-clipboard-list text-primary me-1"></i> Work Instructions:</div>
                            <div class="small bg-light p-2 rounded mt-1 border text-dark">${escapeHtml(item.workInstructions)}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = cardsHtml;

    // 2. Render Summary Table (Section 8)
    let tableHtml = '';
    preparedAssignments.forEach((item, index) => {
        const priorityClass = `priority-${(item.priority || 'Normal').toLowerCase()}`;
        const whatsappBadge = item.whatsappStatus === 'sent'
            ? `<span class="badge badge-soft-success">Sent</span>`
            : item.whatsappStatus === 'skipped'
            ? `<span class="badge badge-soft-secondary">Skipped</span>`
            : `<span class="badge badge-soft-warning">Pending</span>`;

        tableHtml += `
            <tr>
                <td class="fw-bold text-muted">${index + 1}</td>
                <td>
                    <div class="fw-bold text-dark">${escapeHtml(item.companyName)}</div>
                    <div class="small text-muted">${escapeHtml(item.companyLocation)}</div>
                </td>
                <td>
                    <div class="fw-semibold">${escapeHtml(item.engineerName)}</div>
                    <div class="small text-success"><i class="fa-brands fa-whatsapp me-1"></i>${escapeHtml(item.engineerWhatsapp)}</div>
                </td>
                <td>
                    <span class="small fw-semibold">${formatDate(item.plannedDate)}</span>
                </td>
                <td>
                    <span class="badge bg-light text-dark border">${escapeHtml(item.serviceType)}</span>
                </td>
                <td>
                    <span class="priority-pill ${priorityClass}">${escapeHtml(item.priority || 'Normal')}</span>
                </td>
                <td>
                    <div class="small text-truncate" style="max-width: 160px;" title="${escapeHtml(item.instruments)}">${escapeHtml(item.instruments)}</div>
                </td>
                <td>
                    ${whatsappBadge}
                </td>
                <td class="text-end">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="window.previewSingleAssignmentWhatsApp(${index})" title="Preview WhatsApp Notice">
                            <i class="fa-brands fa-whatsapp text-success"></i>
                        </button>
                        <button class="btn btn-outline-secondary" onclick="window.editAssignment(${index})" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="window.removeAssignment(${index})" title="Delete">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = tableHtml;

    updateDashboardMetrics();
}

function updateDashboardMetrics() {
    const total = preparedAssignments.length;
    const uniqueCompanies = new Set(preparedAssignments.map(a => a.companyId)).size;
    const uniqueEngineers = new Set(preparedAssignments.map(a => a.engineerId)).size;
    const highPriority = preparedAssignments.filter(a => a.priority === 'High' || a.priority === 'Urgent').length;
    const sentCount = preparedAssignments.filter(a => a.whatsappStatus === 'sent').length;
    const pendingCount = preparedAssignments.filter(a => a.whatsappStatus !== 'sent').length;

    document.getElementById('statSelectedCompanies').textContent = uniqueCompanies;
    document.getElementById('statAssignedEngineers').textContent = uniqueEngineers;
    document.getElementById('statTotalAssignments').textContent = total;
    document.getElementById('statHighPriority').textContent = highPriority;
    document.getElementById('statPendingMessages').textContent = pendingCount;
    document.getElementById('statSentMessages').textContent = sentCount;
}

// LocalStorage caching
function saveCachedAssignments() {
    localStorage.setItem('cached_prepared_assignments', JSON.stringify(preparedAssignments));
}

function restoreCachedAssignments() {
    const cached = localStorage.getItem('cached_prepared_assignments');
    if (cached) {
        try {
            preparedAssignments = JSON.parse(cached);
            renderAssignmentsView();
        } catch (e) {}
    }
}

// Window Exposed Actions
window.editAssignment = function(index) {
    openAddAssignmentModal(index);
};

window.removeAssignment = function(index) {
    if (confirm(`Remove assignment #${index + 1} (${preparedAssignments[index]?.companyName})?`)) {
        preparedAssignments.splice(index, 1);
        saveCachedAssignments();
        renderAssignmentsView();
        showToast("Assignment removed.", "info");
    }
};

window.previewSingleAssignmentWhatsApp = function(index) {
    const item = preparedAssignments[index];
    if (!item) return;

    activeQueueBatchId = null;
    activeQueueIndex = 0;
    activeQueueItems = [item];

    launchWhatsAppQueueModal("Single Notice Preview", 1);
};

// ============================================================================
// 5. DEMO PLAN SEEDING (Matches Section 4 Prompt Example)
// ============================================================================
function loadDemoAssignments() {
    // Find or fallback engineers
    const engKeys = Object.keys(engineersData);
    const engRahul = engKeys.find(k => (engineersData[k].name || '').includes('Rahul')) || engKeys[0] || 'eng_rahul_krish';
    const engKarthick = engKeys.find(k => (engineersData[k].name || '').includes('Karthick')) || engKeys[1] || 'eng_karthick_selvam';
    const engRamesh = engKeys.find(k => (engineersData[k].name || '').includes('Ramesh')) || engKeys[2] || 'eng_ramesh_kumar';

    const rObj = engineersData[engRahul] || { name: 'Rahul Krish', whatsapp: '9790030842', mobile: '9790030842' };
    const kObj = engineersData[engKarthick] || { name: 'Karthick Selvam', whatsapp: '9944037958', mobile: '9944037958' };
    const mObj = engineersData[engRamesh] || { name: 'Ramesh Kumar', whatsapp: '9842234567', mobile: '9842234567' };

    const todayStr = new Date().toISOString().slice(0, 10);

    preparedAssignments = [
        {
            serviceId: `AIT-SRV-20261118-001`,
            companyId: 'comp_global_calcium',
            companyName: 'Global Calcium Pvt Ltd',
            companyLocation: 'Coimbatore',
            companyAddress: 'Plot 125/1, Industrial Complex, Coimbatore Region, Tamil Nadu 641021',
            contactPerson: 'S. Murugan',
            contactDesignation: 'Plant Maintenance Manager',
            contactMobile: '9842109876',
            engineerId: engRahul,
            engineerName: rObj.name || 'Rahul Krish',
            engineerWhatsapp: rObj.whatsapp || rObj.mobile || '9790030842',
            engineerMobile: rObj.mobile || '9790030842',
            serviceType: 'OCEMS AMC',
            plannedDate: todayStr,
            priority: 'Normal',
            instruments: 'OCEMS L-800, Dust Monitor AAD-CEMS-200',
            workInstructions: 'Check OCEMS communication and sensors. Clean optical lenses and verify zero/span calibration values.',
            additionalInstructions: 'Report to Safety Department before entering stack tower area.',
            status: 'assigned',
            whatsappStatus: 'pending',
            createdAt: new Date().toISOString()
        },
        {
            serviceId: `AIT-SRV-20261118-002`,
            companyId: 'comp_adithya',
            companyName: 'Adithya Tech Park',
            companyLocation: 'Coimbatore',
            companyAddress: '368, Thudiyalur Rd, Vasantham Nagar, Saravanampatti, Coimbatore, Tamil Nadu 641035',
            contactPerson: 'A. Esaimaran',
            contactDesignation: 'Facility Engineer',
            contactMobile: '9944037958',
            engineerId: engKarthick,
            engineerName: kObj.name || 'Karthick Selvam',
            engineerWhatsapp: kObj.whatsapp || kObj.mobile || '9944037958',
            engineerMobile: kObj.mobile || '9944037958',
            serviceType: 'General Service',
            plannedDate: todayStr,
            priority: 'High',
            instruments: 'OCEMS L - 600, pH Analyzer AIT-PH-400',
            workInstructions: 'Check instrument communication and complete maintenance. Inspect 4-20mA analog loops.',
            additionalInstructions: 'Coordinate with Mr. Esaimaran on arrival.',
            status: 'assigned',
            whatsappStatus: 'pending',
            createdAt: new Date().toISOString()
        },
        {
            serviceId: `AIT-SRV-20261119-003`,
            companyId: 'comp_ganga',
            companyName: 'Ganga Hospital',
            companyLocation: 'Mettupalayam Road, Coimbatore',
            companyAddress: '313, Mettupalayam Road, near Saibaba Koil, Coimbatore, Tamil Nadu 641043',
            contactPerson: 'Dr. K. Senthil',
            contactDesignation: 'Bio-Medical Lead',
            contactMobile: '9842211223',
            engineerId: engRamesh,
            engineerName: mObj.name || 'Ramesh Kumar',
            engineerWhatsapp: mObj.whatsapp || mObj.mobile || '9842234567',
            engineerMobile: mObj.mobile || '9842234567',
            serviceType: 'Instrument Maintenance',
            plannedDate: todayStr,
            priority: 'Medium',
            instruments: 'OCEMS L - 600, ETP Sensor Suite',
            workInstructions: 'Complete scheduled maintenance on ETP analyzers. Verify water quality sensor probes.',
            additionalInstructions: 'Strict adherence to hospital sanitation protocols.',
            status: 'assigned',
            whatsappStatus: 'pending',
            createdAt: new Date().toISOString()
        }
    ];

    saveCachedAssignments();
    renderAssignmentsView();
    showToast("Example scheduling plan loaded successfully (3 assignments prepared).", "success");
}

// ============================================================================
// 6. SINGLE SUBMIT BUTTON & BULK DISPATCH ENGINE (Section 5 & 6)
// ============================================================================

async function handleBulkSubmitAndDispatch() {
    if (preparedAssignments.length === 0) {
        showToast("Please prepare at least one company assignment before submitting.", "warning");
        openAddAssignmentModal();
        return;
    }

    const btn = document.getElementById('btnBulkSubmitAndDispatch');
    const bottomBtn = document.getElementById('btnBottomSubmitAll');
    btn.disabled = true;
    if (bottomBtn) bottomBtn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Saving to Firebase...';

    const now = new Date();
    const batchId = `BATCH-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${now.toTimeString().slice(0, 8).replace(/:/g, '')}`;
    const portalUrl = getEngineerPortalUrl();

    try {
        const batchAssignmentsRecord = {};
        const dispatchStatusRecord = {};

        // 1. Prepare and Save each assignment into `daily_tasks/{taskId}`
        for (let i = 0; i < preparedAssignments.length; i++) {
            const item = preparedAssignments[i];
            const taskId = item.taskId || push(ref(db, 'daily_tasks')).key || `task_${Date.now()}_${i}`;
            item.taskId = taskId;
            item.batchId = batchId;

            // Generate WhatsApp message per Section 6
            const whatsappMessage = generateWhatsAppMessage(item, portalUrl);
            item.whatsappMessage = whatsappMessage;

            const taskPayload = {
                taskId: taskId,
                serviceId: item.serviceId,
                batchId: batchId,
                companyId: item.companyId,
                companyName: item.companyName,
                companyLocation: item.companyLocation,
                companyAddress: item.companyAddress,
                contactPerson: item.contactPerson,
                contactDesignation: item.contactDesignation || '',
                contactMobile: item.contactMobile,
                engineerId: item.engineerId,
                engineerName: item.engineerName,
                engineerWhatsapp: item.engineerWhatsapp,
                engineerMobile: item.engineerMobile,
                serviceType: item.serviceType,
                plannedDate: item.plannedDate,
                priority: item.priority,
                instruments: item.instruments,
                workInstructions: item.workInstructions,
                additionalInstructions: item.additionalInstructions || '',
                status: item.status || 'assigned',
                assignedBy: sessionStorage.getItem('user_name') || 'Administrator',
                whatsappStatus: item.whatsappStatus || 'pending',
                createdAt: item.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Write to Firebase: primary customers/daily_tasks/{taskId} (cloud permitted)
            await set(ref(db, `customers/daily_tasks/${taskId}`), taskPayload);
            // Secondary mirror to root daily_tasks/
            set(ref(db, `daily_tasks/${taskId}`), taskPayload).catch(() => {});

            batchAssignmentsRecord[taskId] = {
                serviceId: item.serviceId,
                companyName: item.companyName,
                engineerName: item.engineerName,
                engineerWhatsapp: item.engineerWhatsapp,
                plannedDate: item.plannedDate,
                priority: item.priority
            };
            dispatchStatusRecord[item.serviceId] = item.whatsappStatus || 'pending';
        }

        // 2. Write Batch Summary to customers/dispatch_batches/{batchId}
        const batchPayload = {
            batchId: batchId,
            createdBy: sessionStorage.getItem('user_name') || 'Administrator',
            createdAt: new Date().toISOString(),
            totalAssignments: preparedAssignments.length,
            assignments: batchAssignmentsRecord,
            dispatchStatus: dispatchStatusRecord
        };
        await set(ref(db, `customers/dispatch_batches/${batchId}`), batchPayload);
        set(ref(db, `dispatch_batches/${batchId}`), batchPayload).catch(() => {});

        saveCachedAssignments();
        renderAssignmentsView();

        // 3. Launch WhatsApp Sequential Queue
        activeQueueBatchId = batchId;
        activeQueueIndex = 0;
        activeQueueItems = [...preparedAssignments];

        launchWhatsAppQueueModal(batchId, preparedAssignments.length);
        showToast(`Bulk saved! ${preparedAssignments.length} service assignments stored in cloud.`, "success");

    } catch (err) {
        console.error("Bulk submit error:", err);
        showToast(`Save notice: ${err.message}. Opening local dispatch queue.`, "warning");
        // Fallback: Launch queue locally
        activeQueueBatchId = batchId;
        activeQueueIndex = 0;
        activeQueueItems = [...preparedAssignments];
        launchWhatsAppQueueModal(batchId, preparedAssignments.length);
    } finally {
        btn.disabled = false;
        if (bottomBtn) bottomBtn.disabled = false;
        btn.innerHTML = '<i class="fa-brands fa-whatsapp fa-lg me-1"></i> SUBMIT ALL & DISPATCH WHATSAPP';
    }
}

// Exact WhatsApp Message Format (Section 6)
function generateWhatsAppMessage(item, portalUrl) {
    const contactLine = item.contactDesignation 
        ? `${item.contactPerson} (${item.contactDesignation})`
        : item.contactPerson;

    return `🔧 *AADHAV INTECH - SERVICE DISPATCH NOTICE*

Hello *${item.engineerName}*, you have been assigned to a service task:

📋 *Service ID:* ${item.serviceId}

🏢 *Company:* ${item.companyName}

📍 *Location:* ${item.companyLocation}

🗺️ *Address:* ${item.companyAddress}

👤 *Contact Person:* ${contactLine}

📞 *Contact Mobile:* ${item.contactMobile || 'N/A'}

🛠️ *Service Type:* ${item.serviceType}

📅 *Planned Date:* ${formatDate(item.plannedDate)}

⚡ *Priority:* ${item.priority}

*Instruments:* ${item.instruments}

📝 *Work Instructions:*
${item.workInstructions}

📲 *Portal Action:* Please login to the Service Engineer Portal to accept this task and record your daily service activity.

🔗 ${portalUrl}`;
}

function getEngineerPortalUrl() {
    try {
        const origin = window.location.origin;
        const path = window.location.pathname;
        const dir = path.substring(0, path.lastIndexOf('/'));
        return `${origin}${dir}/engineer-portal.html`;
    } catch (e) {
        return "https://aadhavintech.com/engineer-portal.html";
    }
}

// ============================================================================
// 7. INTERACTIVE WHATSAPP QUEUE MODAL CONTROLS
// ============================================================================

function launchWhatsAppQueueModal(batchLabel, count) {
    document.getElementById('dispatchQueueSubtitle').textContent = `Batch: ${batchLabel} &bull; ${count} Service Notices Prepared`;
    document.getElementById('dispatchSavedCountNotice').textContent = `${count} assignments generated and saved in Firebase cloud.`;

    renderQueueStepPills();
    displayCurrentQueueItem();
    modalWhatsappInstance.show();
}

function renderQueueStepPills() {
    const pillsContainer = document.getElementById('queueStepPills');
    if (!pillsContainer) return;

    let html = '';
    activeQueueItems.forEach((item, idx) => {
        const isCurrent = idx === activeQueueIndex;
        const status = item.whatsappStatus || 'pending';
        const badgeClass = status === 'sent' ? 'sent' : status === 'skipped' ? 'skipped' : 'pending';
        const icon = status === 'sent' ? '✓' : status === 'skipped' ? '↷' : String(idx + 1);

        html += `
            <button type="button" class="btn btn-sm ${isCurrent ? 'btn-primary' : 'btn-light border'} d-flex align-items-center gap-2 text-nowrap" onclick="window.jumpToQueueIndex(${idx})">
                <span class="queue-step-badge ${badgeClass}">${icon}</span>
                <span class="small fw-semibold">${escapeHtml(item.engineerName.split(' ')[0])} (${escapeHtml(item.companyName.split(' ')[0])})</span>
            </button>
        `;
    });
    pillsContainer.innerHTML = html;
}

function displayCurrentQueueItem() {
    const total = activeQueueItems.length;
    if (total === 0) return;

    const item = activeQueueItems[activeQueueIndex];
    if (!item) return;

    // Progress Bar
    const percent = Math.round(((activeQueueIndex + 1) / total) * 100);
    const sentTotal = activeQueueItems.filter(i => i.whatsappStatus === 'sent').length;

    document.getElementById('queueProgressLabel').textContent = `Processing Notice ${activeQueueIndex + 1} of ${total} : ${item.engineerName}`;
    document.getElementById('queuePercentLabel').textContent = `${percent}% ( ${sentTotal}/${total} Sent )`;
    document.getElementById('queueProgressBar').style.width = `${percent}%`;

    // Recipient Details
    document.getElementById('currentMsgEngineerName').textContent = item.engineerName;
    document.getElementById('currentMsgCompanyName').textContent = `• ${item.companyName}`;
    document.getElementById('currentMsgPhone').textContent = `+${cleanPhone(item.engineerWhatsapp)}`;
    document.getElementById('currentMsgServiceId').textContent = item.serviceId;

    // Badges
    const priorityBadge = document.getElementById('currentMsgPriorityBadge');
    priorityBadge.className = `priority-pill priority-${(item.priority || 'Normal').toLowerCase()}`;
    priorityBadge.textContent = item.priority || 'Normal';

    const statusBadge = document.getElementById('currentMsgStatusBadge');
    if (item.whatsappStatus === 'sent') {
        statusBadge.className = 'badge bg-success';
        statusBadge.textContent = 'Sent';
    } else if (item.whatsappStatus === 'skipped') {
        statusBadge.className = 'badge bg-secondary';
        statusBadge.textContent = 'Skipped';
    } else {
        statusBadge.className = 'badge bg-warning text-dark';
        statusBadge.textContent = 'Pending';
    }

    // Message text
    const portalUrl = getEngineerPortalUrl();
    const formattedMsg = item.whatsappMessage || generateWhatsAppMessage(item, portalUrl);
    item.whatsappMessage = formattedMsg;
    document.getElementById('currentMsgText').textContent = formattedMsg;

    // Nav Buttons
    document.getElementById('btnPrevQueueMessage').disabled = activeQueueIndex === 0;

    renderQueueStepPills();
    document.getElementById('dispatchQueueSummaryFooter').textContent = `${sentTotal} of ${total} Messages Dispatched`;
}

// Window Exposed Queue Navigation
window.jumpToQueueIndex = function(idx) {
    if (idx >= 0 && idx < activeQueueItems.length) {
        activeQueueIndex = idx;
        displayCurrentQueueItem();
    }
};

function openCurrentWhatsAppChat() {
    const item = activeQueueItems[activeQueueIndex];
    if (!item) return;

    const rawPhone = item.engineerWhatsapp || item.engineerMobile;
    const cleanNumber = cleanPhone(rawPhone);
    const msg = item.whatsappMessage || generateWhatsAppMessage(item, getEngineerPortalUrl());

    if (!cleanNumber) {
        showToast("No valid phone number for this engineer.", "danger");
        return;
    }

    const encodedText = encodeURIComponent(msg);
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${encodedText}`;

    // Open WhatsApp in new tab / application
    window.open(waUrl, '_blank');
    showToast(`Opening WhatsApp chat for ${item.engineerName}...`, "info");
}

async function markCurrentMessageSentAndNext() {
    const item = activeQueueItems[activeQueueIndex];
    if (!item) return;

    item.whatsappStatus = 'sent';

    // Also update in preparedAssignments array
    const masterItem = preparedAssignments.find(a => a.serviceId === item.serviceId);
    if (masterItem) masterItem.whatsappStatus = 'sent';

    // Update in Firebase Realtime Database
    if (item.taskId) {
        update(ref(db, `customers/daily_tasks/${item.taskId}`), {
            whatsappStatus: 'sent',
            dispatchedAt: new Date().toISOString()
        }).catch(() => {});
        update(ref(db, `daily_tasks/${item.taskId}`), {
            whatsappStatus: 'sent',
            dispatchedAt: new Date().toISOString()
        }).catch(() => {});
    }
    if (activeQueueBatchId) {
        update(ref(db, `customers/dispatch_batches/${activeQueueBatchId}/dispatchStatus`), {
            [item.serviceId]: 'sent'
        }).catch(() => {});
        update(ref(db, `dispatch_batches/${activeQueueBatchId}/dispatchStatus`), {
            [item.serviceId]: 'sent'
        }).catch(() => {});
    }

    saveCachedAssignments();
    renderAssignmentsView();

    // Advance to next
    if (activeQueueIndex < activeQueueItems.length - 1) {
        activeQueueIndex++;
        displayCurrentQueueItem();
        showToast(`Marked sent! Proceeding to next engineer notice.`, "success");
    } else {
        displayCurrentQueueItem();
        showToast("Dispatch queue finished! All assignments processed.", "success");
    }
}

function skipCurrentMessageAndNext() {
    const item = activeQueueItems[activeQueueIndex];
    if (!item) return;

    if (item.whatsappStatus !== 'sent') {
        item.whatsappStatus = 'skipped';
        const masterItem = preparedAssignments.find(a => a.serviceId === item.serviceId);
        if (masterItem) masterItem.whatsappStatus = 'skipped';
    }

    saveCachedAssignments();
    renderAssignmentsView();

    if (activeQueueIndex < activeQueueItems.length - 1) {
        activeQueueIndex++;
        displayCurrentQueueItem();
    } else {
        displayCurrentQueueItem();
        showToast("End of dispatch queue reached.", "info");
    }
}

function copyCurrentWhatsAppMessage() {
    const item = activeQueueItems[activeQueueIndex];
    if (!item) return;
    const msg = item.whatsappMessage || generateWhatsAppMessage(item, getEngineerPortalUrl());

    navigator.clipboard.writeText(msg).then(() => {
        showToast("WhatsApp message copied to clipboard!", "success");
    }).catch(() => {
        showToast("Could not access clipboard.", "warning");
    });
}

// ============================================================================
// 8. BATCH HISTORY LOG RENDERING
// ============================================================================
function renderBatchesTable() {
    const tbody = document.getElementById('batchesTableBody');
    if (!tbody) return;

    const keys = Object.keys(dispatchBatchesData);
    if (keys.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted small">No batches recorded yet.</td></tr>';
        return;
    }

    // Sort newest first
    const sorted = keys.map(k => ({ key: k, ...dispatchBatchesData[k] }))
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 10);

    let html = '';
    sorted.forEach(b => {
        const total = b.totalAssignments || (b.assignments ? Object.keys(b.assignments).length : 0);
        let sent = 0;
        if (b.dispatchStatus) {
            sent = Object.values(b.dispatchStatus).filter(s => s === 'sent').length;
        }

        const dateStr = b.createdAt ? new Date(b.createdAt).toLocaleString('en-IN') : '-';

        html += `
            <tr>
                <td class="font-monospace fw-bold text-primary">${escapeHtml(b.batchId || b.key)}</td>
                <td class="small text-muted">${dateStr}</td>
                <td><span class="badge badge-soft-primary">${total} Companies</span></td>
                <td>
                    <span class="badge ${sent === total ? 'bg-success' : 'bg-warning text-dark'} small">
                        ${sent} / ${total} Dispatched
                    </span>
                </td>
                <td>
                    <button class="btn btn-outline-primary btn-sm py-0" onclick="window.reopenBatchQueue('${b.key}')" title="Reopen WhatsApp Queue">
                        <i class="fa-brands fa-whatsapp text-success me-1"></i> Open Queue
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

window.reopenBatchQueue = async function(batchKey) {
    const batch = dispatchBatchesData[batchKey];
    if (!batch) return;

    try {
        // Fetch tasks matching this batch from customers/daily_tasks (or fallback daily_tasks)
        let tasksSnap = await get(ref(db, 'customers/daily_tasks')).catch(() => null);
        if (!tasksSnap || !tasksSnap.exists()) {
            tasksSnap = await get(ref(db, 'daily_tasks')).catch(() => null);
        }
        if (tasksSnap && tasksSnap.exists()) {
            const allTasks = tasksSnap.val();
            const matching = Object.values(allTasks).filter(t => t.batchId === batchKey);
            if (matching.length > 0) {
                activeQueueBatchId = batchKey;
                activeQueueIndex = 0;
                activeQueueItems = matching.map(t => ({
                    ...t,
                    whatsappStatus: t.whatsappStatus || (batch.dispatchStatus?.[t.serviceId] || 'pending')
                }));
                launchWhatsAppQueueModal(batchKey, matching.length);
                return;
            }
        }
    } catch (e) {
        console.warn("Could not retrieve tasks for batch:", e);
    }

    showToast("Batch details loaded into dispatch preview.", "info");
};

// ============================================================================
// 9. EVENT LISTENERS
// ============================================================================
function setupEventListeners() {
    // Add Company Button
    document.getElementById('btnAddCompanyBtn')?.addEventListener('click', () => {
        openAddAssignmentModal();
    });

    // Clear All Assignments
    document.getElementById('btnClearAllAssignments')?.addEventListener('click', () => {
        if (preparedAssignments.length === 0) return;
        if (confirm("Clear all prepared assignments in this session?")) {
            preparedAssignments = [];
            saveCachedAssignments();
            renderAssignmentsView();
            showToast("Cleared session assignments.", "info");
        }
    });

    // Load Demo Plan
    document.getElementById('btnLoadDemoAssignments')?.addEventListener('click', () => {
        loadDemoAssignments();
    });

    // Main Bulk Submit Button (Top Header & Bottom Summary)
    document.getElementById('btnBulkSubmitAndDispatch')?.addEventListener('click', handleBulkSubmitAndDispatch);
    document.getElementById('btnBottomSubmitAll')?.addEventListener('click', handleBulkSubmitAndDispatch);

    // Modal Company Selection change
    document.getElementById('modalSelectCompany')?.addEventListener('change', (e) => {
        handleCompanySelected(e.target.value);
    });

    // Modal Engineer Selection change
    document.getElementById('modalSelectEngineer')?.addEventListener('change', (e) => {
        handleEngineerSelected(e.target.value);
    });

    // Save Assignment Form Submit
    document.getElementById('formAssignment')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveAssignmentFromModal(false);
    });

    // Save & Add Another Company button
    document.getElementById('btnSaveAndAddAnother')?.addEventListener('click', () => {
        saveAssignmentFromModal(true);
    });

    // WhatsApp Queue Controls
    document.getElementById('btnOpenWhatsappChat')?.addEventListener('click', openCurrentWhatsAppChat);
    document.getElementById('btnMarkSentAndNext')?.addEventListener('click', markCurrentMessageSentAndNext);
    document.getElementById('btnSkipQueueMessage')?.addEventListener('click', skipCurrentMessageAndNext);
    document.getElementById('btnPrevQueueMessage')?.addEventListener('click', () => {
        if (activeQueueIndex > 0) {
            activeQueueIndex--;
            displayCurrentQueueItem();
        }
    });
    document.getElementById('btnCopyWhatsappText')?.addEventListener('click', copyCurrentWhatsAppMessage);

    // Refresh Batches
    document.getElementById('btnRefreshBatches')?.addEventListener('click', () => {
        listenToDispatchBatches();
        showToast("Batch history refreshed.", "info");
    });
}

// ============================================================================
// 10. UTILITY HELPERS
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
