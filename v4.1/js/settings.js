import { db, ref, get, set } from './firebase.js';
import { showToast } from './utils.js';

document.addEventListener("DOMContentLoaded", async () => {
    const fields = ['cLogo', 'cName', 'cTax', 'cDesc', 'cAddress', 'cCity', 'cState', 'cZip', 'cCountry', 'cWeb', 'cPhone1', 'cPhone2', 'cEmail1', 'cEmail2'];
    
    // --- Live Preview Handler ---
    const updatePreview = () => {
        const logo = document.getElementById('cLogo').value;
        const pLogo = document.getElementById('pLogo');
        const pLogoPlaceholder = document.getElementById('pLogoPlaceholder');
        
        if (logo) {
            pLogo.src = logo;
            pLogo.style.display = 'inline-block';
            if (pLogoPlaceholder) pLogoPlaceholder.style.display = 'none';
        } else {
            pLogo.style.display = 'none';
            if (pLogoPlaceholder) pLogoPlaceholder.style.display = 'block';
        }

        document.getElementById('pName').textContent = document.getElementById('cName').value || 'Company Name';
        document.getElementById('pCopyName').textContent = document.getElementById('cName').value || 'Company';
        
        const addr = [
            document.getElementById('cAddress').value,
            document.getElementById('cCity').value,
            document.getElementById('cState').value,
            document.getElementById('cCountry').value
        ].filter(Boolean).join(', ');
        const zip = document.getElementById('cZip').value;
        
        document.getElementById('pAddressBlock').textContent = addr + (zip ? ` - ${zip}` : '') || 'Address Line, City, State, Country - Zip';
        
        document.getElementById('pPhone').textContent = document.getElementById('cPhone1').value || '-';
        document.getElementById('pEmail').textContent = document.getElementById('cEmail1').value || '-';
        document.getElementById('pWeb').textContent = document.getElementById('cWeb').value || '-';
    };

    // --- Helper: Extract form values as clean settings object ---
    const getSettingsObject = () => ({
        logo: document.getElementById('cLogo').value.trim(),
        name: document.getElementById('cName').value.trim(),
        tax: document.getElementById('cTax').value.trim(),
        desc: document.getElementById('cDesc').value.trim(),
        address: document.getElementById('cAddress').value.trim(),
        city: document.getElementById('cCity').value.trim(),
        state: document.getElementById('cState').value.trim(),
        zip: document.getElementById('cZip').value.trim(),
        country: document.getElementById('cCountry').value.trim(),
        web: document.getElementById('cWeb').value.trim(),
        phone1: document.getElementById('cPhone1').value.trim(),
        phone2: document.getElementById('cPhone2').value.trim(),
        email1: document.getElementById('cEmail1').value.trim(),
        email2: document.getElementById('cEmail2').value.trim()
    });

    // --- Helper: Populate form and trigger preview update ---
    const populateForm = (raw) => {
        if (!raw || typeof raw !== 'object') {
            throw new Error("Invalid JSON structure: Expected an object.");
        }
        // Unwrap if settings were nested under 'settings' or 'company'
        const s = raw.settings || raw.company || raw;

        document.getElementById('cLogo').value = s.logo ?? s.cLogo ?? '';
        document.getElementById('cName').value = s.name ?? s.cName ?? '';
        document.getElementById('cTax').value = s.tax ?? s.cTax ?? '';
        document.getElementById('cDesc').value = s.desc ?? s.cDesc ?? '';
        document.getElementById('cAddress').value = s.address ?? s.cAddress ?? '';
        document.getElementById('cCity').value = s.city ?? s.cCity ?? '';
        document.getElementById('cState').value = s.state ?? s.cState ?? '';
        document.getElementById('cZip').value = s.zip ?? s.cZip ?? '';
        document.getElementById('cCountry').value = s.country ?? s.cCountry ?? '';
        document.getElementById('cWeb').value = s.web ?? s.cWeb ?? '';
        document.getElementById('cPhone1').value = s.phone1 ?? s.cPhone1 ?? '';
        document.getElementById('cPhone2').value = s.phone2 ?? s.cPhone2 ?? '';
        document.getElementById('cEmail1').value = s.email1 ?? s.cEmail1 ?? '';
        document.getElementById('cEmail2').value = s.email2 ?? s.cEmail2 ?? '';
        
        updatePreview();
    };

    // --- Save Settings to Firebase Realtime Database ---
    const saveSettingsToDb = async (silent = false) => {
        const settings = getSettingsObject();
        try {
            await set(ref(db, 'settings'), settings);
            if (!silent) {
                showToast("Settings Saved Successfully!", "success");
            }
            return true;
        } catch (e) {
            console.error(e);
            showToast("Failed to save settings: " + (e.message || e), "danger");
            return false;
        }
    };

    // --- Initial Load from Database ---
    try {
        const snap = await get(ref(db, 'settings'));
        if (snap.exists()) {
            populateForm(snap.val());
        }
    } catch (e) {
        console.error("Error loading initial settings:", e);
    }

    // Attach input listeners for live preview
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updatePreview);
    });
    updatePreview();

    // Save button event
    document.getElementById('btnSave')?.addEventListener('click', () => saveSettingsToDb(false));

    // --- JSON Export Functionality ---
    const exportJson = () => {
        const settings = getSettingsObject();
        const exportData = {
            ...settings,
            _metadata: {
                app: "Instrument Library V3.0",
                exportedAt: new Date().toISOString()
            }
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const safeName = (settings.name || 'company').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        link.href = url;
        link.download = `company_settings_${safeName}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast("Company settings exported to JSON successfully!", "success");
    };

    document.getElementById('btnExportJson')?.addEventListener('click', exportJson);
    document.getElementById('btnExportJsonCard')?.addEventListener('click', exportJson);

    // --- JSON Import Functionality ---
    const fileInput = document.getElementById('jsonFileInput');
    const triggerFilePick = () => fileInput?.click();

    document.getElementById('btnImportJson')?.addEventListener('click', triggerFilePick);
    document.getElementById('btnImportJsonCard')?.addEventListener('click', triggerFilePick);
    document.getElementById('btnModalImportFile')?.addEventListener('click', triggerFilePick);

    const handleFileImport = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const parsed = JSON.parse(e.target.result);

                // Detect if this is a Full Database Backup (contains documents, instruments, customers, etc.)
                const isFullDb = Boolean(parsed.documents || parsed.instruments || parsed.customers);

                if (isFullDb) {
                    if (parsed.settings) {
                        populateForm(parsed.settings);
                    }

                    // Cache collections locally for immediate offline/instant view
                    if (parsed.instruments) localStorage.setItem('cached_instruments', JSON.stringify(parsed.instruments));
                    if (parsed.documents) localStorage.setItem('cached_documents', JSON.stringify(parsed.documents));
                    if (parsed.settings) localStorage.setItem('cached_settings', JSON.stringify(parsed.settings));

                    const autoSave = document.getElementById('autoSaveOnImport')?.checked;
                    if (autoSave) {
                        showToast("Full Database file detected! Uploading to Firebase...", "info");
                        try {
                            if (parsed.documents) await set(ref(db, 'documents'), parsed.documents);
                            if (parsed.instruments) await set(ref(db, 'instruments'), parsed.instruments);
                            if (parsed.settings) await set(ref(db, 'settings'), parsed.settings);
                            if (parsed.customers) await set(ref(db, 'customers'), parsed.customers);
                            showToast("Full database (Documents, Instruments, Settings, Customers) successfully restored & uploaded!", "success");
                        } catch (err) {
                            console.error("Firebase upload error:", err);
                            showToast("Settings loaded. Upload notice: " + (err.message || err), "warning");
                        }
                    } else {
                        showToast("Full Database backup loaded into memory! Click 'Save Changes' to persist settings.", "success");
                    }
                } else {
                    populateForm(parsed);

                    const autoSave = document.getElementById('autoSaveOnImport')?.checked;
                    if (autoSave) {
                        const saved = await saveSettingsToDb(true);
                        if (saved) {
                            showToast("Settings imported and saved to database successfully!", "success");
                        }
                    } else {
                        showToast("Settings loaded from JSON! Click 'Save Changes' to persist.", "success");
                    }
                }

                // If modal is open, also sync the editor textarea
                const modalTextarea = document.getElementById('jsonEditorTextarea');
                if (modalTextarea) {
                    modalTextarea.value = JSON.stringify(parsed, null, 2);
                }
            } catch (err) {
                console.error("JSON Import Error:", err);
                showToast("Invalid JSON file: " + err.message, "danger");
            }
        };
        reader.onerror = () => {
            showToast("Failed to read JSON file.", "danger");
        };
        reader.readAsText(file);
    };

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFileImport(e.target.files[0]);
                e.target.value = ''; // Reset input to allow selecting the same file again
            }
        });
    }

    // --- JSON Modal & Editor Functionality ---
    const modalEl = document.getElementById('jsonModal');
    const jsonModal = modalEl && typeof bootstrap !== 'undefined' ? new bootstrap.Modal(modalEl) : null;

    const openJsonModal = () => {
        const current = getSettingsObject();
        const exportData = {
            ...current,
            _metadata: {
                app: "Instrument Library V3.0",
                exportedAt: new Date().toISOString()
            }
        };
        const textarea = document.getElementById('jsonEditorTextarea');
        if (textarea) textarea.value = JSON.stringify(exportData, null, 2);
        const status = document.getElementById('jsonStatusMsg');
        if (status) {
            status.textContent = '';
            status.className = 'small';
        }
        jsonModal?.show();
    };

    document.getElementById('btnViewJson')?.addEventListener('click', openJsonModal);
    document.getElementById('btnViewJsonCard')?.addEventListener('click', openJsonModal);

    // Modal: Copy JSON
    document.getElementById('btnCopyJsonModal')?.addEventListener('click', async () => {
        const textarea = document.getElementById('jsonEditorTextarea');
        if (!textarea) return;
        try {
            await navigator.clipboard.writeText(textarea.value);
            showToast("JSON copied to clipboard!", "success");
        } catch {
            textarea.select();
            document.execCommand('copy');
            showToast("JSON copied to clipboard!", "success");
        }
    });

    // Modal: Format / Beautify JSON
    document.getElementById('btnFormatJsonModal')?.addEventListener('click', () => {
        const textarea = document.getElementById('jsonEditorTextarea');
        const status = document.getElementById('jsonStatusMsg');
        if (!textarea) return;
        try {
            const parsed = JSON.parse(textarea.value);
            textarea.value = JSON.stringify(parsed, null, 2);
            if (status) {
                status.textContent = 'JSON valid & formatted.';
                status.className = 'small text-success fw-semibold';
            }
        } catch (err) {
            if (status) {
                status.textContent = 'Invalid JSON: ' + err.message;
                status.className = 'small text-danger fw-semibold';
            }
        }
    });

    // Modal: Apply JSON to Form
    document.getElementById('btnApplyJsonModal')?.addEventListener('click', async () => {
        const textarea = document.getElementById('jsonEditorTextarea');
        const status = document.getElementById('jsonStatusMsg');
        if (!textarea) return;

        try {
            const parsed = JSON.parse(textarea.value);
            populateForm(parsed);

            const autoSave = document.getElementById('autoSaveOnImport')?.checked;
            if (autoSave) {
                const saved = await saveSettingsToDb(true);
                if (saved) {
                    showToast("JSON settings applied and saved to database!", "success");
                }
            } else {
                showToast("JSON settings applied to form! Click 'Save Changes' to persist.", "success");
            }
            jsonModal?.hide();
        } catch (err) {
            if (status) {
                status.textContent = 'Cannot apply: ' + err.message;
                status.className = 'small text-danger fw-semibold';
            }
        }
    });
});
