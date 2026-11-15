/**
 * Aadhav Intech - Company Management & Engineer Responsibility (js/companies.js)
 * Territory Allocation, Customer Directory, Instrument Specs & Firebase Realtime Database
 */

import { db, ref, get, set, update, remove, onValue, push } from './firebase.js';
import { showToast, loadCompanySettings } from './utils.js';

// Application State
let customersData = {};
let engineersData = {};
let currentEditingKey = null;
let currentViewingKey = null;
let selectedAllocationCompanyKeys = new Set();

// Modal Instances
let modalCompanyFormInstance = null;
let modalEngineerAllocationInstance = null;
let modalViewCompanyInstance = null;

// ============================================================================
// 1. INITIALIZATION & LIFECYCLE
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. UI basics
    startClock();
    setupThemeToggle();
    setupMobileSidebar();

    // 2. Initialize Bootstrap Modals immediately
    modalCompanyFormInstance = new bootstrap.Modal(document.getElementById('modalCompanyForm'));
    modalEngineerAllocationInstance = new bootstrap.Modal(document.getElementById('modalEngineerAllocation'));
    modalViewCompanyInstance = new bootstrap.Modal(document.getElementById('modalViewCompany'));

    // 3. Setup Listeners
    setupEventListeners();

    // 4. Background loads: Company branding, Customers, Engineers
    loadCompanySettings().catch(() => {});
    listenToCustomers();
    listenToEngineers();
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

function listenToCustomers() {
    const custRef = ref(db, 'customers');
    onValue(custRef, (snapshot) => {
        const data = snapshot.val() || {};
        const validCompanies = {};

        // Filter out system internal nodes starting with '_' or special nodes
        Object.keys(data).forEach(k => {
            if (!k.startsWith('_') && k !== 'daily_tasks' && k !== 'dispatch_batches' && k !== 'settings' && k !== 'instruments' && k !== 'documents') {
                validCompanies[k] = { id: k, ...data[k] };
            }
        });

        customersData = validCompanies;
        localStorage.setItem('cached_companies_data', JSON.stringify(customersData));

        renderCompaniesTable();
        updateStats();
        populateCityFilter();
    }, (err) => {
        console.warn("Customers listener warning:", err);
        const cached = localStorage.getItem('cached_companies_data');
        if (cached) {
            try {
                customersData = JSON.parse(cached);
                renderCompaniesTable();
                updateStats();
                populateCityFilter();
            } catch (e) {}
        }
    });
}

function listenToEngineers() {
    // Primary path: customers/_engineers
    const primaryRef = ref(db, 'customers/_engineers');
    onValue(primaryRef, (snapshot) => {
        const data = snapshot.val() || {};
        engineersData = data;
        localStorage.setItem('cached_companies_engineers', JSON.stringify(engineersData));

        populateEngineerDropdowns();
        renderCompaniesTable();
        updateStats();
    }, () => {
        const cached = localStorage.getItem('cached_companies_engineers');
        if (cached) {
            try {
                engineersData = JSON.parse(cached);
                populateEngineerDropdowns();
                renderCompaniesTable();
                updateStats();
            } catch (e) {}
        }
    });
}

// ============================================================================
// 3. STATS & DROPDOWN POPULATION
// ============================================================================

function updateStats() {
    const companies = Object.values(customersData);
    const total = companies.length;
    let assigned = 0;
    let unassigned = 0;

    companies.forEach(c => {
        if (c.responsibleEngineerId || c.assignedEngineerId) {
            assigned++;
        } else {
            unassigned++;
        }
    });

    const activeEngs = Object.values(engineersData).filter(e => e.status !== 'inactive').length;

    document.getElementById('statTotalCompanies').textContent = total;
    document.getElementById('statAssignedCompanies').textContent = assigned;
    document.getElementById('statUnassignedCompanies').textContent = unassigned;
    document.getElementById('statActiveEngineers').textContent = activeEngs;
    document.getElementById('badgeTotalCompaniesCount').textContent = `${total} registered`;
}

function populateCityFilter() {
    const select = document.getElementById('filterCity');
    if (!select) return;
    const currentVal = select.value;

    const cities = new Set();
    Object.values(customersData).forEach(c => {
        const loc = (c.siteLocation || '').trim();
        if (loc) cities.add(loc);
    });

    select.innerHTML = '<option value="all">All Cities / Regions</option>';
    Array.from(cities).sort().forEach(city => {
        const opt = document.createElement('option');
        opt.value = city;
        opt.textContent = city;
        select.appendChild(opt);
    });

    if (currentVal) select.value = currentVal;
}

