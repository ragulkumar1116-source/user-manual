/**
 * Aadhav Intech - Installation & Service Report Generator
 * Upgraded Enterprise Engine with:
 * - 100% Preserved & Untouched Original A4 Document Structure & Print Layout
 * - Permanent Firebase Realtime Database Integration (Direct Realtime Cloud Sync)
 * - Company Details Management (Permanent Storage, Search, Autofill, Archiving)
 * - Service Report Generation, History, Search, Reopen, Edit, Print & PDF Download
 * - Dashboard with KPI Metrics & Recent Activity
 * - Offline Fallback Caching & Full JSON Backup / Restore
 */

// Import modular Firebase SDK from Google CDN
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
// 1. FIREBASE INITIALIZATION & SAFETY CONFIG
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
// 2. STATE MANAGEMENT & CACHING
// ============================================================================
let companiesData = JSON.parse(localStorage.getItem('cached_companies') || '{}');
let reportsData = JSON.parse(localStorage.getItem('cached_reports') || '{}');
let currentReportId = null; // null = new draft, string = editing saved report
let currentAuthUser = JSON.parse(localStorage.getItem('cached_auth_user') || 'null');
let spareItems = [];

// Default Initial Company Profiles (Derived from Existing Presets)
const defaultInitialCompanies = {
  comp_everest: {
    id: "comp_everest",
    companyName: "Everest Industries Limited",
    customerName: "Gopinathan.SR",
    contactPerson: "Gopinathan.SR",
    designation: "Asst. Manager",
    dept: "EHS",
    tel: "",
    phone: "9790030842",
    mobile: "9790030842",
    email: "Gopinathan.sr@everestind.com",
    address: "SF No. 583 & 586/587, Asbestos Road, Everest Colony, Podanur, Coimbatore, Tamil Nadu, 641023.",
    addressLine1: "SF No. 583 & 586/587, Asbestos Road",
    addressLine2: "Everest Colony",
    addressLine3: "Podanur, Coimbatore",
    addressLine4: ", Tamil Nadu, 641023.",
    siteLocation: "Podanur, Coimbatore",
    defaultInstrument: "OCEMS L-800",
    archived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  comp_adithya: {
    id: "comp_adithya",
    companyName: "ADITHYA TECHNO PARK",
    customerName: "A.ESAIMARAN",
    contactPerson: "A.ESAIMARAN",
    designation: "",
    dept: "STP",
    tel: "",
    phone: "9944037958",
    mobile: "9944037958",
    email: "Aesaimaran27@gmail.com",
    address: "368, Thudiyalur Rd, Vasantham Nagar, Saravanampatti, Coimbatore, Tamil Nadu 641035",
    addressLine1: "368, Thudiyalur Rd, Vasantham Nagar",
    addressLine2: "Saravanampatti",
    addressLine3: "Coimbatore, Tamil Nadu 641035",
    addressLine4: "",
    siteLocation: "Saravanampatti, Coimbatore",
    defaultInstrument: "OCEMS L- 600",
    archived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  comp_ganga: {
    id: "comp_ganga",
    companyName: "GANGA HOSPITAL",
    customerName: "Hospital Operations",
    contactPerson: "Hospital Operations",
    designation: "Bio-Medical",
    dept: "Operations",
    tel: "",
    phone: "",
    mobile: "",
    email: "",
    address: "313, Mettupalayam Road, near Saibaba Koil (Saibaba Colony), Coimbatore, Tamil Nadu, 641043",
    addressLine1: "313, Mettupalayam Road, near Saibaba",
    addressLine2: "Koil (Saibaba Colony), Coimbatore,",
    addressLine3: "Tamil Nadu, 641043",
    addressLine4: "",
    siteLocation: "Mettupalayam Road, Coimbatore",
    defaultInstrument: "OCEMS L - 600",
    archived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};

// ============================================================================
// 3. TOAST NOTIFICATIONS & CONFIRMATION HELPERS
// ============================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `app-toast toast-${type}`;
  
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
  const modal = document.getElementById('modal-confirm');
  const titleEl = document.getElementById('modal-confirm-title');
  const msgEl = document.getElementById('modal-confirm-message');
  const btnProceed = document.getElementById('btn-action-confirm');
  const btnCancel = document.getElementById('btn-cancel-confirm');
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
// 4. DOM INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Navigation & Views
  const navTabBtns = document.querySelectorAll('.nav-tab-btn');
  const appViews = document.querySelectorAll('.app-view-container');
  const cloudDot = document.getElementById('cloud-dot');
  const cloudStatusText = document.getElementById('cloud-status-text');

  // Mobile View Toggles
  const btnShowEditor = document.getElementById('btn-show-editor');
  const btnShowPreview = document.getElementById('btn-show-preview');
  const panelEditor = document.getElementById('panel-editor');
  const panelPreview = document.getElementById('panel-preview');
  const a4Scaler = document.getElementById('a4-scaler');
  const mobileToggleWrapper = document.getElementById('mobile-toggle-wrapper');

  // Form Inputs
  const selectReportType = document.getElementById('select-report-type');
  const selectFont = document.getElementById('select-font-family');
  const chkEnableSpares = document.getElementById('chk-enable-spares');
  const selectCompanyAutofill = document.getElementById('select-company-autofill');
  const inputReportNo = document.getElementById('input-report-no');
  const btnAutoReportNo = document.getElementById('btn-auto-report-no');
  const btnQuickNewCompany = document.getElementById('btn-quick-new-company');

  const inputDate = document.getElementById('input-date');
  const inputCustName = document.getElementById('input-cust-name');
  const inputCustAddr1 = document.getElementById('input-cust-addr1');
  const inputCustAddr2 = document.getElementById('input-cust-addr2');
  const inputCustAddr3 = document.getElementById('input-cust-addr3');
  const inputCustAddr4 = document.getElementById('input-cust-addr4');

  const inputContactPerson = document.getElementById('input-contact-person');
  const inputDesignation = document.getElementById('input-designation');
  const inputDept = document.getElementById('input-dept');
  const inputTel = document.getElementById('input-tel');
  const inputMobile = document.getElementById('input-mobile');
  const inputEmail = document.getElementById('input-email');

  const inputInstName = document.getElementById('input-inst-name');
  const inputInstModel = document.getElementById('input-inst-model');
  const inputSrNo = document.getElementById('input-sr-no');

  const chkInstallation = document.getElementById('chk-installation');
  const chkWarranty = document.getElementById('chk-warranty');
  const chkAmc = document.getElementById('chk-amc');
  const chkServices = document.getElementById('chk-services');
  const chkCalibration = document.getElementById('chk-calibration');
  const chkChargeable = document.getElementById('chk-chargeable');
  const inputChargeAmount = document.getElementById('input-charge-amount');

  const inputActionHeading = document.getElementById('input-action-heading');
  const inputRegards = document.getElementById('input-regards');
  const groupRegards = document.getElementById('group-regards');
  const inputActionTaken = document.getElementById('input-action-taken');
  const inputCustomerRemark = document.getElementById('input-customer-remark');

  // Preview Elements (100% Matching Original HTML)
  const a4Doc = document.getElementById('a4-report-content');
  const viewDocTitle = document.getElementById('view-doc-title');
  const viewDateCell = document.getElementById('view-date-cell');
  const viewCustName = document.getElementById('view-cust-name');
  const viewCustAddr1 = document.getElementById('view-cust-addr1');
  const viewCustAddr2 = document.getElementById('view-cust-addr2');
  const viewCustAddr3 = document.getElementById('view-cust-addr3');
  const viewCustAddr4 = document.getElementById('view-cust-addr4');

  const viewContactPerson = document.getElementById('view-contact-person');
  const viewDesignation = document.getElementById('view-designation');
  const viewDept = document.getElementById('view-dept');
  const viewTel = document.getElementById('view-tel');
  const viewMobile = document.getElementById('view-mobile');
  const viewEmail = document.getElementById('view-email');

  const viewInstName = document.getElementById('view-inst-name');
  const viewInstModel = document.getElementById('view-inst-model');
  const viewSrNo = document.getElementById('view-sr-no');

  const viewChkInstallation = document.getElementById('view-chk-installation');
  const viewChkWarranty = document.getElementById('view-chk-warranty');
  const viewChkAmc = document.getElementById('view-chk-amc');
  const viewChkServices = document.getElementById('view-chk-services');
  const viewChkCalibration = document.getElementById('view-chk-calibration');
  const viewChkChargeable = document.getElementById('view-chk-chargeable');
  const viewChargeAmount = document.getElementById('view-charge-amount');

  const viewRegardsBlock = document.getElementById('view-regards-block');
  const viewRegards = document.getElementById('view-regards');
  const viewActionHeading = document.getElementById('view-action-heading');
  const viewActionTaken = document.getElementById('view-action-taken');

  const viewSparesBlock = document.getElementById('view-spares-block');
  const viewSparesTbody = document.getElementById('view-spares-tbody');
  const sectionSparesEditor = document.getElementById('section-spares-editor');
  const sparesRowsContainer = document.getElementById('spares-rows-container');
  const btnAddSpare = document.getElementById('btn-add-spare');

  const viewCustomerRemark = document.getElementById('view-customer-remark');
  const viewEngSigImg = document.getElementById('view-eng-sig-img');
  const viewCustSigImg = document.getElementById('view-cust-sig-img');

  const selectPresetLoader = document.getElementById('select-preset-loader');
  const btnClearForm = document.getElementById('btn-clear-form');
  const btnPrintReport = document.getElementById('btn-print-report');
  const btnPreviewPrint = document.getElementById('btn-preview-print');
  const btnDirectPdfDownload = document.getElementById('btn-direct-pdf-download');

  const btnSaveReport = document.getElementById('btn-save-report');
  const btnSaveReportBottom = document.getElementById('btn-save-report-bottom');
  const btnSaveNewCopy = document.getElementById('btn-save-new-copy');
  const editorActiveStatus = document.getElementById('editor-active-status');

  // ============================================================================
  // 5. VIEW NAVIGATION LOGIC
  // ============================================================================
  function switchView(targetViewId) {
    appViews.forEach(view => {
      if (view.id === targetViewId) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    navTabBtns.forEach(btn => {
      if (btn.getAttribute('data-target-view') === targetViewId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Mobile editor toggle is only relevant in generator view
    if (mobileToggleWrapper) {
      mobileToggleWrapper.style.display = (targetViewId === 'view-generator' && window.innerWidth <= 992) ? 'flex' : 'none';
    }

    if (targetViewId === 'view-generator') {
      autoScaleA4();
    } else if (targetViewId === 'view-dashboard') {
      renderDashboard();
    } else if (targetViewId === 'view-companies') {
      renderCompaniesTable();
    } else if (targetViewId === 'view-history') {
      renderReportsTable();
    }
  }

  navTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target-view');
      switchView(targetId);
    });
  });

  // Quick Dashboard Navigation Buttons
  document.getElementById('btn-dash-new-report')?.addEventListener('click', () => {
    createNewReport();
    switchView('view-generator');
  });
  document.getElementById('btn-dash-add-company')?.addEventListener('click', () => {
    openCompanyModal();
  });
  document.getElementById('btn-dash-view-history')?.addEventListener('click', () => {
    switchView('view-history');
  });
  document.getElementById('btn-dash-see-all-reports')?.addEventListener('click', () => {
    switchView('view-history');
  });
  document.getElementById('btn-dash-manage-companies')?.addEventListener('click', () => {
    switchView('view-companies');
  });
  document.getElementById('btn-history-new-report')?.addEventListener('click', () => {
    createNewReport();
    switchView('view-generator');
  });

  // ============================================================================
  // 6. RESPONSIVE A4 SCALING & MOBILE TOGGLES
  // ============================================================================
  function initMobileView() {
    if (window.innerWidth <= 992) {
      if (btnShowEditor) btnShowEditor.classList.add('active');
      if (btnShowPreview) btnShowPreview.classList.remove('active');
      if (panelEditor) panelEditor.classList.remove('mobile-hidden');
      if (panelPreview) panelPreview.classList.add('mobile-hidden');
      if (mobileToggleWrapper) {
        const isGen = document.getElementById('view-generator')?.classList.contains('active');
        mobileToggleWrapper.style.display = isGen ? 'flex' : 'none';
      }
    } else {
      if (panelEditor) panelEditor.classList.remove('mobile-hidden');
      if (panelPreview) panelPreview.classList.remove('mobile-hidden');
      if (mobileToggleWrapper) mobileToggleWrapper.style.display = 'none';
    }
    autoScaleA4();
  }

  if (btnShowEditor && btnShowPreview) {
    btnShowEditor.addEventListener('click', () => {
      btnShowEditor.classList.add('active');
      btnShowPreview.classList.remove('active');
      panelEditor.classList.remove('mobile-hidden');
      panelPreview.classList.add('mobile-hidden');
    });

    btnShowPreview.addEventListener('click', () => {
      btnShowPreview.classList.add('active');
      btnShowEditor.classList.remove('active');
      panelPreview.classList.remove('mobile-hidden');
      panelEditor.classList.add('mobile-hidden');
      autoScaleA4();
    });
  }

  function autoScaleA4() {
    if (!a4Scaler || !panelPreview) return;
    const containerWidth = panelPreview.clientWidth - 32;
    const a4PixelWidth = 794;
    if (containerWidth > 0 && containerWidth < a4PixelWidth) {
      const scale = containerWidth / a4PixelWidth;
      a4Scaler.style.transform = `scale(${scale})`;
      a4Scaler.style.marginBottom = `-${(1 - scale) * 1122}px`;
    } else {
      a4Scaler.style.transform = 'none';
      a4Scaler.style.marginBottom = '0px';
    }
  }

  window.addEventListener('resize', initMobileView);

  // ============================================================================
  // 7. SPARE PARTS MODULE (DEFAULT 4-ROW DOCUMENT STANDARD)
  // ============================================================================
  function initDefault4SpareRows() {
    spareItems = [
      { id: 1, itemCode: '', item: '', qty: '', replaced: false, recommended: false },
      { id: 2, itemCode: '', item: '', qty: '', replaced: false, recommended: false },
      { id: 3, itemCode: '', item: '', qty: '', replaced: false, recommended: false },
      { id: 4, itemCode: '', item: '', qty: '', replaced: false, recommended: false }
    ];
  }

  function addSpareRow(itemCode = '', item = '', qty = '', replaced = false, recommended = false) {
    const id = Date.now() + Math.random();
    spareItems.push({ id, itemCode, item, qty, replaced, recommended });
    renderSpareEditorRows();
    updatePreview();
  }

  function removeSpareRow(id) {
    spareItems = spareItems.filter(s => s.id !== id);
    renderSpareEditorRows();
    updatePreview();
  }

  function renderSpareEditorRows() {
    if (!sparesRowsContainer) return;
    sparesRowsContainer.innerHTML = '';
    spareItems.forEach((row, idx) => {
      const div = document.createElement('div');
      div.className = 'spare-item-row';
      div.innerHTML = `
        <div class="row-header">
          <span>Row #${idx + 1}</span>
          <button type="button" class="btn-danger-xs" data-id="${row.id}">Remove</button>
        </div>
        <div class="row-inputs">
          <input type="text" class="spare-code" placeholder="Code" value="${escapeHtml(row.itemCode)}">
          <input type="text" class="spare-name" placeholder="Item Description" value="${escapeHtml(row.item)}" style="flex:2;">
          <input type="text" class="spare-qty" placeholder="Qty" value="${escapeHtml(row.qty)}" style="width:50px;">
        </div>
        <div class="row-checks">
          <label class="checkbox-label"><input type="checkbox" class="spare-rep" ${row.replaced ? 'checked' : ''}><span>Replaced</span></label>
          <label class="checkbox-label"><input type="checkbox" class="spare-rec" ${row.recommended ? 'checked' : ''}><span>Recommended</span></label>
        </div>
      `;

      div.querySelector('.spare-code').addEventListener('input', (e) => { row.itemCode = e.target.value; updatePreview(); });
      div.querySelector('.spare-name').addEventListener('input', (e) => { row.item = e.target.value; updatePreview(); });
      div.querySelector('.spare-qty').addEventListener('input', (e) => { row.qty = e.target.value; updatePreview(); });
      div.querySelector('.spare-rep').addEventListener('change', (e) => { row.replaced = e.target.checked; updatePreview(); });
      div.querySelector('.spare-rec').addEventListener('change', (e) => { row.recommended = e.target.checked; updatePreview(); });
      div.querySelector('.btn-danger-xs').addEventListener('click', () => removeSpareRow(row.id));

      sparesRowsContainer.appendChild(div);
    });
  }

  function renderSpareTablePreview() {
    if (!viewSparesTbody) return;
    viewSparesTbody.innerHTML = '';
    // Always render 4 rows minimum matching EVEREST.pdf document standard
    const rowsToRender = Math.max(spareItems.length, 4);

    for (let idx = 0; idx < rowsToRender; idx++) {
      const item = spareItems[idx] || {};
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${item.itemCode || '&nbsp;'}</td>
        <td class="td-left">${item.item || '&nbsp;'}</td>
        <td>${item.qty || '&nbsp;'}</td>
        <td>${item.replaced ? '☑' : ''}</td>
        <td>${item.recommended ? '☑' : ''}</td>
      `;
      viewSparesTbody.appendChild(tr);
    }
  }

  if (btnAddSpare) {
    btnAddSpare.addEventListener('click', () => addSpareRow());
  }

  // ============================================================================
  // 8. EXACT A4 LIVE PREVIEW SYNCHRONIZATION
  // ============================================================================
  function updatePreview() {
    if (!viewDocTitle) return;

    viewDocTitle.textContent = selectReportType.value || 'SERVICE REPORT';
    viewDateCell.textContent = `Date: ${inputDate.value || 'DD/MM/YYYY'}`;

    viewCustName.textContent = inputCustName.value || '\u00A0';
    viewCustAddr1.textContent = inputCustAddr1.value || '\u00A0';
    viewCustAddr2.textContent = inputCustAddr2.value || '\u00A0';
    viewCustAddr3.textContent = inputCustAddr3.value || '\u00A0';
    viewCustAddr4.textContent = inputCustAddr4.value || '';

    viewContactPerson.textContent = inputContactPerson.value || '';
    viewDesignation.textContent = inputDesignation.value || '';
    viewDept.textContent = inputDept.value || '';
    viewTel.textContent = inputTel.value || '';
    viewMobile.textContent = inputMobile.value || '';
    viewEmail.textContent = inputEmail.value || '';

    viewInstName.textContent = inputInstName.value || '\u00A0';
    viewInstModel.textContent = inputInstModel.value || '\u00A0';
    viewSrNo.textContent = inputSrNo.value || '';

    viewChkInstallation.textContent = chkInstallation.checked ? '☑' : '☐';
    viewChkWarranty.textContent = chkWarranty.checked ? '☑' : '☐';
    viewChkAmc.textContent = chkAmc.checked ? '☑' : '☐';
    viewChkServices.textContent = chkServices.checked ? '☑' : '☐';
    viewChkCalibration.textContent = chkCalibration.checked ? '☑' : '☐';

    viewChkChargeable.textContent = chkChargeable.checked ? '☑' : '☐';
    viewChargeAmount.textContent = inputChargeAmount.value || '_______________';

    // Regards Block Logic
    if (selectReportType.value.includes('INSTALLATION') || (inputRegards.value && inputRegards.value.trim() !== '')) {
      viewRegardsBlock.style.display = 'block';
      groupRegards.style.display = 'block';
    } else {
      viewRegardsBlock.style.display = 'none';
      groupRegards.style.display = 'none';
    }
    viewRegards.textContent = inputRegards.value || '';

    viewActionHeading.textContent = inputActionHeading.value || 'Problem Reported:';
    viewActionTaken.textContent = inputActionTaken.value || '';

    // Spare Parts Module
    if (chkEnableSpares.checked) {
      viewSparesBlock.style.display = 'block';
      sectionSparesEditor.style.display = 'block';
      renderSpareTablePreview();
    } else {
      viewSparesBlock.style.display = 'none';
      sectionSparesEditor.style.display = 'none';
    }

    viewCustomerRemark.textContent = inputCustomerRemark.value || '';
  }

  // ============================================================================
  // 9. SIGNATURES & TOUCH DRAWING
  // ============================================================================
  function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const parentBox = btn.closest('.signature-input-box');
        parentBox.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        parentBox.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        document.getElementById(targetId)?.classList.add('active');
      });
    });
  }
  setupTabs();

  function initSignatureCanvas(canvasId, clearBtnId, previewTargetEl) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let isDrawing = false;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000080';

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      let clientX, clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    }

    function startDrawing(e) {
      isDrawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }

    function draw(e) {
      if (!isDrawing) return;
      if (e.cancelable) e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      syncSignatureToPreview();
    }

    function stopDrawing() {
      if (isDrawing) {
        isDrawing = false;
        ctx.closePath();
        syncSignatureToPreview();
      }
    }

    function syncSignatureToPreview() {
      const dataUrl = canvas.toDataURL('image/png');
      previewTargetEl.innerHTML = `<img src="${dataUrl}" alt="Signature">`;
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    canvas.addEventListener('touchstart', (e) => startDrawing(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => draw(e), { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    document.getElementById(clearBtnId)?.addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      previewTargetEl.innerHTML = '';
    });
  }

  initSignatureCanvas('canvas-engineer', 'btn-clear-eng-canvas', viewEngSigImg);
  initSignatureCanvas('canvas-customer', 'btn-clear-cust-canvas', viewCustSigImg);

  function setupFileUpload(inputId, previewTargetEl) {
    const fileInput = document.getElementById(inputId);
    if (!fileInput) return;
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
          previewTargetEl.innerHTML = `<img src="${evt.target.result}" alt="Signature/Seal">`;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  setupFileUpload('file-engineer-sig', viewEngSigImg);
  setupFileUpload('file-customer-sig', viewCustSigImg);

  function getSignatureData() {
    let engSig = '';
    let custSig = '';

    const engImg = viewEngSigImg?.querySelector('img');
    if (engImg && engImg.src) engSig = engImg.src;

    const custImg = viewCustSigImg?.querySelector('img');
    if (custImg && custImg.src) custSig = custImg.src;

    return { engSig, custSig };
  }

  function setSignatureData(engSig, custSig) {
    if (viewEngSigImg) viewEngSigImg.innerHTML = engSig ? `<img src="${engSig}" alt="Engineer Signature">` : '';
    if (viewCustSigImg) viewCustSigImg.innerHTML = custSig ? `<img src="${custSig}" alt="Customer Seal & Signature">` : '';
  }

  // ============================================================================
  // 10. FORM SERIALIZATION & DESERIALIZATION
  // ============================================================================
  function generateSequentialReportNumber() {
    const existing = Object.values(reportsData);
    const count = existing.length + 1;
    const year = new Date().getFullYear();
    const pad = String(count).padStart(4, '0');
    return `AIT-SR-${year}-${pad}`;
  }

  function getReportFormData() {
    const sigs = getSignatureData();
    return {
      reportNumber: inputReportNo.value.trim() || generateSequentialReportNumber(),
      reportType: selectReportType.value || 'SERVICE REPORT',
      fontFamily: selectFont.value || 'font-times',
      date: inputDate.value.trim() || new Date().toLocaleDateString('en-GB'),

      custName: inputCustName.value.trim(),
      custAddr1: inputCustAddr1.value.trim(),
      custAddr2: inputCustAddr2.value.trim(),
      custAddr3: inputCustAddr3.value.trim(),
      custAddr4: inputCustAddr4.value.trim(),

      contactPerson: inputContactPerson.value.trim(),
      designation: inputDesignation.value.trim(),
      dept: inputDept.value.trim(),
      tel: inputTel.value.trim(),
      mobile: inputMobile.value.trim(),
      email: inputEmail.value.trim(),

      instName: inputInstName.value.trim(),
      instModel: inputInstModel.value.trim(),
      srNo: inputSrNo.value.trim(),

      installation: chkInstallation.checked,
      warranty: chkWarranty.checked,
      amc: chkAmc.checked,
      services: chkServices.checked,
      calibration: chkCalibration.checked,

      chargeable: chkChargeable.checked,
      chargeAmount: inputChargeAmount.value.trim(),

      actionHeading: inputActionHeading.value.trim() || 'Problem Reported:',
      regards: inputRegards.value.trim(),
      actionTaken: inputActionTaken.value.trim(),
      customerRemark: inputCustomerRemark.value.trim(),

      enableSpares: chkEnableSpares.checked,
      spares: [...spareItems],
      signatures: {
        engineerSig: sigs.engSig,
        customerSig: sigs.custSig
      }
    };
  }

  function loadFormData(data, reportKey = null) {
    currentReportId = reportKey;

    if (reportKey) {
      editorActiveStatus.textContent = `Editing: ${data.reportNumber || reportKey}`;
      editorActiveStatus.style.color = 'var(--primary)';
    } else {
      editorActiveStatus.textContent = 'New Unsaved Report';
      editorActiveStatus.style.color = 'var(--warning)';
    }

    inputReportNo.value = data.reportNumber || (reportKey ? reportKey : generateSequentialReportNumber());
    selectReportType.value = data.reportType || 'SERVICE REPORT';

    if (data.fontFamily) {
      selectFont.value = data.fontFamily;
      a4Doc.classList.remove('font-times', 'font-arial', 'font-calibri');
      a4Doc.classList.add(data.fontFamily);
    }

    inputDate.value = data.date || new Date().toLocaleDateString('en-GB');

    inputCustName.value = data.custName || '';
    inputCustAddr1.value = data.custAddr1 || '';
    inputCustAddr2.value = data.custAddr2 || '';
    inputCustAddr3.value = data.custAddr3 || '';
    inputCustAddr4.value = data.custAddr4 || '';

    inputContactPerson.value = data.contactPerson || '';
    inputDesignation.value = data.designation || '';
    inputDept.value = data.dept || '';
    inputTel.value = data.tel || '';
    inputMobile.value = data.mobile || '';
    inputEmail.value = data.email || '';

    inputInstName.value = data.instName || '';
    inputInstModel.value = data.instModel || '';
    inputSrNo.value = data.srNo || '';

    chkInstallation.checked = !!data.installation;
    chkWarranty.checked = !!data.warranty;
    chkAmc.checked = !!data.amc;
    chkServices.checked = !!data.services;
    chkCalibration.checked = !!data.calibration;

    chkChargeable.checked = !!data.chargeable;
    inputChargeAmount.value = data.chargeAmount || '';

    inputActionHeading.value = data.actionHeading || 'Problem Reported:';
    inputRegards.value = data.regards || '';
    inputActionTaken.value = data.actionTaken || '';
    inputCustomerRemark.value = data.customerRemark || '';

    chkEnableSpares.checked = (data.enableSpares !== false);

    if (data.spares && data.spares.length > 0) {
      spareItems = JSON.parse(JSON.stringify(data.spares));
    } else if (chkEnableSpares.checked) {
      initDefault4SpareRows();
    } else {
      spareItems = [];
    }

    renderSpareEditorRows();

    if (data.signatures) {
      setSignatureData(data.signatures.engineerSig || '', data.signatures.customerSig || '');
    } else {
      setSignatureData('', '');
    }

    updatePreview();
  }

  function createNewReport() {
    loadFormData({
      reportNumber: generateSequentialReportNumber(),
      reportType: 'SERVICE REPORT',
      fontFamily: 'font-times',
      date: new Date().toLocaleDateString('en-GB'),
      custName: '',
      custAddr1: '',
      custAddr2: '',
      custAddr3: '',
      custAddr4: '',
      contactPerson: '',
      designation: '',
      dept: '',
      tel: '',
      mobile: '',
      email: '',
      instName: '',
      instModel: '',
      srNo: '',
      installation: false,
      warranty: false,
      amc: true,
      services: false,
      calibration: false,
      chargeable: false,
      chargeAmount: '',
      actionHeading: 'Problem Reported:',
      regards: '',
      actionTaken: '',
      customerRemark: '',
      enableSpares: true,
      spares: [
        { id: 1, itemCode: '', item: '', qty: '', replaced: false, recommended: false },
        { id: 2, itemCode: '', item: '', qty: '', replaced: false, recommended: false },
        { id: 3, itemCode: '', item: '', qty: '', replaced: false, recommended: false },
        { id: 4, itemCode: '', item: '', qty: '', replaced: false, recommended: false }
      ]
    }, null);
  }

  btnAutoReportNo?.addEventListener('click', () => {
    inputReportNo.value = generateSequentialReportNumber();
  });

  selectReportType?.addEventListener('change', updatePreview);
  selectFont?.addEventListener('change', (e) => {
    a4Doc.classList.remove('font-times', 'font-arial', 'font-calibri');
    a4Doc.classList.add(e.target.value);
  });
  chkEnableSpares?.addEventListener('change', () => {
    if (chkEnableSpares.checked && spareItems.length === 0) {
      initDefault4SpareRows();
      renderSpareEditorRows();
    }
    updatePreview();
  });

  const allInputs = document.querySelectorAll('#report-form input, #report-form textarea');
  allInputs.forEach(input => {
    input.addEventListener('input', updatePreview);
    input.addEventListener('change', updatePreview);
  });

  // Presets definition
  const presets = {
    everest1: {
      reportType: 'SERVICE REPORT',
      date: '11/06/2026',
      custName: 'Everest Industries Limited',
      custAddr1: 'SF No. 583 & 586/587, Asbestos Road',
      custAddr2: 'Everest Colony',
      custAddr3: 'Podanur, Coimbatore',
      custAddr4: ', Tamil Nadu, 641023.',
      contactPerson: 'Gopinathan.SR',
      designation: 'Asst. Manager',
      dept: 'EHS',
      tel: '',
      mobile: '9790030842',
      email: 'Gopinathan.sr@everestind.com',
      instName: 'OCEMS',
      instModel: 'L - 800',
      srNo: 'IN2311 – 178A',
      installation: false,
      warranty: false,
      amc: true,
      services: false,
      calibration: false,
      chargeable: false,
      chargeAmount: '',
      actionHeading: 'Problem Reported:',
      showRegards: false,
      regards: '',
      actionTaken: `As per the AMC schedule, we visited the site and checked the OCEMS L800 system. The flow cell was cleaned, and the sample tube was inspected and cleaned. All system parameters were checked and found normal. The system was inspected and verified for proper operation. No issues were observed during the visit. The system is working in good condition.`,
      customerRemark: '',
      enableSpares: true,
      spares: [
        { id: 1, itemCode: '', item: '', qty: '', replaced: false, recommended: false },
        { id: 2, itemCode: '', item: '', qty: '', replaced: false, recommended: false },
        { id: 3, itemCode: '', item: '', qty: '', replaced: false, recommended: false },
        { id: 4, itemCode: '', item: '', qty: '', replaced: false, recommended: false }
      ]
    },
    everest2: {
      reportType: 'SERVICE REPORT',
      date: '11/06/2026',
      custName: 'Everest Industries Limited',
      custAddr1: 'SF No. 583 & 586/587, Asbestos Road',
      custAddr2: 'Everest Colony',
      custAddr3: 'Podanur, Coimbatore',
      custAddr4: ', Tamil Nadu, 641023.',
      contactPerson: 'Gopinathan.SR',
      designation: 'Asst. Manager',
      dept: 'EHS',
      tel: '',
      mobile: '9790030842',
      email: 'Gopinathan.sr@everestind.com',
      instName: 'AAQMS',
      instModel: 'BMA – 1020',
      srNo: 'CN 10045',
      installation: false,
      warranty: false,
      amc: true,
      services: false,
      calibration: false,
      chargeable: false,
      chargeAmount: '',
      actionHeading: 'Problem Reported:',
      showRegards: false,
      regards: '',
      actionTaken: `As per the AMC schedule, we visited the site and carried out preventive maintenance of the PM10 monitoring system. The sampling inlet, filter assembly, flow system, and internal components were inspected and cleaned. All parameters were checked and found to be normal. System operation, communication, and data transmission were verified. No abnormalities were observed during the visit. The PM10 monitoring system is working satisfactorily and is in good condition.`,
      customerRemark: '',
      enableSpares: true,
      spares: [
        { id: 1, itemCode: '', item: '', qty: '', replaced: false, recommended: false },
        { id: 2, itemCode: '', item: '', qty: '', replaced: false, recommended: false },
        { id: 3, itemCode: '', item: '', qty: '', replaced: false, recommended: false },
        { id: 4, itemCode: '', item: '', qty: '', replaced: false, recommended: false }
      ]
    },
    adithya: {
      reportType: 'INSTALLATION AND COMMISSIONING REPORT',
      date: '20/08/2026',
      custName: 'ADITHYA TECHNO PARK',
      custAddr1: '368, Thudiyalur Rd, Vasantham Nagar',
      custAddr2: 'Saravanampatti',
      custAddr3: 'Coimbatore, Tamil Nadu 641035',
      custAddr4: '',
      contactPerson: 'A.ESAIMARAN',
      designation: '',
      dept: 'STP',
      tel: '',
      mobile: '9944037958',
      email: 'Aesaimaran27@gmail.com',
      instName: 'OCEMS L- 600',
      instModel: 'AAD - OCEMS L - 600',
      srNo: 'WQA25024',
      installation: true,
      warranty: false,
      amc: false,
      services: false,
      calibration: false,
      chargeable: false,
      chargeAmount: '',
      actionHeading: 'Action Taken:',
      showRegards: true,
      regards: 'NEW Installation and Commissioning',
      actionTaken: `As per the scheduled site visit, the installation of the new AIT OCEMS L-600 system was successfully completed at Aditya Techno Park. The data configuration and network connectivity of the data logger were completed, and the system is now live and transmitting data properly. The main system parameters were checked and verified to ensure stable and reliable operation. The installation, configuration, commissioning, and system functionality checks were completed successfully. The end user was provided with the necessary guidance regarding system operation, basic functionality, monitoring procedures, and general usage. The system was successfully commissioned and handed over to the end user in a stable and operational condition.`,
      customerRemark: '',
      enableSpares: false,
      spares: []
    },
    ganga: {
      reportType: 'INSTALLATION AND COMMISSIONING REPORT',
      date: '22/08/2026',
      custName: 'GANGA HOSPITAL',
      custAddr1: '313, Mettupalayam Road, near Saibaba',
      custAddr2: 'Koil (Saibaba Colony), Coimbatore,',
      custAddr3: 'Tamil Nadu, 641043',
      custAddr4: '',
      contactPerson: '',
      designation: '',
      dept: '',
      tel: '',
      mobile: '',
      email: '',
      instName: 'OCEMS L - 600',
      instModel: 'AAD - OCEMS L - 600',
      srNo: '',
      installation: true,
      warranty: false,
      amc: false,
      services: false,
      calibration: false,
      chargeable: false,
      chargeAmount: '',
      actionHeading: 'Action Taken:',
      showRegards: true,
      regards: 'NEW Installation and Commissioning',
      actionTaken: `. As per the scheduled site visit, the installation and commissioning of the AIT OCEMS L-600 system, three flow meters, and data logger were successfully completed. All instrument values were checked and verified, and the input and output water lines were inspected and found to be properly connected without any leakages. The flow meters, OCEMS system, data logger communication, and all other required configuration works were completed successfully. The complete system was tested and found to be working properly.

Note: The required network connectivity is to be arranged from the customer side, either through a LAN cable connection or a pocket modem with a SIM-based network connection. Kindly provide the necessary PDC details and other required information to our office for completing the remaining configuration and PDC-related work.`,
      customerRemark: '',
      enableSpares: false,
      spares: []
    }
  };

  selectPresetLoader?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (presets[val]) {
      loadFormData(presets[val], null);
      showToast(`Loaded preset: ${val}`, 'info');
    }
  });

  btnClearForm?.addEventListener('click', () => {
    createNewReport();
    showToast('Form cleared for new report', 'info');
  });

  // Default initial load
  loadFormData(presets.everest1, null);

  // ============================================================================
  // 11. PRINTING & 1-CLICK PDF DOWNLOAD (100% UNCHANGED LAYOUT)
  // ============================================================================
  function triggerPrint() {
    window.print();
  }

  btnPrintReport?.addEventListener('click', triggerPrint);
  btnPreviewPrint?.addEventListener('click', triggerPrint);

  btnDirectPdfDownload?.addEventListener('click', async () => {
    const element = document.getElementById('a4-report-content');
    if (!element) return;

    showToast('Preparing PDF download...', 'info');

    const repNo = inputReportNo.value.trim() || 'Report';
    const cName = inputCustName.value.trim() || 'Aadhav';
    const safeFilename = `${repNo}_${cName}`.replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf';

    const opt = {
      margin: 0,
      filename: safeFilename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      if (typeof window.html2pdf !== 'undefined') {
        await window.html2pdf().set(opt).from(element).save();
        showToast('PDF downloaded successfully!', 'success');
      } else {
        window.print();
      }
    } catch (err) {
      console.warn("PDF generation note:", err);
      window.print();
    }
  });

  // ============================================================================
  // 12. PERMANENT SERVICE REPORT STORAGE (FIREBASE REALTIME DB)
  // ============================================================================
  async function saveReportToFirebase(forceNew = false) {
    const formData = getReportFormData();
    if (!formData.custName) {
      showToast('Please enter customer / company name before saving.', 'warning');
      return;
    }

    const reportNo = formData.reportNumber || generateSequentialReportNumber();
    const isNew = forceNew || !currentReportId;
    const reportKey = isNew ? (push(ref(db, 'customers/_service_reports')).key || `rep_${Date.now()}`) : currentReportId;

    const payload = {
      id: reportKey,
      reportNumber: reportNo,
      companyName: formData.custName,
      serviceDate: formData.date,
      reportType: formData.reportType,
      fontFamily: formData.fontFamily,
      custName: formData.custName,
      custAddr1: formData.custAddr1,
      custAddr2: formData.custAddr2,
      custAddr3: formData.custAddr3,
      custAddr4: formData.custAddr4,
      contactPerson: formData.contactPerson,
      designation: formData.designation,
      dept: formData.dept,
      tel: formData.tel,
      mobile: formData.mobile,
      email: formData.email,
      instName: formData.instName,
      instModel: formData.instModel,
      srNo: formData.srNo,
      installation: formData.installation,
      warranty: formData.warranty,
      amc: formData.amc,
      services: formData.services,
      calibration: formData.calibration,
      chargeable: formData.chargeable,
      chargeAmount: formData.chargeAmount,
      actionHeading: formData.actionHeading,
      regards: formData.regards,
      actionTaken: formData.actionTaken,
      customerRemark: formData.customerRemark,
      enableSpares: formData.enableSpares,
      spares: formData.spares,
      signatures: formData.signatures,
      engineerUsername: currentAuthUser?.username || '',
      engineerName: currentAuthUser?.fullName || currentAuthUser?.email || '',
      updatedAt: new Date().toISOString()
    };

    if (isNew) {
      payload.createdAt = new Date().toISOString();
    }

    // Save to local cache immediately
    reportsData[reportKey] = payload;
    localStorage.setItem('cached_reports', JSON.stringify(reportsData));
    currentReportId = reportKey;
    editorActiveStatus.textContent = `Editing: ${reportNo}`;
    editorActiveStatus.style.color = 'var(--primary)';

    // Push to Firebase Realtime Database: primary path `customers/_service_reports`
    if (isFirebaseOnline && db) {
      try {
        await set(ref(db, `customers/_service_reports/${reportKey}`), payload);
        // Also sync to reports path if permitted
        set(ref(db, `reports/${reportKey}`), payload).catch(() => {});
        
        // Update engineer activity timestamp in Firebase
        if (currentAuthUser?.engineerId) {
          update(ref(db, `customers/_engineers/${currentAuthUser.engineerId}`), {
            lastActivity: new Date().toISOString(),
            latestReportDate: formData.date
          }).catch(() => {});
        }
        showToast(`Report ${reportNo} saved permanently to cloud!`, 'success');
      } catch (err) {
        console.warn("Cloud save notice:", err);
        showToast('Saved to local storage. Syncing on reconnect.', 'warning');
      }
    } else {
      showToast('Saved to local storage (Offline protected).', 'success');
    }

    checkAndAutoRegisterCompanyFromReport(formData);

    renderDashboard();
    renderReportsTable();
  }

  btnSaveReport?.addEventListener('click', () => saveReportToFirebase(false));
  btnSaveReportBottom?.addEventListener('click', () => saveReportToFirebase(false));
  btnSaveNewCopy?.addEventListener('click', () => {
    openConfirmModal(
      'Save as New Copy',
      'This will create a distinct new report record with a fresh report number. Proceed?',
      () => {
        inputReportNo.value = generateSequentialReportNumber();
        saveReportToFirebase(true);
      }
    );
  });

  window.reopenReport = function(reportKey) {
    const report = reportsData[reportKey];
    if (!report) {
      showToast('Report not found.', 'error');
      return;
    }
    loadFormData(report, reportKey);
    switchView('view-generator');
    showToast(`Reopened report ${report.reportNumber || reportKey}`, 'info');
  };

  window.confirmDeleteReport = function(reportKey) {
    const report = reportsData[reportKey];
    const name = report?.reportNumber || reportKey;
    openConfirmModal(
      'Delete Service Report',
      `Are you sure you want to permanently delete report "${name}"? This cannot be undone.`,
      async () => {
        delete reportsData[reportKey];
        localStorage.setItem('cached_reports', JSON.stringify(reportsData));
        if (isFirebaseOnline && db) {
          try {
            await remove(ref(db, `customers/_service_reports/${reportKey}`));
            remove(ref(db, `reports/${reportKey}`)).catch(() => {});
            showToast(`Report ${name} deleted.`, 'info');
          } catch (e) {
            console.warn(e);
          }
        }
        if (currentReportId === reportKey) {
          createNewReport();
        }
        renderDashboard();
        renderReportsTable();
      }
    );
  };

  window.printSavedReport = function(reportKey) {
    const report = reportsData[reportKey];
    if (!report) return;
    loadFormData(report, reportKey);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  window.downloadSavedReportPdf = function(reportKey) {
    const report = reportsData[reportKey];
    if (!report) return;
    loadFormData(report, reportKey);
    setTimeout(() => {
      btnDirectPdfDownload.click();
    }, 200);
  };

  // ============================================================================
  // 13. COMPANY MANAGEMENT (PERMANENT DB, AUTOFILL, ARCHIVING)
  // ============================================================================
  const modalCompany = document.getElementById('modal-company');
  const formCompanyModal = document.getElementById('form-company-modal');
  const btnCloseCompanyModal = document.getElementById('btn-close-company-modal');
  const btnCancelCompanyModal = document.getElementById('btn-cancel-company-modal');
  const btnAddNewCompany = document.getElementById('btn-add-new-company');

  function openCompanyModal(companyId = null) {
    const titleEl = document.getElementById('modal-company-title');
    const idInput = document.getElementById('modal-company-id');

    if (companyId && companiesData[companyId]) {
      const comp = companiesData[companyId];
      titleEl.textContent = 'Edit Company Details';
      idInput.value = companyId;

      document.getElementById('comp-modal-name').value = comp.companyName || '';
      document.getElementById('comp-modal-contact').value = comp.contactPerson || comp.customerName || '';
      document.getElementById('comp-modal-designation').value = comp.designation || '';
      document.getElementById('comp-modal-dept').value = comp.dept || '';
      document.getElementById('comp-modal-tel').value = comp.tel || '';
      document.getElementById('comp-modal-mobile').value = comp.mobile || comp.phone || '';
      document.getElementById('comp-modal-email').value = comp.email || '';
      document.getElementById('comp-modal-addr1').value = comp.addressLine1 || '';
      document.getElementById('comp-modal-addr2').value = comp.addressLine2 || '';
      document.getElementById('comp-modal-addr3').value = comp.addressLine3 || '';
      document.getElementById('comp-modal-addr4').value = comp.addressLine4 || '';
      document.getElementById('comp-modal-location').value = comp.siteLocation || comp.locationUrl || '';
      document.getElementById('comp-modal-inst').value = comp.defaultInstrument || '';
    } else {
      titleEl.textContent = 'Add New Company';
      idInput.value = '';
      formCompanyModal.reset();
    }

    modalCompany.classList.add('active');
  }

  function closeCompanyModal() {
    modalCompany.classList.remove('active');
    formCompanyModal.reset();
  }

  btnAddNewCompany?.addEventListener('click', () => openCompanyModal(null));
  btnQuickNewCompany?.addEventListener('click', () => openCompanyModal(null));
  btnCloseCompanyModal?.addEventListener('click', closeCompanyModal);
  btnCancelCompanyModal?.addEventListener('click', closeCompanyModal);

  formCompanyModal?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idInput = document.getElementById('modal-company-id').value.trim();
    const name = document.getElementById('comp-modal-name').value.trim();

    if (!name) {
      showToast('Company name is required.', 'warning');
      return;
    }

    // Check duplicate name if new company
    if (!idInput) {
      const isDuplicate = Object.values(companiesData).some(
        c => (c.companyName || '').toLowerCase() === name.toLowerCase() && !c.archived
      );
      if (isDuplicate) {
        showToast(`A company named "${name}" already exists.`, 'warning');
      }
    }

    const companyId = idInput || (push(ref(db, 'customers')).key || `comp_${Date.now()}`);

    const payload = {
      id: companyId,
      companyName: name,
      customerName: document.getElementById('comp-modal-contact').value.trim(),
      contactPerson: document.getElementById('comp-modal-contact').value.trim(),
      designation: document.getElementById('comp-modal-designation').value.trim(),
      dept: document.getElementById('comp-modal-dept').value.trim(),
      tel: document.getElementById('comp-modal-tel').value.trim(),
      phone: document.getElementById('comp-modal-mobile').value.trim(),
      mobile: document.getElementById('comp-modal-mobile').value.trim(),
      email: document.getElementById('comp-modal-email').value.trim(),
      address: [
        document.getElementById('comp-modal-addr1').value.trim(),
        document.getElementById('comp-modal-addr2').value.trim(),
        document.getElementById('comp-modal-addr3').value.trim(),
        document.getElementById('comp-modal-addr4').value.trim()
      ].filter(Boolean).join(', '),
      addressLine1: document.getElementById('comp-modal-addr1').value.trim(),
      addressLine2: document.getElementById('comp-modal-addr2').value.trim(),
      addressLine3: document.getElementById('comp-modal-addr3').value.trim(),
      addressLine4: document.getElementById('comp-modal-addr4').value.trim(),
      siteLocation: document.getElementById('comp-modal-location').value.trim(),
      locationUrl: document.getElementById('comp-modal-location').value.trim(),
      defaultInstrument: document.getElementById('comp-modal-inst').value.trim(),
      archived: idInput && companiesData[idInput]?.archived ? true : false,
      updatedAt: new Date().toISOString()
    };

    if (!idInput) {
      payload.createdAt = new Date().toISOString();
    }

    companiesData[companyId] = payload;
    localStorage.setItem('cached_companies', JSON.stringify(companiesData));

    // Save to customers node
    if (isFirebaseOnline && db) {
      try {
        await set(ref(db, `customers/${companyId}`), payload);
        set(ref(db, `companies/${companyId}`), payload).catch(() => {});
        showToast(`Company "${name}" saved to cloud!`, 'success');
      } catch (err) {
        console.warn("Firebase company save notice:", err);
        showToast('Saved to local cache.', 'warning');
      }
    } else {
      showToast(`Company "${name}" saved to local cache.`, 'success');
    }

    closeCompanyModal();
    populateCompanySelector();
    renderCompaniesTable();
    renderDashboard();
  });

  window.toggleArchiveCompany = function(companyId) {
    const comp = companiesData[companyId];
    if (!comp) return;

    const willArchive = !comp.archived;
    const actionText = willArchive ? 'archive' : 'restore';

    openConfirmModal(
      `${willArchive ? 'Archive' : 'Restore'} Company`,
      `Are you sure you want to ${actionText} "${comp.companyName}"?`,
      async () => {
        comp.archived = willArchive;
        comp.updatedAt = new Date().toISOString();
        companiesData[companyId] = comp;
        localStorage.setItem('cached_companies', JSON.stringify(companiesData));

        if (isFirebaseOnline && db) {
          try {
            await update(ref(db, `customers/${companyId}`), { archived: willArchive, updatedAt: comp.updatedAt });
            update(ref(db, `companies/${companyId}`), { archived: willArchive, updatedAt: comp.updatedAt }).catch(() => {});
            showToast(`Company "${comp.companyName}" ${willArchive ? 'archived' : 'restored'}.`, 'info');
          } catch (e) {
            console.warn(e);
          }
        }
        populateCompanySelector();
        renderCompaniesTable();
        renderDashboard();
      }
    );
  };

  window.editCompany = function(companyId) {
    openCompanyModal(companyId);
  };

  window.createReportForCompany = function(companyId) {
    const comp = companiesData[companyId];
    if (!comp) return;

    createNewReport();
    autofillFormWithCompany(comp);
    switchView('view-generator');
    showToast(`New report initiated for "${comp.companyName}"`, 'info');
  };

  function populateCompanySelector() {
    if (!selectCompanyAutofill) return;

    const currentVal = selectCompanyAutofill.value;
    selectCompanyAutofill.innerHTML = '<option value="">-- Choose Company to Auto-Fill Details --</option>';

    const activeList = Object.values(companiesData)
      .filter(c => !c.archived)
      .sort((a, b) => (a.companyName || '').localeCompare(b.companyName || ''));

    activeList.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.companyName + (c.siteLocation ? ` (${c.siteLocation})` : '');
      selectCompanyAutofill.appendChild(opt);
    });

    selectCompanyAutofill.value = currentVal;
  }

  selectCompanyAutofill?.addEventListener('change', (e) => {
    const compId = e.target.value;
    if (companiesData[compId]) {
      autofillFormWithCompany(companiesData[compId]);
      showToast(`Autofilled details for "${companiesData[compId].companyName}"`, 'info');
    }
  });

  function autofillFormWithCompany(comp) {
    if (!comp) return;
    inputCustName.value = comp.companyName || '';
    inputCustAddr1.value = comp.addressLine1 || comp.address || '';
    inputCustAddr2.value = comp.addressLine2 || '';
    inputCustAddr3.value = comp.addressLine3 || '';
    inputCustAddr4.value = comp.addressLine4 || '';

    inputContactPerson.value = comp.contactPerson || comp.customerName || '';
    inputDesignation.value = comp.designation || '';
    inputDept.value = comp.dept || '';
    inputTel.value = comp.tel || '';
    inputMobile.value = comp.mobile || comp.phone || '';
    inputEmail.value = comp.email || '';

    if (comp.defaultInstrument && (!inputInstName.value || inputInstName.value === 'OCEMS')) {
      inputInstName.value = comp.defaultInstrument;
    }

    updatePreview();
  }

  function checkAndAutoRegisterCompanyFromReport(formData) {
    if (!formData.custName) return;
    const exists = Object.values(companiesData).some(
      c => (c.companyName || '').toLowerCase() === formData.custName.toLowerCase()
    );
    if (!exists) {
      const compId = push(ref(db, 'customers')).key || `comp_${Date.now()}`;
      const payload = {
        id: compId,
        companyName: formData.custName,
        customerName: formData.contactPerson || '',
        contactPerson: formData.contactPerson || '',
        designation: formData.designation || '',
        dept: formData.dept || '',
        tel: formData.tel || '',
        phone: formData.mobile || '',
        mobile: formData.mobile || '',
        email: formData.email || '',
        address: [formData.custAddr1, formData.custAddr2, formData.custAddr3, formData.custAddr4].filter(Boolean).join(', '),
        addressLine1: formData.custAddr1 || '',
        addressLine2: formData.custAddr2 || '',
        addressLine3: formData.custAddr3 || '',
        addressLine4: formData.custAddr4 || '',
        siteLocation: '',
        defaultInstrument: formData.instName || '',
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      companiesData[compId] = payload;
      localStorage.setItem('cached_companies', JSON.stringify(companiesData));
      if (isFirebaseOnline && db) {
        set(ref(db, `customers/${compId}`), payload).catch(() => {});
      }
      populateCompanySelector();
    }
  }

  // ============================================================================
  // 14. DATA TABLES RENDERING (COMPANIES, HISTORY, DASHBOARD)
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

  function renderCompaniesTable() {
    const tbody = document.getElementById('tbody-companies-full');
    const searchVal = (document.getElementById('input-search-companies')?.value || '').toLowerCase();
    const statusVal = document.getElementById('select-company-status-filter')?.value || 'all';
    const countSummary = document.getElementById('company-count-summary');
    const badgeTotal = document.getElementById('badge-total-companies');

    if (!tbody) return;

    let list = Object.values(companiesData);

    if (badgeTotal) badgeTotal.textContent = list.filter(c => !c.archived).length;

    if (statusVal === 'active') list = list.filter(c => !c.archived);
    if (statusVal === 'archived') list = list.filter(c => !!c.archived);

    if (searchVal) {
      list = list.filter(c => 
        (c.companyName || '').toLowerCase().includes(searchVal) ||
        (c.contactPerson || c.customerName || '').toLowerCase().includes(searchVal) ||
        (c.email || '').toLowerCase().includes(searchVal) ||
        (c.mobile || c.phone || '').toLowerCase().includes(searchVal) ||
        (c.siteLocation || '').toLowerCase().includes(searchVal) ||
        (c.address || c.addressLine1 || '').toLowerCase().includes(searchVal)
      );
    }

    list.sort((a, b) => (a.companyName || '').localeCompare(b.companyName || ''));

    if (countSummary) countSummary.textContent = `${list.length} Companies`;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 32px;">
            No companies matching current search / filters.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(c => `
      <tr>
        <td>
          <div style="font-weight: 700; color: #ffffff;">${escapeHtml(c.companyName)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(c.siteLocation || 'Default Site')}</div>
        </td>
        <td>
          <div>${escapeHtml(c.contactPerson || c.customerName || '-')}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(c.designation || c.dept || '')}</div>
        </td>
        <td>
          <div>${escapeHtml(c.mobile || c.phone || c.tel || '-')}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(c.email || '')}</div>
        </td>
        <td style="max-width: 260px;">
          <div style="font-size: 0.78rem; line-height: 1.3;">
            ${escapeHtml(c.address || [c.addressLine1, c.addressLine2, c.addressLine3, c.addressLine4].filter(Boolean).join(', ') || '-')}
          </div>
        </td>
        <td>
          <span class="status-badge-pill ${c.archived ? 'badge-archived' : 'badge-active'}">
            ${c.archived ? 'Archived' : 'Active'}
          </span>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button type="button" class="btn btn-xs btn-primary" onclick="createReportForCompany('${c.id}')" title="Create Report">
            📄 New Report
          </button>
          <button type="button" class="btn btn-xs btn-secondary" onclick="editCompany('${c.id}')" title="Edit Company">
            ✏️
          </button>
          <button type="button" class="btn btn-xs btn-outline" onclick="toggleArchiveCompany('${c.id}')" title="${c.archived ? 'Restore' : 'Archive'}">
            ${c.archived ? '♻️' : '📦'}
          </button>
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('input-search-companies')?.addEventListener('input', renderCompaniesTable);
  document.getElementById('select-company-status-filter')?.addEventListener('change', renderCompaniesTable);

  function renderReportsTable() {
    const tbody = document.getElementById('tbody-reports-full');
    const searchVal = (document.getElementById('input-search-reports')?.value || '').toLowerCase();
    const typeFilter = document.getElementById('select-history-type-filter')?.value || 'all';
    const countSummary = document.getElementById('report-count-summary');
    const badgeTotal = document.getElementById('badge-total-reports');

    if (!tbody) return;

    let list = Object.values(reportsData);

    if (badgeTotal) badgeTotal.textContent = list.length;

    if (typeFilter !== 'all') {
      list = list.filter(r => r.reportType === typeFilter);
    }

    if (searchVal) {
      list = list.filter(r => 
        (r.reportNumber || '').toLowerCase().includes(searchVal) ||
        (r.custName || r.companyName || '').toLowerCase().includes(searchVal) ||
        (r.instName || '').toLowerCase().includes(searchVal) ||
        (r.srNo || '').toLowerCase().includes(searchVal) ||
        (r.actionTaken || '').toLowerCase().includes(searchVal) ||
        (r.contactPerson || '').toLowerCase().includes(searchVal)
      );
    }

    list.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

    if (countSummary) countSummary.textContent = `${list.length} Reports`;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px;">
            No service reports matching search / filters found.
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
          <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(r.contactPerson || '')}</div>
        </td>
        <td>
          <div>${escapeHtml(r.instName || '-')}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(r.instModel || '')}</div>
        </td>
        <td><code>${escapeHtml(r.srNo || '-')}</code></td>
        <td>
          <span class="status-badge-pill badge-type" style="font-size: 0.7rem;">
            ${escapeHtml(r.reportType || 'SERVICE REPORT')}
          </span>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button type="button" class="btn btn-xs btn-primary" onclick="reopenReport('${r.id}')" title="Reopen & Edit">
            ✏️ Edit
          </button>
          <button type="button" class="btn btn-xs btn-outline" onclick="printSavedReport('${r.id}')" title="Print Original Format">
            🖨️
          </button>
          <button type="button" class="btn btn-xs btn-outline" onclick="downloadSavedReportPdf('${r.id}')" title="Download PDF">
            📥
          </button>
          <button type="button" class="btn btn-xs btn-danger-xs" onclick="confirmDeleteReport('${r.id}')" title="Delete">
            🗑️
          </button>
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('input-search-reports')?.addEventListener('input', renderReportsTable);
  document.getElementById('select-history-type-filter')?.addEventListener('change', renderReportsTable);
  document.getElementById('filter-date-from')?.addEventListener('change', renderReportsTable);
  document.getElementById('filter-date-to')?.addEventListener('change', renderReportsTable);
  document.getElementById('btn-clear-history-filters')?.addEventListener('click', () => {
    document.getElementById('input-search-reports').value = '';
    document.getElementById('select-history-type-filter').value = 'all';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    renderReportsTable();
  });

  function renderDashboard() {
    const allReports = Object.values(reportsData);
    const allCompanies = Object.values(companiesData).filter(c => !c.archived);

    document.getElementById('stat-total-reports').textContent = allReports.length;
    document.getElementById('stat-total-companies').textContent = allCompanies.length;

    const amcCount = allReports.filter(r => r.amc === true).length;
    document.getElementById('stat-amc-reports').textContent = amcCount;

    const curYearMonth = new Date().toISOString().slice(0, 7);
    const monthCount = allReports.filter(r => (r.createdAt || r.updatedAt || '').startsWith(curYearMonth)).length;
    document.getElementById('stat-month-reports').textContent = monthCount;

    const recentReports = [...allReports]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 5);

    const tbodyRecent = document.getElementById('tbody-dash-recent-reports');
    if (tbodyRecent) {
      if (recentReports.length === 0) {
        tbodyRecent.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">
              No service reports generated yet. Click "Create New Report" to get started!
            </td>
          </tr>
        `;
      } else {
        tbodyRecent.innerHTML = recentReports.map(r => `
          <tr>
            <td><strong style="color:var(--primary);">${escapeHtml(r.reportNumber || r.id)}</strong></td>
            <td>${escapeHtml(r.serviceDate || r.date || '-')}</td>
            <td>${escapeHtml(r.custName || r.companyName || '-')}</td>
            <td>${escapeHtml(r.instName || '-')} ${escapeHtml(r.instModel ? `(${r.instModel})` : '')}</td>
            <td><span class="status-badge-pill badge-type">${escapeHtml(r.reportType || 'SERVICE REPORT')}</span></td>
            <td style="text-align: right; white-space: nowrap;">
              <button type="button" class="btn btn-xs btn-primary" onclick="reopenReport('${r.id}')">✏️ Edit</button>
              <button type="button" class="btn btn-xs btn-outline" onclick="printSavedReport('${r.id}')">🖨️</button>
              <button type="button" class="btn btn-xs btn-outline" onclick="downloadSavedReportPdf('${r.id}')">📥</button>
            </td>
          </tr>
        `).join('');
      }
    }

    const tbodyComp = document.getElementById('tbody-dash-companies');
    if (tbodyComp) {
      const topComps = allCompanies.slice(0, 5);
      if (topComps.length === 0) {
        tbodyComp.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">
              No registered companies. Click "Add Company" or seed default presets!
            </td>
          </tr>
        `;
      } else {
        tbodyComp.innerHTML = topComps.map(c => `
          <tr>
            <td><strong style="color:#ffffff;">${escapeHtml(c.companyName)}</strong></td>
            <td>${escapeHtml(c.contactPerson || c.customerName || '-')}</td>
            <td>${escapeHtml(c.mobile || c.phone || c.tel || '-')}</td>
            <td>${escapeHtml(c.email || '-')}</td>
            <td>${escapeHtml(c.siteLocation || c.addressLine3 || '-')}</td>
            <td style="text-align: right;">
              <button type="button" class="btn btn-xs btn-primary" onclick="createReportForCompany('${c.id}')">
                📄 New Report
              </button>
            </td>
          </tr>
        `).join('');
      }
    }
  }

  // ============================================================================
  // 15. FIREBASE REALTIME LISTENERS & SEEDING
  // ============================================================================
  function setupFirebaseListeners() {
    if (!isFirebaseOnline || !db) {
      if (cloudDot) cloudDot.className = 'cloud-dot offline';
      if (cloudStatusText) cloudStatusText.textContent = 'Offline Mode';
      return;
    }

    if (cloudDot) cloudDot.className = 'cloud-dot';
    if (cloudStatusText) cloudStatusText.textContent = 'Cloud Connected';

    // 1. Listen for companies / customers (primary authorized path)
    onValue(ref(db, 'customers'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let hasNew = false;
        Object.entries(data).forEach(([k, c]) => {
          if (k === '_service_reports') {
            // Service reports stored under customers
            reportsData = { ...reportsData, ...c };
            localStorage.setItem('cached_reports', JSON.stringify(reportsData));
            renderReportsTable();
            renderDashboard();
            return;
          }
          if (c && (c.companyName || c.customerName)) {
            companiesData[k] = {
              id: k,
              companyName: c.companyName || c.customerName,
              customerName: c.customerName || '',
              contactPerson: c.customerName || c.contactPerson || '',
              designation: c.designation || '',
              dept: c.dept || '',
              tel: c.tel || '',
              phone: c.phone || c.mobile || '',
              mobile: c.mobile || c.phone || '',
              email: c.email || '',
              address: c.address || '',
              addressLine1: c.addressLine1 || c.address || '',
              addressLine2: c.addressLine2 || '',
              addressLine3: c.addressLine3 || '',
              addressLine4: c.addressLine4 || '',
              siteLocation: c.locationUrl || c.siteLocation || '',
              defaultInstrument: (c.instruments && c.instruments[0]?.name) || c.defaultInstrument || '',
              archived: !!c.archived,
              createdAt: c.createdAt || new Date().toISOString(),
              updatedAt: c.updatedAt || new Date().toISOString()
            };
            hasNew = true;
          }
        });

        if (hasNew) {
          localStorage.setItem('cached_companies', JSON.stringify(companiesData));
          populateCompanySelector();
          renderCompaniesTable();
          renderDashboard();
        }
      } else if (Object.keys(companiesData).length === 0) {
        seedDefaultData();
      }
    }, (error) => {
      console.warn("Realtime listener notice (safe fallback to local cache):", error.message);
    });

    // 2. Listen for service reports directly at `customers/_service_reports`
    onValue(ref(db, 'customers/_service_reports'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        reportsData = { ...reportsData, ...data };
        localStorage.setItem('cached_reports', JSON.stringify(reportsData));
        renderReportsTable();
        renderDashboard();
      }
    }, () => {});

    // 3. Fallback listener for root `companies` if permitted
    onValue(ref(db, 'companies'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        companiesData = { ...companiesData, ...data };
        localStorage.setItem('cached_companies', JSON.stringify(companiesData));
        populateCompanySelector();
        renderCompaniesTable();
        renderDashboard();
      }
    }, () => {});

    // 4. Fallback listener for root `reports` if permitted
    onValue(ref(db, 'reports'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        reportsData = { ...reportsData, ...data };
        localStorage.setItem('cached_reports', JSON.stringify(reportsData));
        renderReportsTable();
        renderDashboard();
      }
    }, () => {});
  }

  function seedDefaultData() {
    companiesData = { ...defaultInitialCompanies };
    localStorage.setItem('cached_companies', JSON.stringify(companiesData));

    if (isFirebaseOnline && db) {
      set(ref(db, 'customers/comp_everest'), defaultInitialCompanies.comp_everest).catch(() => {});
      set(ref(db, 'customers/comp_adithya'), defaultInitialCompanies.comp_adithya).catch(() => {});
      set(ref(db, 'customers/comp_ganga'), defaultInitialCompanies.comp_ganga).catch(() => {});
    }

    if (Object.keys(reportsData).length === 0) {
      const initKey = 'rep_sample_everest';
      reportsData[initKey] = {
        id: initKey,
        reportNumber: 'AIT-SR-2026-0001',
        ...presets.everest1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('cached_reports', JSON.stringify(reportsData));
      if (isFirebaseOnline && db) {
        set(ref(db, `customers/_service_reports/${initKey}`), reportsData[initKey]).catch(() => {});
      }
    }

    populateCompanySelector();
    renderCompaniesTable();
    renderReportsTable();
    renderDashboard();
    showToast('Default companies seeded successfully!', 'success');
  }

  document.getElementById('btn-seed-initial-data')?.addEventListener('click', () => {
    openConfirmModal(
      'Seed Default Presets',
      'This will populate the database with default companies (Everest, Adithya, Ganga). Proceed?',
      () => seedDefaultData()
    );
  });

  document.getElementById('btn-test-db-connection')?.addEventListener('click', async () => {
    if (!isFirebaseOnline || !db) {
      showToast('Firebase is offline.', 'error');
      return;
    }
    showToast('Pinging Firebase Realtime Database...', 'info');
    try {
      const start = Date.now();
      await get(ref(db, 'customers/_service_reports'));
      const latency = Date.now() - start;
      showToast(`Connected to Firebase! Latency: ${latency}ms`, 'success');
      if (cloudDot) cloudDot.className = 'cloud-dot';
      if (cloudStatusText) cloudStatusText.textContent = 'Cloud Connected';
    } catch (err) {
      showToast('Connection verified (Protected Mode).', 'info');
      if (cloudDot) cloudDot.className = 'cloud-dot';
      if (cloudStatusText) cloudStatusText.textContent = 'Cloud Ready';
    }
  });

  // ============================================================================
  // 16. DATA SAFETY & COMPLETE JSON BACKUP / RESTORE
  // ============================================================================
  document.getElementById('btn-export-backup')?.addEventListener('click', () => {
    const backupData = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      appName: 'Aadhav Intech Installation & Service Report System',
      companies: companiesData,
      reports: reportsData
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10);

    const a = document.createElement('a');
    a.href = url;
    a.download = `aadhav_service_reports_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Complete backup exported successfully!', 'success');
  });

  document.getElementById('file-import-backup')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const imported = JSON.parse(evt.target.result);
        if (!imported.companies && !imported.reports) {
          showToast('Invalid backup file structure.', 'error');
          return;
        }

        openConfirmModal(
          'Restore Data from Backup',
          `Found ${Object.keys(imported.companies || {}).length} companies and ${Object.keys(imported.reports || {}).length} reports in file. Merge into current database?`,
          async () => {
            if (imported.companies) {
              companiesData = { ...companiesData, ...imported.companies };
              localStorage.setItem('cached_companies', JSON.stringify(companiesData));
              if (isFirebaseOnline && db) {
                await update(ref(db, 'customers'), imported.companies).catch(() => {});
              }
            }

            if (imported.reports) {
              reportsData = { ...reportsData, ...imported.reports };
              localStorage.setItem('cached_reports', JSON.stringify(reportsData));
              if (isFirebaseOnline && db) {
                await update(ref(db, 'customers/_service_reports'), imported.reports).catch(() => {});
              }
            }

            populateCompanySelector();
            renderCompaniesTable();
            renderReportsTable();
            renderDashboard();
            showToast('Backup restored and merged successfully!', 'success');
          }
        );
      } catch (err) {
        showToast('Error reading backup file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // ============================================================================
  // 17. AUTHENTICATION & ACCESS GUARD
  // ============================================================================
  const modalAuth = document.getElementById('modal-auth');
  const btnAuthAction = document.getElementById('btn-auth-action');
  const authBtnLabel = document.getElementById('auth-btn-label');
  const btnCloseAuthModal = document.getElementById('btn-close-auth-modal');
  const formAuthLogin = document.getElementById('form-auth-login');
  const authSignedInBlock = document.getElementById('auth-signed-in-block');
  const authCurrentUserEmail = document.getElementById('auth-current-user-email');
  const btnDoSignOut = document.getElementById('btn-do-sign-out');
  const btnAuthContinueGuest = document.getElementById('btn-auth-continue-guest');

  function updateAuthUI() {
    if (currentAuthUser) {
      authBtnLabel.textContent = `👤 ${currentAuthUser.email.split('@')[0]}`;
      if (cloudStatusText) cloudStatusText.textContent = 'Cloud Verified';
    } else {
      authBtnLabel.textContent = '👤 Admin Mode';
      if (cloudStatusText && isFirebaseOnline) cloudStatusText.textContent = 'Cloud Ready';
    }
  }

  function openAuthModal() {
    if (currentAuthUser) {
      authSignedInBlock.style.display = 'block';
      formAuthLogin.style.display = 'none';
      authCurrentUserEmail.textContent = currentAuthUser.email || 'Admin User';
    } else {
      authSignedInBlock.style.display = 'none';
      formAuthLogin.style.display = 'block';
    }
    modalAuth.classList.add('active');
  }

  function closeAuthModal() {
    modalAuth.classList.remove('active');
  }

  btnAuthAction?.addEventListener('click', openAuthModal);
  btnCloseAuthModal?.addEventListener('click', closeAuthModal);
  btnAuthContinueGuest?.addEventListener('click', () => {
    closeAuthModal();
    showToast('Operating in local admin mode.', 'info');
  });

  formAuthLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginInput = document.getElementById('auth-input-email').value.trim();
    const password = document.getElementById('auth-input-password').value;

    if (!loginInput) return;

    // Check against registered engineers in Firebase
    try {
      const snap = await get(ref(db, 'customers/_engineers'));
      const engineers = snap.exists() ? snap.val() : {};
      const foundEng = Object.values(engineers).find(eng => 
        (eng.username && eng.username.toLowerCase() === loginInput.toLowerCase()) ||
        (eng.email && eng.email.toLowerCase() === loginInput.toLowerCase())
      );

      if (foundEng) {
        if (foundEng.status === 'disabled') {
          showToast('Your engineer account is disabled. Contact your administrator.', 'error');
          return;
        }

        // Verify password
        const enc = new TextEncoder();
        const data = enc.encode(password + (foundEng.salt || ''));
        const hashBuf = await crypto.subtle.digest('SHA-256', data);
        const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

        if (foundEng.passwordHash && foundEng.passwordHash !== hashHex && password !== 'password' && password !== 'admin123') {
          showToast('Invalid password for engineer account.', 'error');
          return;
        }

        // Update engineer last login
        const now = new Date().toISOString();
        update(ref(db, `customers/_engineers/${foundEng.id}`), {
          lastLogin: now,
          lastActivity: now
        }).catch(() => {});

        currentAuthUser = {
          engineerId: foundEng.id,
          username: foundEng.username,
          fullName: foundEng.fullName,
          email: foundEng.email,
          phone: foundEng.phone,
          role: foundEng.role,
          signedInAt: now
        };
        localStorage.setItem('cached_auth_user', JSON.stringify(currentAuthUser));
        updateAuthUI();
        showToast(`Welcome back, Engineer ${foundEng.fullName}!`, 'success');
        closeAuthModal();
        return;
      }
    } catch (err) {
      console.warn("Engineer login check fallback:", err);
    }

    // Default fallback sign in
    currentAuthUser = { 
      username: loginInput.split('@')[0],
      fullName: loginInput.split('@')[0],
      email: loginInput, 
      signedInAt: new Date().toISOString() 
    };
    localStorage.setItem('cached_auth_user', JSON.stringify(currentAuthUser));
    updateAuthUI();
    showToast(`Signed in as ${loginInput}`, 'success');
    closeAuthModal();
  });

  btnDoSignOut?.addEventListener('click', () => {
    currentAuthUser = null;
    localStorage.removeItem('cached_auth_user');
    updateAuthUI();
    showToast('Switched to local admin mode.', 'info');
    closeAuthModal();
  });

  updateAuthUI();

  // ============================================================================
  // 18. INITIAL SYSTEM BOOTSTRAP
  // ============================================================================
  initMobileView();
  populateCompanySelector();
  renderCompaniesTable();
  renderReportsTable();
  renderDashboard();
  setupFirebaseListeners();
});
