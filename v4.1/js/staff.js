/**
 * Aadhav Intech - Company Staff & User Access Management (js/staff.js)
 * Enterprise Portal - RBAC, Credentials, Invitation & Real-time Cloud Sync
 */

import { db, ref, get, set, update, remove, onValue, push } from './firebase.js';
import { showToast, loadCompanySettings } from './utils.js';

// State Storage
let allStaff = {};
let availableDocuments = [];
let availableInstruments = [];
let staffModalInstance = null;
let inviteModalInstance = null;
let resetModalInstance = null;

// ============================================================================
// 1. INITIALIZATION & LIFECYCLE
// ============================================================================
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Load branding & company settings
    await loadCompanySettings();

    // 2. Initialize Bootstrap Modals
    staffModalInstance = new bootstrap.Modal(document.getElementById('modalStaffForm'));
    inviteModalInstance = new bootstrap.Modal(document.getElementById('modalInviteShare'));
    resetModalInstance = new bootstrap.Modal(document.getElementById('modalResetPassword'));

    // 3. Setup Event Listeners
    setupEventListeners();

    // 4. Fetch available documents & instruments for permissions picker
    await loadAvailableResources();

    // 5. Setup Real-time Firebase Listener for Staff
    listenToStaffDirectory();
});

// ============================================================================
// 2. CRYPTO & GENERATOR UTILITIES
// ============================================================================
function generateSalt(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let salt = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
        salt += chars[array[i] % chars.length];
    }
    return salt;
}