function populateEngineerDropdowns() {
    // 1. Company edit modal dropdown (Option 1)
    const compEngSelect = document.getElementById('inputResponsibleEngineer');
    if (compEngSelect) {
        const curVal = compEngSelect.value;
        compEngSelect.innerHTML = '<option value="">-- No dedicated engineer assigned (Unassigned) --</option>';

        const sortedEngs = Object.values(engineersData).filter(e => e.status !== 'inactive').sort((a, b) => 
            (a.name || a.fullName || '').localeCompare(b.name || b.fullName || '')
        );

        sortedEngs.forEach(e => {
            const opt = document.createElement('option');
            opt.value = e.id || e.engineerId;
            opt.textContent = `${e.name || e.fullName || 'Engineer'} (${e.engineerId || 'ENG'}) - 📞 ${e.mobile || e.phone || ''}`;
            compEngSelect.appendChild(opt);
        });

        if (curVal) compEngSelect.value = curVal;
    }

    // 2. Filter dropdown
    const filterEngSelect = document.getElementById('filterResponsibleEngineer');
    if (filterEngSelect) {
        const curFilter = filterEngSelect.value;
        filterEngSelect.innerHTML = `
            <option value="all">All Engineers (Allocation)</option>
            <option value="assigned">Only Assigned Companies</option>
            <option value="unassigned">Only Unassigned Companies</option>
            <optgroup label="Filter by Specific Engineer" id="optgroupFilterEngs"></optgroup>
        `;
        const group = document.getElementById('optgroupFilterEngs');
        Object.values(engineersData).forEach(e => {
            const opt = document.createElement('option');
            opt.value = e.id || e.engineerId;
            opt.textContent = `Engineer: ${e.name || e.fullName || 'Engineer'}`;
            group.appendChild(opt);
        });
        if (curFilter) filterEngSelect.value = curFilter;
    }

    // 3. Bulk allocation engineer selector (Option 2)
    const allocEngSelect = document.getElementById('allocSelectEngineer');
    if (allocEngSelect) {
        const curAlloc = allocEngSelect.value;
        allocEngSelect.innerHTML = '<option value="">-- Choose engineer to assign companies --</option>';

        Object.values(engineersData).filter(e => e.status !== 'inactive').forEach(e => {
            const opt = document.createElement('option');
            opt.value = e.id || e.engineerId;
            const count = (e.assignedCompaniesCount !== undefined) ? e.assignedCompaniesCount : (e.assignedCompanyIds ? e.assignedCompanyIds.length : 0);
            opt.textContent = `${e.name || e.fullName || 'Engineer'} (${e.engineerId || 'ENG'}) [${count} Companies Assigned]`;
            allocEngSelect.appendChild(opt);
        });

        if (curAlloc) allocEngSelect.value = curAlloc;
    }
}

// ============================================================================
// 4. DIRECTORY TABLE RENDERING
// ============================================================================

