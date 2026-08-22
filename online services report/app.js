/**
 * Aadhav Intech - Installation & Service Report Generator
 * Full multi-preset support with default 4-row Spare Parts table matching EVEREST.pdf
 */

document.addEventListener('DOMContentLoaded', () => {
  // Mobile / Tablet Navigation Toggle
  const btnShowEditor = document.getElementById('btn-show-editor');
  const btnShowPreview = document.getElementById('btn-show-preview');
  const panelEditor = document.getElementById('panel-editor');
  const panelPreview = document.getElementById('panel-preview');
  const a4Scaler = document.getElementById('a4-scaler');

  function initMobileView() {
    if (window.innerWidth <= 992) {
      btnShowEditor.classList.add('active');
      btnShowPreview.classList.remove('active');
      panelEditor.classList.remove('mobile-hidden');
      panelPreview.classList.add('mobile-hidden');
    } else {
      panelEditor.classList.remove('mobile-hidden');
      panelPreview.classList.remove('mobile-hidden');
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
    if (!a4Scaler) return;
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

  // Form Inputs
  const selectReportType = document.getElementById('select-report-type');
  const selectFont = document.getElementById('select-font-family');
  const chkEnableSpares = document.getElementById('chk-enable-spares');

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

  // Preview Elements
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

  // Spare Parts Dynamic State - Default 4 Rows
  let spareItems = [];

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
          <input type="text" class="spare-code" placeholder="Code" value="${row.itemCode}">
          <input type="text" class="spare-name" placeholder="Item Description" value="${row.item}" style="flex:2;">
          <input type="text" class="spare-qty" placeholder="Qty" value="${row.qty}" style="width:50px;">
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

  if (btnAddSpare) {
    btnAddSpare.addEventListener('click', () => addSpareRow());
  }

  // Presets
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

  /**
   * Update Live Preview
   */
  function updatePreview() {
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

    // Regards Block
    if (selectReportType.value.includes('INSTALLATION') || (inputRegards.value && inputRegards.value.trim() !== '')) {
      viewRegardsBlock.style.display = 'block';
      groupRegards.style.display = 'block';
    } else {
      viewRegardsBlock.style.display = 'none';
      groupRegards.style.display = 'none';
    }
    viewRegards.textContent = inputRegards.value || '';

    viewActionHeading.textContent = inputActionHeading.value || 'Action Taken:';
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

  function renderSpareTablePreview() {
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

  function loadFormData(data) {
    selectReportType.value = data.reportType || 'SERVICE REPORT';
    inputDate.value = data.date || '';
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

    chkEnableSpares.checked = !!data.enableSpares;
    
    if (data.spares && data.spares.length > 0) {
      spareItems = [...data.spares];
    } else if (data.enableSpares) {
      initDefault4SpareRows();
    } else {
      spareItems = [];
    }

    renderSpareEditorRows();
    updatePreview();
  }

  // Event Listeners
  selectReportType.addEventListener('change', updatePreview);
  selectFont.addEventListener('change', (e) => {
    a4Doc.classList.remove('font-times', 'font-arial', 'font-calibri');
    a4Doc.classList.add(e.target.value);
  });
  chkEnableSpares.addEventListener('change', () => {
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

  // Default Load Everest 1
  loadFormData(presets.everest1);

  selectPresetLoader.addEventListener('change', (e) => {
    const val = e.target.value;
    if (presets[val]) {
      loadFormData(presets[val]);
    }
  });

  btnClearForm.addEventListener('click', () => {
    loadFormData({
      reportType: 'SERVICE REPORT',
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
      amc: false,
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
    });
  });

  btnPrintReport.addEventListener('click', () => window.print());

  // Signatures
  function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const parentBox = btn.closest('.signature-input-box');
        parentBox.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        parentBox.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
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

    document.getElementById(clearBtnId).addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      previewTargetEl.innerHTML = '';
    });
  }

  initSignatureCanvas('canvas-engineer', 'btn-clear-eng-canvas', viewEngSigImg);
  initSignatureCanvas('canvas-customer', 'btn-clear-cust-canvas', viewCustSigImg);

  function setupFileUpload(inputId, previewTargetEl) {
    const fileInput = document.getElementById(inputId);
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
});