async function hashPassword(plainText, salt) {
    const enc = new TextEncoder();
    const data = enc.encode(plainText + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateStrongPassword() {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
    let password = "";
    const array = new Uint8Array(10);
    crypto.getRandomValues(array);
    for (let i = 0; i < 10; i++) {
        password += chars[array[i] % chars.length];
    }
    return password;
}

function generateEmployeeId() {
    const count = Object.keys(allStaff).length + 101;
    return `AIT-EMP-${count}`;
}

// ============================================================================
// 3. FETCH AVAILABLE RESOURCES (INSTRUMENTS & USER MANUALS)
// ============================================================================
async function loadAvailableResources() {
    try {
        // Fetch instruments
        const instSnap = await get(ref(db, 'instruments'));
        if (instSnap.exists()) {
            const data = instSnap.val();
            availableInstruments = Object.keys(data).map(key => ({
                id: key,
                name: data[key].general?.name || key,
                type: 'Instrument'
            }));
        }

        // Fetch user manuals / documents
        const docSnap = await get(ref(db, 'documents'));
        if (docSnap.exists()) {
            const data = docSnap.val();
            availableDocuments = Object.keys(data).map(key => ({
                id: key,
                name: data[key].title || data[key].name || key,
                type: 'Manual'
            }));
        }

        renderDocumentChecklist();
    } catch (e) {
        console.warn("Could not load permissions resources:", e);
    }
}

function renderDocumentChecklist(selectedIds = []) {
    const container = document.getElementById('docChecklistContainer');
    if (!container) return;

    const allItems = [...availableDocuments, ...availableInstruments];
    if (allItems.length === 0) {
        container.innerHTML = '<div class="text-muted small">No manuals or instruments found in database.</div>';
        return;
    }

    let html = '';
    allItems.forEach(item => {
        const isChecked = selectedIds.includes(item.id) ? 'checked' : '';
        html += `
            <div class="form-check py-1">
                <input class="form-check-input sf-doc-item" type="checkbox" value="${item.id}" id="doc_chk_${item.id}" ${isChecked}>
                <label class="form-check-label small" for="doc_chk_${item.id}">
                    <span class="badge ${item.type === 'Manual' ? 'bg-primary-subtle text-primary' : 'bg-info-subtle text-info'} me-1">${item.type}</span>
                    ${item.name}
                </label>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ============================================================================
// 4. REAL-TIME FIREBASE SYNC & RENDERING
// ============================================================================
function listenToStaffDirectory() {
    // Primary path in customers/_staff (allowed by default in Firebase Console rules)
    const primaryRef = ref(db, 'customers/_staff');
    onValue(primaryRef, async (snapshot) => {
        let data = snapshot.val() || {};
        
        // Also check if any staff was stored under root 'staff' or 'customers/_engineers'
        try {
            const engSnap = await get(ref(db, 'customers/_engineers'));
            if (engSnap.exists()) {
                const engs = engSnap.val();
                Object.entries(engs).forEach(([k, v]) => {
                    if (!data[k]) {
                        data[k] = {
                            id: k,
                            fullName: v.fullName || 'Engineer',
                            empId: v.username || `AIT-ENG-${k.slice(-4)}`,
                            email: v.email || `${k}@aadhavintech.com`,
                            phone: v.phone || '',
                            role: 'engineer',
                            status: v.status || 'active',
                            department: v.role || 'Service Engineer',
                            location: v.assignedLocations || '',
                            accessAllDocs: true,
                            workingHours: '24_7',
                            salt: v.salt || '',
                            passwordHash: v.passwordHash || '',
                            createdAt: v.createdAt || new Date().toISOString()
                        };
                    }
                });
            }
        } catch (e) {
            console.warn("Syncing fallback engineer records:", e);
        }

        allStaff = data;
        localStorage.setItem('cached_staff', JSON.stringify(data));
        renderStaffDirectory();
        updateStaffStats();
    }, (error) => {
        console.warn("Primary staff listener notice:", error);
        const cached = localStorage.getItem('cached_staff');
        if (cached) {
            allStaff = JSON.parse(cached);
            renderStaffDirectory();
            updateStaffStats();
        }
    });

    // Also listen to root staff if permission granted
    try {
        onValue(ref(db, 'staff'), (snap) => {
            const rootData = snap.val();
            if (rootData && typeof rootData === 'object') {
                allStaff = { ...allStaff, ...rootData };
                renderStaffDirectory();
                updateStaffStats();
            }
        }, () => {});
    } catch (e) {}
}

function renderStaffDirectory() {
    const tbody = document.getElementById('staffTableBody');
    const searchTerm = (document.getElementById('staffSearch')?.value || '').toLowerCase().trim();
    const roleFilter = document.getElementById('roleFilter')?.value || 'all';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';

    const staffList = Object.entries(allStaff).map(([key, val]) => ({ key, ...val }));

    // Filter
    const filtered = staffList.filter(s => {
        const matchesSearch = 
            (s.fullName || '').toLowerCase().includes(searchTerm) ||
            (s.email || '').toLowerCase().includes(searchTerm) ||
            (s.empId || '').toLowerCase().includes(searchTerm) ||
            (s.department || '').toLowerCase().includes(searchTerm) ||
            (s.location || '').toLowerCase().includes(searchTerm);

        const matchesRole = (roleFilter === 'all') || (s.role === roleFilter);
        const matchesStatus = (statusFilter === 'all') || (s.status === statusFilter);

        return matchesSearch && matchesRole && matchesStatus;
    });

    // Update count badge
    document.getElementById('staffCountBadge').textContent = `${filtered.length} of ${staffList.length}`;

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5 text-muted">
                    <i class="fa-solid fa-user-xmark fs-2 text-secondary mb-2 d-block"></i>
                    ${staffList.length === 0 ? 'No company staff added yet. Click "Add New Staff" to create your first team member.' : 'No staff members match the selected filter criteria.'}
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(staff => {
        const initials = (staff.fullName || 'User')
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);

        const roleClass = `role-${staff.role || 'engineer'}`;
        const roleBadgeClass = `badge-role-${staff.role || 'engineer'}`;
        const roleLabels = {
            master: 'IT Master Admin',
            admin: 'Company Admin',
            engineer: 'Service Engineer',
            customer: 'Customer / Viewer'
        };

        const isActive = staff.status === 'active';
        const workingHoursText = staff.workingHours === '24_7' 
            ? '<span class="badge bg-light text-dark border">24/7 Access</span>' 
            : staff.workingHours === 'general_shift' 
            ? '<span class="badge bg-light text-dark border">08:00 - 20:00</span>' 
            : staff.workingHours === 'office_hours'
            ? '<span class="badge bg-light text-dark border">09:00 - 18:00</span>'
            : '<span class="badge bg-light text-dark border">Custom Shift</span>';

        const validityText = staff.validTo ? `<div class="text-muted" style="font-size: 0.72rem;">Exp: ${staff.validTo}</div>` : '';

        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="staff-avatar ${roleClass}">${initials}</div>
                        <div>
                            <div class="fw-bold text-dark-emphasis">${staff.fullName}</div>
                            <div class="text-muted small font-monospace">${staff.empId || '-'}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="text-dark-emphasis small">${staff.email}</div>
                    <div class="text-muted small">${staff.phone || '-'}</div>
                </td>
                <td>
                    <span class="badge ${roleBadgeClass} px-2 py-1 mb-1 d-inline-block">
                        ${roleLabels[staff.role] || staff.role}
                    </span>
                    <div class="text-muted" style="font-size: 0.75rem;">
                        ${staff.accessAllDocs ? '<i class="fa-solid fa-unlock-keyhole text-success me-1"></i>All Manuals' : `<i class="fa-solid fa-lock text-warning me-1"></i>${(staff.assignedDocs || []).length} Assigned`}
                    </div>
                </td>
                <td>
                    <div class="fw-semibold text-dark-emphasis small">${staff.department || 'General Operations'}</div>
                    <div class="text-muted small"><i class="fa-solid fa-location-dot me-1 text-danger"></i>${staff.location || 'All Branches'}</div>
                </td>
                <td>
                    ${workingHoursText}
                    ${validityText}
                </td>
                <td>
                    <div class="d-flex align-items-center gap-1">
                        <span class="${isActive ? 'pulse-dot-active' : 'pulse-dot-suspended'}"></span>
                        <span class="small fw-semibold ${isActive ? 'text-success' : 'text-danger'}">
                            ${isActive ? 'Active' : 'Suspended'}
                        </span>
                    </div>
                    ${staff.forcePasswordReset ? '<span class="badge bg-warning-subtle text-warning mt-1" style="font-size: 0.65rem;">Reset Required</span>' : ''}
                </td>
                <td class="text-end pe-3">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-secondary btn-edit-staff" data-key="${staff.key}" title="Edit Staff Details">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn btn-outline-secondary btn-reset-pass" data-key="${staff.key}" title="Reset Temporary Password">
                            <i class="fa-solid fa-key"></i>
                        </button>
                        <button class="btn btn-outline-secondary ${isActive ? 'text-warning' : 'text-success'} btn-toggle-status" data-key="${staff.key}" data-status="${staff.status}" title="${isActive ? 'Suspend Staff' : 'Activate Staff'}">
                            <i class="fa-solid ${isActive ? 'fa-user-slash' : 'fa-user-check'}"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-delete-staff" data-key="${staff.key}" data-name="${staff.fullName}" title="Delete Staff Member">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    attachRowActionListeners();
}

function updateStaffStats() {
    const staffList = Object.values(allStaff);
    const total = staffList.length;
    const engineers = staffList.filter(s => s.role === 'engineer').length;
    const admins = staffList.filter(s => s.role === 'admin' || s.role === 'master').length;
    const suspended = staffList.filter(s => s.status === 'suspended').length;

    document.getElementById('statTotalStaff').textContent = total;
    document.getElementById('statTotalEngineers').textContent = engineers;
    document.getElementById('statTotalAdmins').textContent = admins;
    document.getElementById('statSuspendedStaff').textContent = suspended;
}

// ============================================================================
// 5. EVENT LISTENERS SETUP
// ============================================================================
function setupEventListeners() {
    // Search & Filter
    document.getElementById('staffSearch')?.addEventListener('input', renderStaffDirectory);
    document.getElementById('roleFilter')?.addEventListener('change', renderStaffDirectory);
    document.getElementById('statusFilter')?.addEventListener('change', renderStaffDirectory);

    // Open Add Staff Modal
    document.getElementById('btnOpenAddStaffModal')?.addEventListener('click', () => {
        resetStaffForm();
        document.getElementById('modalStaffFormLabel').innerHTML = '<i class="fa-solid fa-user-plus text-primary me-2"></i> Add Company Staff Member';
        document.getElementById('sfPassword').value = generateStrongPassword();
        document.getElementById('sfEmpId').value = generateEmployeeId();
        document.getElementById('passwordGroup').style.display = 'block';
        staffModalInstance.show();
    });

    // Generate Buttons
    document.getElementById('btnGenEmpId')?.addEventListener('click', () => {
        document.getElementById('sfEmpId').value = generateEmployeeId();
    });

    document.getElementById('btnGenPassword')?.addEventListener('click', () => {
        document.getElementById('sfPassword').value = generateStrongPassword();
    });

    document.getElementById('btnGenResetPassword')?.addEventListener('click', () => {
        document.getElementById('newTempPassword').value = generateStrongPassword();
    });

    // Access All Docs Toggle
    document.getElementById('sfAccessAllDocs')?.addEventListener('change', (e) => {
        const indSelector = document.getElementById('individualDocSelector');
        if (indSelector) indSelector.style.display = e.target.checked ? 'none' : 'block';
    });

    // Save Staff Button
    document.getElementById('btnSaveStaff')?.addEventListener('click', handleSaveStaff);

    // Confirm Quick Password Reset Button
    document.getElementById('btnConfirmResetPassword')?.addEventListener('click', handleConfirmResetPassword);

    // Copy Invite Message Button
    document.getElementById('btnCopyInvite')?.addEventListener('click', handleCopyInvite);

    // Export CSV Button
    document.getElementById('btnExportCsv')?.addEventListener('click', handleExportCsv);

    // Copy DB Rules Button
    document.getElementById('btnCopyRules')?.addEventListener('click', () => {
        const rulesText = document.getElementById('dbRulesCode')?.innerText || '';
        navigator.clipboard.writeText(rulesText).then(() => {
            showToast("Firebase security rules copied to clipboard!", "success");
        });
    });
}

function attachRowActionListeners() {
    // Edit
    document.querySelectorAll('.btn-edit-staff').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.key;
            openEditStaff(key);
        });
    });

    // Reset Password
    document.querySelectorAll('.btn-reset-pass').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.key;
            openResetPassword(key);
        });
    });

    // Toggle Status
    document.querySelectorAll('.btn-toggle-status').forEach(btn => {
        btn.addEventListener('click', async () => {
            const key = btn.dataset.key;
            const currentStatus = btn.dataset.status;
            const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
            await toggleStaffStatus(key, newStatus);
        });
    });

    // Delete
    document.querySelectorAll('.btn-delete-staff').forEach(btn => {
        btn.addEventListener('click', async () => {
            const key = btn.dataset.key;
            const name = btn.dataset.name;
            await deleteStaff(key, name);
        });
    });
}

// ============================================================================
// 6. FORM HANDLERS (ADD & EDIT)
// ============================================================================
function resetStaffForm() {
    const form = document.getElementById('staffForm');
    form.reset();
    form.classList.remove('was-validated');
    document.getElementById('editStaffKey').value = '';
    document.getElementById('sfAccessAllDocs').checked = true;
    document.getElementById('individualDocSelector').style.display = 'none';
    document.getElementById('sfForceReset').checked = true;
    document.getElementById('sfStatus').value = 'active';
    document.getElementById('sfPassword').setAttribute('required', 'required');
    document.getElementById('passwordHelpText').textContent = 'A secure temporary password for initial sign-in.';
    renderDocumentChecklist([]);
}

function openEditStaff(key) {
    const staff = allStaff[key];
    if (!staff) return;

    resetStaffForm();
    document.getElementById('editStaffKey').value = key;
    document.getElementById('modalStaffFormLabel').innerHTML = '<i class="fa-solid fa-user-pen text-primary me-2"></i> Edit Staff Member Details';

    document.getElementById('sfFullName').value = staff.fullName || '';
    document.getElementById('sfEmpId').value = staff.empId || '';
    document.getElementById('sfEmail').value = staff.email || '';
    document.getElementById('sfPhone').value = staff.phone || '';
    document.getElementById('sfRole').value = staff.role || 'engineer';
    document.getElementById('sfStatus').value = staff.status || 'active';
    document.getElementById('sfDepartment').value = staff.department || '';
    document.getElementById('sfLocation').value = staff.location || '';
    document.getElementById('sfValidFrom').value = staff.validFrom || '';
    document.getElementById('sfValidTo').value = staff.validTo || '';
    document.getElementById('sfWorkingHours').value = staff.workingHours || '24_7';
    document.getElementById('sfForceReset').checked = staff.forcePasswordReset ?? false;

    // Password field is optional in edit mode
    document.getElementById('passwordHelpText').textContent = 'Leave empty to keep existing password unchanged.';
    document.getElementById('sfPassword').value = '';
    document.getElementById('sfPassword').removeAttribute('required');

    // Document permissions
    const accessAll = staff.accessAllDocs ?? true;
    document.getElementById('sfAccessAllDocs').checked = accessAll;
    document.getElementById('individualDocSelector').style.display = accessAll ? 'none' : 'block';
    renderDocumentChecklist(staff.assignedDocs || []);

    staffModalInstance.show();
}

async function handleSaveStaff() {
    const form = document.getElementById('staffForm');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const saveBtn = document.getElementById('btnSaveStaff');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Saving...';

    const editKey = document.getElementById('editStaffKey').value;
    const isEditing = Boolean(editKey);

    const fullName = document.getElementById('sfFullName').value.trim();
    const empId = document.getElementById('sfEmpId').value.trim();
    const email = document.getElementById('sfEmail').value.trim().toLowerCase();
    const phone = document.getElementById('sfPhone').value.trim();
    const role = document.getElementById('sfRole').value;
    const status = document.getElementById('sfStatus').value;
    const department = document.getElementById('sfDepartment').value.trim();
    const location = document.getElementById('sfLocation').value.trim();
    const validFrom = document.getElementById('sfValidFrom').value;
    const validTo = document.getElementById('sfValidTo').value;
    const workingHours = document.getElementById('sfWorkingHours').value;
    const forcePasswordReset = document.getElementById('sfForceReset').checked;
    const accessAllDocs = document.getElementById('sfAccessAllDocs').checked;

    // Collect selected documents
    let assignedDocs = [];
    if (!accessAllDocs) {
        document.querySelectorAll('.sf-doc-item:checked').forEach(cb => {
            assignedDocs.push(cb.value);
        });
    }

    // Password handling
    const plainPassword = document.getElementById('sfPassword').value;

    try {
        let staffRecord = {};
        let targetKey = editKey;

        if (isEditing) {
            staffRecord = { ...(allStaff[editKey] || {}) };
            staffRecord.fullName = fullName;
            staffRecord.empId = empId;
            staffRecord.email = email;
            staffRecord.phone = phone;
            staffRecord.role = role;
            staffRecord.status = status;
            staffRecord.department = department;
            staffRecord.location = location;
            staffRecord.validFrom = validFrom;
            staffRecord.validTo = validTo;
            staffRecord.workingHours = workingHours;
            staffRecord.forcePasswordReset = forcePasswordReset;
            staffRecord.accessAllDocs = accessAllDocs;
            staffRecord.assignedDocs = assignedDocs;
            staffRecord.updatedAt = new Date().toISOString();

            if (plainPassword && plainPassword.length >= 6) {
                const salt = generateSalt();
                const hash = await hashPassword(plainPassword, salt);
                staffRecord.salt = salt;
                staffRecord.passwordHash = hash;
                staffRecord.tempPassword = plainPassword; // stored for initial invite retrieval
            }

            // Update in Firebase Realtime Database (Primary write to customers/_staff)
            await update(ref(db, `customers/_staff/${targetKey}`), staffRecord);
            update(ref(db, `staff/${targetKey}`), staffRecord).catch(() => {});
            update(ref(db, `users/${targetKey}`), staffRecord).catch(() => {});

            // Sync with engineers node for Service Reports compatibility
            if (role === 'engineer') {
                const engUpdates = {
                    id: targetKey,
                    fullName: fullName,
                    email: email,
                    phone: phone,
                    role: department || 'Service Engineer',
                    assignedLocations: location,
                    status: status,
                    salt: staffRecord.salt,
                    passwordHash: staffRecord.passwordHash,
                    updatedAt: staffRecord.updatedAt
                };
                await update(ref(db, `customers/_engineers/${targetKey}`), engUpdates);
                update(ref(db, `engineers/${targetKey}`), engUpdates).catch(() => {});
            }

            showToast(`Staff member "${fullName}" updated successfully!`, 'success');
            staffModalInstance.hide();
        } else {
            // New Staff Creation
            if (!plainPassword || plainPassword.length < 6) {
                showToast("Temporary password must be at least 6 characters.", "danger");
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                return;
            }

            const salt = generateSalt();
            const hash = await hashPassword(plainPassword, salt);
            const newRef = push(ref(db, 'customers/_staff'));
            targetKey = newRef.key;

            staffRecord = {
                id: targetKey,
                fullName,
                empId,
                email,
                phone,
                role,
                status,
                department,
                location,
                validFrom,
                validTo,
                workingHours,
                forcePasswordReset,
                accessAllDocs,
                assignedDocs,
                salt,
                passwordHash: hash,
                tempPassword: plainPassword,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Primary write to customers/_staff (permitted by default rules)
            await set(ref(db, `customers/_staff/${targetKey}`), staffRecord);
            set(ref(db, `staff/${targetKey}`), staffRecord).catch(() => {});
            set(ref(db, `users/${targetKey}`), staffRecord).catch(() => {});

            // Synchronize with engineers for Service Reports compatibility
            if (role === 'engineer') {
                const engData = {
                    id: targetKey,
                    fullName: fullName,
                    email: email,
                    phone: phone,
                    username: empId,
                    role: department || 'Service Engineer',
                    assignedLocations: location,
                    status: status,
                    salt: salt,
                    passwordHash: hash,
                    createdAt: staffRecord.createdAt,
                    updatedAt: staffRecord.updatedAt
                };
                await set(ref(db, `customers/_engineers/${targetKey}`), engData);
                set(ref(db, `engineers/${targetKey}`), engData).catch(() => {});
            }

            showToast(`Staff member "${fullName}" created successfully!`, 'success');
            staffModalInstance.hide();

            // Open Invite Sharing Modal
            showInviteModal({
                fullName,
                empId,
                email,
                role,
                tempPassword: plainPassword
            });
        }
    } catch (err) {
        console.error("Save staff error:", err);
        showToast("Failed to save staff member: " + (err.message || err), 'danger');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

// ============================================================================
// 7. STATUS & QUICK ACTIONS
// ============================================================================
async function toggleStaffStatus(key, newStatus) {
    try {
        const updates = {
            status: newStatus,
            updatedAt: new Date().toISOString()
        };
        await update(ref(db, `customers/_staff/${key}`), updates);
        update(ref(db, `customers/_engineers/${key}`), updates).catch(() => {});
        update(ref(db, `staff/${key}`), updates).catch(() => {});
        update(ref(db, `users/${key}`), updates).catch(() => {});
        update(ref(db, `engineers/${key}`), updates).catch(() => {});

        showToast(`Staff account ${newStatus === 'active' ? 'activated' : 'suspended'}.`, 'info');
    } catch (e) {
        console.error(e);
        showToast("Error updating status: " + e.message, "danger");
    }
}

async function deleteStaff(key, name) {
    if (!confirm(`Are you sure you want to permanently delete staff member "${name}"? This action cannot be undone.`)) {
        return;
    }

    try {
        await remove(ref(db, `customers/_staff/${key}`));
        remove(ref(db, `customers/_engineers/${key}`)).catch(() => {});
        remove(ref(db, `staff/${key}`)).catch(() => {});
        remove(ref(db, `users/${key}`)).catch(() => {});
        remove(ref(db, `engineers/${key}`)).catch(() => {});
        showToast(`Staff member "${name}" has been deleted.`, 'success');
    } catch (e) {
        console.error(e);
        showToast("Error deleting staff: " + e.message, "danger");
    }
}

function openResetPassword(key) {
    const staff = allStaff[key];
    if (!staff) return;

    document.getElementById('resetStaffKey').value = key;
    document.getElementById('resetStaffName').textContent = `${staff.fullName} (${staff.email})`;
    document.getElementById('newTempPassword').value = generateStrongPassword();
    document.getElementById('resetForceChange').checked = true;

    resetModalInstance.show();
}

async function handleConfirmResetPassword() {
    const key = document.getElementById('resetStaffKey').value;
    const newPass = document.getElementById('newTempPassword').value;
    const forceReset = document.getElementById('resetForceChange').checked;
    const staff = allStaff[key];

    if (!newPass || newPass.length < 6) {
        showToast("Temporary password must be at least 6 characters.", "danger");
        return;
    }

    try {
        const salt = generateSalt();
        const hash = await hashPassword(newPass, salt);
        const updates = {
            salt,
            passwordHash: hash,
            tempPassword: newPass,
            forcePasswordReset: forceReset,
            updatedAt: new Date().toISOString()
        };

        await update(ref(db, `customers/_staff/${key}`), updates);
        update(ref(db, `customers/_engineers/${key}`), { salt, passwordHash: hash, updatedAt: updates.updatedAt }).catch(() => {});
        update(ref(db, `staff/${key}`), updates).catch(() => {});
        update(ref(db, `users/${key}`), updates).catch(() => {});
        update(ref(db, `engineers/${key}`), { salt, passwordHash: hash, updatedAt: updates.updatedAt }).catch(() => {});

        resetModalInstance.hide();
        showToast("Password reset successfully!", "success");

        // Show invite modal with updated credentials
        showInviteModal({
            fullName: staff.fullName,
            empId: staff.empId,
            email: staff.email,
            role: staff.role,
            tempPassword: newPass
        });
    } catch (e) {
        console.error(e);
        showToast("Failed to reset password: " + e.message, "danger");
    }
}

// ============================================================================
// 8. INVITE MODAL & CLIPBOARD SHARING
// ============================================================================
function showInviteModal(data) {
    const portalUrl = window.location.origin + window.location.pathname.replace('staff.html', 'index.html');

    document.getElementById('invStaffName').textContent = data.fullName;
    document.getElementById('invStaffId').textContent = data.empId || '-';
    document.getElementById('invRole').textContent = data.role.toUpperCase();
    document.getElementById('invEmail').textContent = data.email;
    document.getElementById('invPass').textContent = data.tempPassword;
    document.getElementById('invUrl').textContent = portalUrl;

    inviteModalInstance.show();
}

function handleCopyInvite() {
    const name = document.getElementById('invStaffName').textContent;
    const empId = document.getElementById('invStaffId').textContent;
    const role = document.getElementById('invRole').textContent;
    const email = document.getElementById('invEmail').textContent;
    const pass = document.getElementById('invPass').textContent;
    const url = document.getElementById('invUrl').textContent;

    const message = 
`🔒 Aadhav Intech Enterprise Portal - Access Credentials
--------------------------------------------------
Dear ${name},

Your account has been created on the Enterprise Document & Instrument Portal.

• Staff ID: ${empId}
• Role: ${role}
• Portal URL: ${url}
• Login Email: ${email}
• Temporary Password: ${pass}

* You will be prompted to choose a new password on your first sign-in.
--------------------------------------------------
Please do not share your credentials with unauthorized individuals.`;

    navigator.clipboard.writeText(message).then(() => {
        showToast("Invite credentials copied to clipboard!", "success");
    }).catch(err => {
        console.error("Clipboard copy failed:", err);
        showToast("Failed to copy automatically. Please select and copy manually.", "warning");
    });
}

// ============================================================================
// 9. EXPORT DIRECTORY TO CSV
// ============================================================================
function handleExportCsv() {
    const staffList = Object.values(allStaff);
    if (staffList.length === 0) {
        showToast("No staff records to export.", "warning");
        return;
    }

    const headers = ["Employee ID", "Full Name", "Email", "Phone", "Role", "Department", "Location", "Status", "Working Hours", "Valid Until", "Created At"];
    const rows = staffList.map(s => [
        `"${s.empId || ''}"`,
        `"${s.fullName || ''}"`,
        `"${s.email || ''}"`,
        `"${s.phone || ''}"`,
        `"${s.role || ''}"`,
        `"${s.department || ''}"`,
        `"${s.location || ''}"`,
        `"${s.status || 'active'}"`,
        `"${s.workingHours || '24_7'}"`,
        `"${s.validTo || 'Permanent'}"`,
        `"${s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Aadhav_Intech_Staff_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Staff directory exported successfully!", "success");
}