function renderCompaniesTable() {
    const tbody = document.getElementById('companiesTableBody');
    if (!tbody) return;

    const searchTerm = (document.getElementById('searchCompanyInput')?.value || '').trim().toLowerCase();
    const filterEng = document.getElementById('filterResponsibleEngineer')?.value || 'all';
    const filterCity = document.getElementById('filterCity')?.value || 'all';

    let list = Object.values(customersData);

    // Apply Filter: Responsible Engineer
    if (filterEng === 'assigned') {
        list = list.filter(c => !!(c.responsibleEngineerId || c.assignedEngineerId));
    } else if (filterEng === 'unassigned') {
        list = list.filter(c => !(c.responsibleEngineerId || c.assignedEngineerId));
    } else if (filterEng !== 'all') {
        list = list.filter(c => (c.responsibleEngineerId === filterEng || c.assignedEngineerId === filterEng));
    }

    // Apply Filter: City
    if (filterCity !== 'all') {
        list = list.filter(c => (c.siteLocation || '').trim() === filterCity);
    }

    // Apply Search Term
    if (searchTerm) {
        list = list.filter(c => {
            const name = (c.companyName || c.name || '').toLowerCase();
            const loc = (c.siteLocation || '').toLowerCase();
            const addr = (c.address || '').toLowerCase();
            const person = (c.contactPerson || c.customerName || '').toLowerCase();
            const phone = (c.mobile || c.phone || '').toLowerCase();
            const eng = (c.responsibleEngineerName || '').toLowerCase();

            return name.includes(searchTerm) || loc.includes(searchTerm) || 
                   addr.includes(searchTerm) || person.includes(searchTerm) || 
                   phone.includes(searchTerm) || eng.includes(searchTerm);
        });
    }

    // Sort alphabetically by Company Name
    list.sort((a, b) => (a.companyName || a.name || '').localeCompare(b.companyName || b.name || ''));

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5 text-muted">
                    <i class="fa-solid fa-building-circle-xmark fa-2x mb-2 text-secondary opacity-50"></i>
                    <h6>No Companies Found</h6>
                    <p class="small text-muted mb-0">Try clearing your search filters or click "Add New Company".</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    list.forEach(comp => {
        const key = comp.id || comp.key;
        const name = comp.companyName || comp.name || 'Unnamed Company';
        const loc = comp.siteLocation || 'Coimbatore';
        const addr = comp.address || 'Address not specified';
        const contact = comp.contactPerson || comp.customerName || '-';
        const desig = comp.designation ? ` (${comp.designation})` : '';
        const phone = comp.mobile || comp.phone || '';
        const cleanP = cleanPhone(phone);

        // Instruments badges
        const instList = getInstrumentsList(comp);
        let instHtml = '';
        if (instList.length > 0) {
            instHtml = instList.slice(0, 2).map(i => `<span class="badge bg-light text-dark border me-1 small">${escapeHtml(i.name || i.model || 'Instrument')}</span>`).join('');
            if (instList.length > 2) {
                instHtml += `<span class="badge bg-secondary-subtle text-secondary small">+${instList.length - 2} more</span>`;
            }
        } else {
            instHtml = `<span class="text-muted small">None recorded</span>`;
        }

        // Responsible Engineer Badge
        let engBadge = '';
        const engId = comp.responsibleEngineerId || comp.assignedEngineerId;
        const engObj = engId ? engineersData[engId] : null;

        if (engObj || comp.responsibleEngineerName) {
            const engName = engObj ? (engObj.name || engObj.fullName) : comp.responsibleEngineerName;
            const engPhone = engObj ? (engObj.mobile || engObj.phone) : (comp.responsibleEngineerPhone || '');
            engBadge = `
                <div class="d-flex align-items-center gap-2">
                    <div class="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold" style="width: 28px; height: 28px; font-size: 0.75rem;">
                        ${escapeHtml(engName.charAt(0).toUpperCase())}
                    </div>
                    <div>
                        <div class="fw-semibold small text-dark">${escapeHtml(engName)}</div>
                        ${engPhone ? `<div class="small text-muted font-monospace" style="font-size: 0.72rem;">${escapeHtml(engPhone)}</div>` : ''}
                    </div>
                </div>
            `;
        } else {
            engBadge = `<span class="badge bg-warning-subtle text-warning border border-warning-subtle company-row-badge"><i class="fa-solid fa-clock me-1"></i>Unassigned</span>`;
        }

        html += `
            <tr>
                <td>
                    <div class="fw-bold text-dark cursor-pointer text-hover-primary" onclick="window.viewCompany('${key}')">
                        ${escapeHtml(name)}
                    </div>
                    <div class="small text-muted font-monospace" style="font-size: 0.72rem;">ID: ${escapeHtml(key)}</div>
                </td>
                <td>
                    <div class="small fw-semibold text-dark"><i class="fa-solid fa-location-dot text-danger me-1"></i>${escapeHtml(loc)}</div>
                    <div class="small text-muted text-truncate" style="max-width: 280px;" title="${escapeHtml(addr)}">${escapeHtml(addr)}</div>
                </td>
                <td>
                    <div class="small fw-semibold">${escapeHtml(contact)}${escapeHtml(desig)}</div>
                    <div class="small mt-1 d-flex align-items-center gap-2">
                        ${phone ? `
                            <span class="font-monospace text-muted">${escapeHtml(phone)}</span>
                            <a href="tel:${escapeHtml(phone)}" class="text-primary" title="Call"><i class="fa-solid fa-phone"></i></a>
                            <a href="https://wa.me/${cleanP}" target="_blank" class="text-success" title="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
                        ` : '<span class="text-muted">No phone</span>'}
                    </div>
                </td>
                <td>
                    <div>${instHtml}</div>
                </td>
                <td>
                    ${engBadge}
                </td>
                <td class="text-end">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="window.viewCompany('${key}')" title="View Company Dossier">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-secondary" onclick="window.editCompany('${key}')" title="Edit Company & Engineer">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <a href="dispatch.html" class="btn btn-outline-success" title="Schedule Service in Dispatch">
                            <i class="fa-solid fa-calendar-plus"></i>
                        </a>
                        <button class="btn btn-outline-danger" onclick="window.deleteCompany('${key}')" title="Delete Company">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function getInstrumentsList(comp) {
    if (!comp) return [];
    if (Array.isArray(comp.instruments)) {
        return comp.instruments;
    }
    if (typeof comp.instruments === 'object' && comp.instruments !== null) {
        return Object.values(comp.instruments);
    }
    if (comp.defaultInstrument || comp.defaultModel) {
        return [{
            name: comp.defaultInstrument || 'Instrument',
            model: comp.defaultModel || '-',
            serial: comp.defaultSerial || '-'
        }];
    }
    return [];
}

// ============================================================================
// 5. MODAL 1: ADD / EDIT COMPANY (Option 1)
// ============================================================================

function openAddCompanyModal() {
    currentEditingKey = null;
    document.getElementById('formCompany').reset();
    document.getElementById('editCompanyKey').value = '';
    document.getElementById('modalCompanyFormTitle').innerHTML = '<i class="fa-solid fa-building-circle-check text-primary me-2"></i>Register New Client Company';

    // Auto-generate next company ID
    const count = Object.keys(customersData).length + 101;
    document.getElementById('inputCompanyId').value = `comp_ait_${count}`;

    // Reset instruments rows to 1 default row
    const container = document.getElementById('instrumentsRowsContainer');
    container.innerHTML = '';
    addInstrumentRow('OCEMS', 'L-800', '');

    populateEngineerDropdowns();
    modalCompanyFormInstance.show();
}

window.editCompany = function(key) {
    const comp = customersData[key];
    if (!comp) return;

    currentEditingKey = key;
    document.getElementById('editCompanyKey').value = key;
    document.getElementById('modalCompanyFormTitle').innerHTML = '<i class="fa-solid fa-building-pen text-primary me-2"></i>Edit Client Company & Engineer Allocation';

    document.getElementById('inputCompanyId').value = key;
    document.getElementById('inputCompanyName').value = comp.companyName || comp.name || '';
    document.getElementById('inputSiteLocation').value = comp.siteLocation || 'Coimbatore';
    document.getElementById('inputLocationUrl').value = comp.locationUrl || '';
    document.getElementById('inputCompanyAddress').value = comp.address || comp.siteLocation || '';

    document.getElementById('inputContactPerson').value = comp.contactPerson || comp.customerName || '';
    document.getElementById('inputContactDesignation').value = comp.designation || '';
    document.getElementById('inputContactMobile').value = comp.mobile || comp.phone || '';
    document.getElementById('inputContactEmail').value = comp.email || '';

    populateEngineerDropdowns();
    const engId = comp.responsibleEngineerId || comp.assignedEngineerId || '';
    document.getElementById('inputResponsibleEngineer').value = engId;

    // Load instruments rows
    const container = document.getElementById('instrumentsRowsContainer');
    container.innerHTML = '';
    const instList = getInstrumentsList(comp);
    if (instList.length > 0) {
        instList.forEach(i => {
            addInstrumentRow(i.name || '', i.model || '', i.serial || '');
        });
    } else {
        addInstrumentRow('', '', '');
    }

    modalCompanyFormInstance.show();
};

function addInstrumentRow(name = '', model = '', serial = '') {
    const container = document.getElementById('instrumentsRowsContainer');
    if (!container) return;

    const rowId = 'instRow_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const div = document.createElement('div');
    div.className = 'inst-row-item';
    div.id = rowId;

    div.innerHTML = `
        <div class="row g-2 align-items-center">
            <div class="col-md-4">
                <label class="form-label small mb-1">Instrument / Analyzer Name</label>
                <input type="text" class="form-control form-control-sm inst-name" value="${escapeHtml(name)}" placeholder="e.g. OCEMS, LDM, Dust Monitor">
            </div>
            <div class="col-md-4">
                <label class="form-label small mb-1">Model Number</label>
                <input type="text" class="form-control form-control-sm inst-model" value="${escapeHtml(model)}" placeholder="e.g. L-800, LM-318">
            </div>
            <div class="col-md-3">
                <label class="form-label small mb-1">Serial Number</label>
                <input type="text" class="form-control form-control-sm inst-serial font-monospace" value="${escapeHtml(serial)}" placeholder="e.g. IN2304-112B">
            </div>
            <div class="col-md-1 text-end pt-3">
                <button type="button" class="btn btn-outline-danger btn-sm p-1" onclick="document.getElementById('${rowId}').remove()" title="Remove Instrument">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>
    `;

    container.appendChild(div);
}

// Handle Add / Edit Company Submit (Option 1)
async function handleCompanyFormSubmit(e) {
    e.preventDefault();

    const saveBtn = document.getElementById('btnSaveCompany');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Saving Company...';

    const rawKey = document.getElementById('editCompanyKey').value.trim();
    const key = rawKey || (document.getElementById('inputCompanyId').value.trim() || `comp_${Date.now()}`);

    const companyName = document.getElementById('inputCompanyName').value.trim();
    const siteLocation = document.getElementById('inputSiteLocation').value.trim();
    const locationUrl = document.getElementById('inputLocationUrl').value.trim();
    const address = document.getElementById('inputCompanyAddress').value.trim();
    const contactPerson = document.getElementById('inputContactPerson').value.trim();
    const designation = document.getElementById('inputContactDesignation').value.trim();
    const mobile = document.getElementById('inputContactMobile').value.trim();
    const email = document.getElementById('inputContactEmail').value.trim();
    const responsibleEngineerId = document.getElementById('inputResponsibleEngineer').value;

    if (!companyName || !siteLocation || !address || !contactPerson || !mobile) {
        showToast("Please fill all required company and contact fields.", "warning");
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up me-1"></i> Save Company Record';
        return;
    }

    // Collect instruments
    const instRows = document.querySelectorAll('#instrumentsRowsContainer .inst-row-item');
    const instruments = [];
    instRows.forEach(row => {
        const name = row.querySelector('.inst-name')?.value.trim() || '';
        const model = row.querySelector('.inst-model')?.value.trim() || '';
        const serial = row.querySelector('.inst-serial')?.value.trim() || '';
        if (name || model || serial) {
            instruments.push({ name, model, serial });
        }
    });

    // Resolve engineer details if assigned
    const engObj = responsibleEngineerId ? engineersData[responsibleEngineerId] : null;
    const responsibleEngineerName = engObj ? (engObj.name || engObj.fullName) : '';
    const responsibleEngineerPhone = engObj ? (engObj.mobile || engObj.phone || '') : '';

    const payload = {
        id: key,
        companyName: companyName,
        name: companyName,
        siteLocation: siteLocation,
        address: address,
        locationUrl: locationUrl,
        contactPerson: contactPerson,
        customerName: contactPerson,
        designation: designation,
        mobile: mobile,
        phone: mobile,
        email: email,
        instruments: instruments,
        responsibleEngineerId: responsibleEngineerId || '',
        responsibleEngineerName: responsibleEngineerName || '',
        responsibleEngineerPhone: responsibleEngineerPhone || '',
        updatedAt: new Date().toISOString()
    };

    if (!rawKey) {
        payload.createdAt = new Date().toISOString();
    }

    try {
        // 1. Save company to Firebase customers/{key} (cloud authorized)
        await set(ref(db, `customers/${key}`), payload);

        // 2. If responsible engineer is assigned, update that engineer's profile (Option 1 -> Engineer Profile sync)
        if (responsibleEngineerId && engObj) {
            await syncEngineerAssignedCompany(responsibleEngineerId, key, companyName, siteLocation, true);
        }

        // If previously assigned to another engineer, remove from that engineer's profile
        const oldComp = customersData[key];
        if (oldComp && oldComp.responsibleEngineerId && oldComp.responsibleEngineerId !== responsibleEngineerId) {
            await syncEngineerAssignedCompany(oldComp.responsibleEngineerId, key, companyName, siteLocation, false);
        }

        customersData[key] = payload;
        localStorage.setItem('cached_companies_data', JSON.stringify(customersData));

        modalCompanyFormInstance.hide();
        renderCompaniesTable();
        updateStats();
        populateCityFilter();

        showToast(`Company "${companyName}" saved to database successfully!`, "success");
    } catch (err) {
        console.error("Save company error:", err);
        showToast(`Error saving company: ${err.message}`, "danger");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up me-1"></i> Save Company Record';
    }
}

// Synchronize individual company assignment with engineer's profile
async function syncEngineerAssignedCompany(engId, companyId, companyName, siteLocation, isAdd) {
    try {
        const eng = engineersData[engId];
        if (!eng) return;

        let currentList = Array.isArray(eng.assignedCompanies) ? [...eng.assignedCompanies] : [];
        // Filter out this company first
        currentList = currentList.filter(c => (c.companyId !== companyId && c.id !== companyId));

        if (isAdd) {
            currentList.push({
                companyId: companyId,
                companyName: companyName,
                siteLocation: siteLocation
            });
        }

        const idList = currentList.map(c => c.companyId);

        const updates = {
            assignedCompanies: currentList,
            assignedCompanyIds: idList,
            assignedCompaniesCount: currentList.length,
            updatedAt: new Date().toISOString()
        };

        // Primary update in customers/_engineers/
        await update(ref(db, `customers/_engineers/${engId}`), updates);
        // Mirror in root engineers/
        update(ref(db, `engineers/${engId}`), updates).catch(() => {});

        engineersData[engId] = { ...eng, ...updates };
    } catch (e) {
        console.warn("Engineer profile company sync notice:", e);
    }
}

// ============================================================================
// 6. MODAL 2: BULK ENGINEER RESPONSIBILITY ALLOCATION (Option 2)
// ============================================================================

function openEngineerAllocationModal(preselectedEngId = '') {
    populateEngineerDropdowns();
    const select = document.getElementById('allocSelectEngineer');

    if (preselectedEngId) {
        select.value = preselectedEngId;
        loadEngineerCurrentResponsibilities(preselectedEngId);
    } else {
        select.value = '';
        document.getElementById('allocEngineerDetailsText').textContent = 'Select an engineer to load their current assigned companies.';
        document.getElementById('allocCurrentCountBadge').textContent = '0 Companies Assigned';
        document.getElementById('allocCompaniesListContainer').innerHTML = `
            <div class="text-center py-4 text-muted">
                Please select an engineer above to manage company responsibilities.
            </div>
        `;
    }

    document.getElementById('allocSearchCompaniesInput').value = '';
    modalEngineerAllocationInstance.show();
}

function loadEngineerCurrentResponsibilities(engId) {
    if (!engId || !engineersData[engId]) {
        document.getElementById('allocCompaniesListContainer').innerHTML = `
            <div class="text-center py-4 text-muted">
                Please select an engineer above to manage company responsibilities.
            </div>
        `;
        return;
    }

    const eng = engineersData[engId];
    const engName = eng.name || eng.fullName || 'Engineer';
    document.getElementById('allocEngineerDetailsText').textContent = `Managing responsibilities for: ${engName} (${eng.department || 'Field Service'})`;

    // Find all companies currently assigned to this engineer
    selectedAllocationCompanyKeys = new Set();
    Object.values(customersData).forEach(c => {
        if (c.responsibleEngineerId === engId || c.assignedEngineerId === engId) {
            selectedAllocationCompanyKeys.add(c.id);
        }
    });

    // Also check engineer's own assignedCompanyIds if present
    if (Array.isArray(eng.assignedCompanyIds)) {
        eng.assignedCompanyIds.forEach(id => selectedAllocationCompanyKeys.add(id));
    }

    document.getElementById('allocCurrentCountBadge').textContent = `${selectedAllocationCompanyKeys.size} Companies Assigned`;

    renderAllocationCompanyList();
}

function renderAllocationCompanyList() {
    const container = document.getElementById('allocCompaniesListContainer');
    if (!container) return;

    const engId = document.getElementById('allocSelectEngineer')?.value;
    if (!engId) return;

    const filterText = (document.getElementById('allocSearchCompaniesInput')?.value || '').trim().toLowerCase();
    const sortedComps = Object.values(customersData).sort((a, b) => 
        (a.companyName || a.name || '').localeCompare(b.companyName || b.name || '')
    );

    let html = '';
    let matchCount = 0;

    sortedComps.forEach(c => {
        const cId = c.id;
        const name = c.companyName || c.name || 'Unnamed';
        const loc = c.siteLocation || 'Coimbatore';

        // Filter text match
        if (filterText && !name.toLowerCase().includes(filterText) && !loc.toLowerCase().includes(filterText)) {
            return;
        }

        matchCount++;
        const isChecked = selectedAllocationCompanyKeys.has(cId);

        // Status badge: who is currently assigned?
        let curEngBadge = '';
        if (c.responsibleEngineerId) {
            if (c.responsibleEngineerId === engId) {
                curEngBadge = `<span class="badge bg-success small"><i class="fa-solid fa-check me-1"></i>Currently Assigned</span>`;
            } else {
                curEngBadge = `<span class="badge bg-warning text-dark small">Assigned to: ${escapeHtml(c.responsibleEngineerName || 'Other')}</span>`;
            }
        } else {
            curEngBadge = `<span class="badge bg-secondary small">Unassigned</span>`;
        }

        html += `
            <div class="allocation-company-item ${isChecked ? 'selected' : ''}" onclick="window.toggleAllocationCompany('${cId}')">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="form-check m-0">
                        <input class="form-check-input" type="checkbox" id="chk_alloc_${cId}" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation(); window.toggleAllocationCompany('${cId}')">
                        <label class="form-check-label fw-bold text-dark cursor-pointer ms-2" for="chk_alloc_${cId}">
                            ${escapeHtml(name)}
                        </label>
                        <div class="small text-muted ms-2"><i class="fa-solid fa-location-dot text-danger me-1"></i>${escapeHtml(loc)}</div>
                    </div>
                    <div>
                        ${curEngBadge}
                    </div>
                </div>
            </div>
        `;
    });

    if (matchCount === 0) {
        html = `<div class="text-center py-4 text-muted">No companies matching "${filterText}".</div>`;
    }

    container.innerHTML = html;
}

window.toggleAllocationCompany = function(cId) {
    if (selectedAllocationCompanyKeys.has(cId)) {
        selectedAllocationCompanyKeys.delete(cId);
    } else {
        selectedAllocationCompanyKeys.add(cId);
    }

    document.getElementById('allocCurrentCountBadge').textContent = `${selectedAllocationCompanyKeys.size} Companies Selected`;
    renderAllocationCompanyList();
};

// Handle Bulk Allocation Form Submit (Option 2: "done means that engineer profile will be all company was updated")
async function handleSaveAllocationSubmit(e) {
    e.preventDefault();

    const engId = document.getElementById('allocSelectEngineer')?.value;
    if (!engId || !engineersData[engId]) {
        showToast("Please select an engineer first.", "warning");
        return;
    }

    const eng = engineersData[engId];
    const engName = eng.name || eng.fullName || 'Site Engineer';
    const engPhone = eng.mobile || eng.phone || '';

    const saveBtn = document.getElementById('btnSaveAllocation');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Updating Database...';

    try {
        const assignedList = [];
        const checkedIds = Array.from(selectedAllocationCompanyKeys);

        // 1. Batch update all checked companies to have this responsible engineer
        for (const cId of checkedIds) {
            const comp = customersData[cId];
            if (comp) {
                assignedList.push({
                    companyId: cId,
                    companyName: comp.companyName || comp.name || '',
                    siteLocation: comp.siteLocation || 'Coimbatore'
                });

                // Update company record
                await update(ref(db, `customers/${cId}`), {
                    responsibleEngineerId: engId,
                    responsibleEngineerName: engName,
                    responsibleEngineerPhone: engPhone,
                    updatedAt: new Date().toISOString()
                });

                customersData[cId].responsibleEngineerId = engId;
                customersData[cId].responsibleEngineerName = engName;
                customersData[cId].responsibleEngineerPhone = engPhone;
            }
        }

        // 2. Unassign companies previously assigned to this engineer that were unchecked
        for (const [cId, comp] of Object.entries(customersData)) {
            if ((comp.responsibleEngineerId === engId || comp.assignedEngineerId === engId) && !selectedAllocationCompanyKeys.has(cId)) {
                await update(ref(db, `customers/${cId}`), {
                    responsibleEngineerId: '',
                    responsibleEngineerName: '',
                    responsibleEngineerPhone: '',
                    updatedAt: new Date().toISOString()
                });
                customersData[cId].responsibleEngineerId = '';
                customersData[cId].responsibleEngineerName = '';
                customersData[cId].responsibleEngineerPhone = '';
            }
        }

        // 3. Update the engineer's profile with all assigned companies (Requirement: "done means that engineer profile will be all company was updated")
        const engineerProfileUpdates = {
            assignedCompanies: assignedList,
            assignedCompanyIds: checkedIds,
            assignedCompaniesCount: assignedList.length,
            updatedAt: new Date().toISOString()
        };

        // Primary update in customers/_engineers/
        await update(ref(db, `customers/_engineers/${engId}`), engineerProfileUpdates);
        // Mirror in root engineers/
        update(ref(db, `engineers/${engId}`), engineerProfileUpdates).catch(() => {});

        engineersData[engId] = { ...eng, ...engineerProfileUpdates };
        localStorage.setItem('cached_companies_engineers', JSON.stringify(engineersData));
        localStorage.setItem('cached_companies_data', JSON.stringify(customersData));

        modalEngineerAllocationInstance.hide();
        renderCompaniesTable();
        updateStats();

        showToast(`Engineer "${engName}" profile updated! Now responsible for ${assignedList.length} companies.`, "success");
    } catch (err) {
        console.error("Save allocation error:", err);
        showToast(`Error updating allocation: ${err.message}`, "danger");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fa-solid fa-circle-check me-1"></i> Save & Update Engineer Profile';
    }
}

// ============================================================================
// 7. MODAL 3: VIEW COMPANY DETAILS & INSTRUMENTS
// ============================================================================

window.viewCompany = function(key) {
    const comp = customersData[key];
    if (!comp) return;

    currentViewingKey = key;

    const name = comp.companyName || comp.name || 'Unnamed Company';
    const loc = comp.siteLocation || 'Coimbatore';
    const addr = comp.address || 'Address not provided';
    const contact = comp.contactPerson || comp.customerName || '-';
    const desig = comp.designation || '-';
    const phone = comp.mobile || comp.phone || '-';
    const email = comp.email || '-';

    document.getElementById('viewCompanyName').textContent = name;
    document.getElementById('viewSiteLocation').textContent = loc;
    document.getElementById('viewCompanyIdBadge').textContent = key;
    document.getElementById('viewContactPerson').textContent = contact;
    document.getElementById('viewContactDesignation').textContent = desig;
    document.getElementById('viewContactMobile').textContent = phone;
    document.getElementById('viewContactEmail').textContent = email;
    document.getElementById('viewCompleteAddress').textContent = addr;

    // Google Maps link
    const mapUrlContainer = document.getElementById('viewMapUrlContainer');
    const query = comp.locationUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr + ' ' + loc)}`;
    mapUrlContainer.innerHTML = `
        <a href="${query}" target="_blank" class="btn btn-sm btn-outline-danger">
            <i class="fa-solid fa-map-location-dot me-1"></i> View on Google Maps
        </a>
    `;

    // Responsible Engineer
    const engContainer = document.getElementById('viewResponsibleEngineerContainer');
    const engId = comp.responsibleEngineerId || comp.assignedEngineerId;
    const engObj = engId ? engineersData[engId] : null;

    if (engObj || comp.responsibleEngineerName) {
        const engName = engObj ? (engObj.name || engObj.fullName) : comp.responsibleEngineerName;
        const engPhone = engObj ? (engObj.mobile || engObj.phone) : comp.responsibleEngineerPhone;
        engContainer.innerHTML = `
            <div class="d-flex align-items-center gap-2 p-2 rounded bg-white border">
                <div class="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold" style="width: 32px; height: 32px;">
                    ${escapeHtml(engName.charAt(0).toUpperCase())}
                </div>
                <div>
                    <strong class="text-dark">${escapeHtml(engName)}</strong>
                    <div class="small text-muted font-monospace">${escapeHtml(engPhone || '')}</div>
                </div>
            </div>
        `;
    } else {
        engContainer.innerHTML = `<span class="badge bg-warning text-dark p-2"><i class="fa-solid fa-clock me-1"></i>No Engineer Assigned</span>`;
    }

    // Instruments table
    const tbody = document.getElementById('viewInstrumentsTableBody');
    const instList = getInstrumentsList(comp);

    if (instList.length > 0) {
        tbody.innerHTML = instList.map((inst, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td class="fw-semibold text-dark">${escapeHtml(inst.name || 'Analyzer')}</td>
                <td class="font-monospace text-primary">${escapeHtml(inst.model || '-')}</td>
                <td class="font-monospace text-muted">${escapeHtml(inst.serial || '-')}</td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-muted">No instruments recorded for this plant</td></tr>`;
    }

    modalViewCompanyInstance.show();
};

// ============================================================================
// 8. DELETE COMPANY
// ============================================================================

window.deleteCompany = async function(key) {
    const comp = customersData[key];
    if (!comp) return;

    const name = comp.companyName || comp.name || 'this company';
    const confirmMsg = `Are you sure you want to permanently delete company "${name}" (${key})?\n\nThis will remove their profile from the database.`;

    if (!confirm(confirmMsg)) return;

    try {
        await remove(ref(db, `customers/${key}`));

        // If this company had an assigned engineer, remove from their profile
        const engId = comp.responsibleEngineerId || comp.assignedEngineerId;
        if (engId) {
            syncEngineerAssignedCompany(engId, key, name, comp.siteLocation || '', false);
        }

        delete customersData[key];
        localStorage.setItem('cached_companies_data', JSON.stringify(customersData));

        renderCompaniesTable();
        updateStats();
        populateCityFilter();

        if (modalViewCompanyInstance) {
            modalViewCompanyInstance.hide();
        }

        showToast(`Company "${name}" deleted successfully.`, "success");
    } catch (err) {
        console.error("Delete company error:", err);
        showToast(`Error deleting company: ${err.message}`, "danger");
    }
};

// ============================================================================
// 9. EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
    // Open Add Company Modal
    document.getElementById('btnOpenAddCompany')?.addEventListener('click', () => {
        openAddCompanyModal();
    });

    // Open Engineer Allocation Modal (Option 2)
    document.getElementById('btnOpenEngineerAllocation')?.addEventListener('click', () => {
        openEngineerAllocationModal();
    });

    // Refresh List
    document.getElementById('btnRefreshList')?.addEventListener('click', () => {
        listenToCustomers();
        listenToEngineers();
        showToast("Company directory refreshed from cloud.", "info");
    });

    // Search and Filters
    document.getElementById('searchCompanyInput')?.addEventListener('input', renderCompaniesTable);
    document.getElementById('filterResponsibleEngineer')?.addEventListener('change', renderCompaniesTable);
    document.getElementById('filterCity')?.addEventListener('change', renderCompaniesTable);

    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
        document.getElementById('searchCompanyInput').value = '';
        document.getElementById('filterResponsibleEngineer').value = 'all';
        document.getElementById('filterCity').value = 'all';
        renderCompaniesTable();
    });

    // Add Instrument Row in Modal
    document.getElementById('btnAddInstrumentRow')?.addEventListener('click', () => {
        addInstrumentRow('', '', '');
    });

    // Submit Add/Edit Company Form (Option 1)
    document.getElementById('formCompany')?.addEventListener('submit', handleCompanyFormSubmit);

    // Engineer Allocation Modal Dropdown Change
    document.getElementById('allocSelectEngineer')?.addEventListener('change', (e) => {
        loadEngineerCurrentResponsibilities(e.target.value);
    });

    // Allocation Checklist Filter
    document.getElementById('allocSearchCompaniesInput')?.addEventListener('input', renderAllocationCompanyList);

    // Allocation Select All / Deselect All
    document.getElementById('btnAllocSelectAll')?.addEventListener('click', () => {
        const filterText = (document.getElementById('allocSearchCompaniesInput')?.value || '').trim().toLowerCase();
        Object.values(customersData).forEach(c => {
            if (!filterText || (c.companyName || '').toLowerCase().includes(filterText) || (c.siteLocation || '').toLowerCase().includes(filterText)) {
                selectedAllocationCompanyKeys.add(c.id);
            }
        });
        document.getElementById('allocCurrentCountBadge').textContent = `${selectedAllocationCompanyKeys.size} Companies Selected`;
        renderAllocationCompanyList();
    });

    document.getElementById('btnAllocDeselectAll')?.addEventListener('click', () => {
        selectedAllocationCompanyKeys.clear();
        document.getElementById('allocCurrentCountBadge').textContent = `0 Companies Selected`;
        renderAllocationCompanyList();
    });

    // Submit Engineer Allocation (Option 2)
    document.getElementById('formEngineerAllocation')?.addEventListener('submit', handleSaveAllocationSubmit);

    // View Modal Actions
    document.getElementById('btnEditFromCompanyView')?.addEventListener('click', () => {
        if (currentViewingKey) {
            modalViewCompanyInstance.hide();
            window.editCompany(currentViewingKey);
        }
    });

    document.getElementById('btnDeleteFromCompanyView')?.addEventListener('click', () => {
        if (currentViewingKey) {
            window.deleteCompany(currentViewingKey);
        }
    });

    document.getElementById('btnScheduleFromCompanyView')?.addEventListener('click', () => {
        if (currentViewingKey) {
            window.location.href = `dispatch.html?companyId=${currentViewingKey}`;
        }
    });
}

// Helper: Clean phone number
function cleanPhone(phone) {
    if (!phone) return "";
    let cleaned = phone.toString().replace(/[^0-9]/g, '');
    if (cleaned.length === 10) {
        cleaned = '91' + cleaned;
    }
    return cleaned;
}

// Helper: Escape HTML
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
