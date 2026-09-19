import { db, ref, get, remove, set } from './firebase.js';
import { showToast } from './utils.js';

let allInstruments = [];

document.addEventListener("DOMContentLoaded", async () => {
    await loadLibrary();
    
    document.getElementById('searchInput')?.addEventListener('input', function(e) {
        const term = e.target.value.toLowerCase().trim();
        if (!term) {
            renderTable(allInstruments);
            return;
        }
        const filtered = allInstruments.filter(inst => {
            const str = JSON.stringify(inst).toLowerCase();
            return str.includes(term);
        });
        renderTable(filtered);
    });
});

async function loadLibrary() {
    try {
        const snapshot = await get(ref(db, 'instruments'));
        if (snapshot.exists()) {
            allInstruments = Object.values(snapshot.val());
            allInstruments.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            renderTable(allInstruments);
        } else {
            allInstruments = [];
            renderTable([]);
        }
    } catch (e) {
        console.error("Error loading library:", e);
        const tbody = document.getElementById('libraryTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center text-danger py-4"><i class="fa-solid fa-triangle-exclamation me-2"></i>Failed to load database.</td></tr>';
        }
    }
}

function renderTable(data) {
    const tbody = document.getElementById('libraryTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-muted py-5">
                    <i class="fa-regular fa-folder-open fs-2 d-block mb-2 text-secondary"></i>
                    <div class="fw-semibold">No instruments found</div>
                    <div class="small">Add a new instrument to populate your library</div>
                </td>
            </tr>
        `;
        return;
    }

    data.forEach(inst => {
        const tr = document.createElement('tr');
        const imgHtml = inst.media?.image 
            ? `<img src="${inst.media.image}" class="table-thumbnail" alt="${inst.general?.name || 'Image'}">`
            : `<div class="table-thumbnail-placeholder"><i class="fa-solid fa-microchip"></i></div>`;
            
        const dateStr = inst.updated_at ? new Date(inst.updated_at).toLocaleDateString() : '-';

        tr.innerHTML = `
            <td>${imgHtml}</td>
            <td class="fw-bold text-dark-emphasis">${inst.general?.name || 'Unnamed'}</td>
            <td>${inst.general?.manufacturer || '-'}</td>
            <td><span class="badge badge-soft-info">${inst.general?.model || '-'}</span></td>
            <td><span class="badge badge-soft-primary">${inst.general?.category || 'General'}</span></td>
            <td>${inst.general?.inst_type || '-'}</td>
            <td><code>${inst.communication?.protocol || '-'}</code></td>
            <td>${inst.general?.project || '-'}</td>
            <td class="text-muted small">${dateStr}</td>
            <td class="text-end px-4 text-nowrap">
                <div class="d-inline-flex gap-1">
                    <a href="details.html?id=${inst.id}" class="btn-sm-action" title="View Details">
                        <i class="fa-solid fa-eye"></i>
                    </a>
                    <a href="add.html?id=${inst.id}" class="btn-sm-action" title="Edit Instrument">
                        <i class="fa-solid fa-pen"></i>
                    </a>
                    <button class="btn-sm-action btn-duplicate" data-id="${inst.id}" title="Duplicate Instrument">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                    <button class="btn-sm-action action-delete btn-delete" data-id="${inst.id}" title="Delete Instrument">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteInstrument(btn.dataset.id));
    });
    document.querySelectorAll('.btn-duplicate').forEach(btn => {
        btn.addEventListener('click', () => duplicateInstrument(btn.dataset.id));
    });
}

async function deleteInstrument(id) {
    if (confirm("Are you sure you want to delete this instrument? This action cannot be undone.")) {
        try {
            await remove(ref(db, `instruments/${id}`));
            showToast("Instrument deleted successfully", "success");
            await loadLibrary();
        } catch (e) {
            console.error(e);
            showToast("Failed to delete instrument.", "danger");
        }
    }
}

async function duplicateInstrument(id) {
    const inst = allInstruments.find(i => i.id === id);
    if (!inst) return;
    
    let newInst = JSON.parse(JSON.stringify(inst));
    const newId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    newInst.id = newId;
    newInst.general.name = (newInst.general?.name || 'Instrument') + " (Copy)";
    newInst.created_at = new Date().toISOString();
    newInst.updated_at = new Date().toISOString();
    
    try {
        await set(ref(db, `instruments/${newId}`), newInst);
        showToast("Instrument duplicated successfully!", "success");
        await loadLibrary();
    } catch (e) {
        console.error(e);
        showToast("Failed to duplicate instrument.", "danger");
    }
}

function getExportData() {
    return allInstruments.map(inst => {
        let row = {
            "Instrument Name": inst.general?.name || '',
            "Company": inst.general?.company || '',
            "Manufacturer": inst.general?.manufacturer || '',
            "Model": inst.general?.model || '',
            "Category": inst.general?.category || '',
            "Type": inst.general?.inst_type || '',
            "Firmware": inst.general?.firmware || '',
            "Protocol": inst.communication?.protocol || '',
            "Registers": inst.registers ? inst.registers.length : 0,
            "Updated": inst.updated_at ? new Date(inst.updated_at).toLocaleDateString() : ''
        };

        if (inst.tcpip?.enabled) {
            row["IP Address"] = inst.tcpip.ip || '';
            row["Subnet"] = inst.tcpip.subnet || '';
            row["Gateway"] = inst.tcpip.gateway || '';
            row["DNS"] = inst.tcpip.dns || '';
            row["MAC"] = inst.tcpip.mac || '';
            row["Host"] = inst.tcpip.host || '';
            row["TCP Port"] = inst.tcpip.tcp_port || '';
            row["Modbus Port"] = inst.tcpip.mod_port || '';
        }
        return row;
    });
}

window.exportCSV = function() {
    if (!window.XLSX) return showToast("Export library not loaded.", "danger");
    const data = getExportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Instruments");
    XLSX.writeFile(wb, "instrument_library.csv", { bookType: "csv" });
};

window.exportExcel = function() {
    if (!window.XLSX) return showToast("Excel library not loaded.", "danger");
    const data = getExportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Instruments");
    XLSX.writeFile(wb, "instrument_library.xlsx");
};

window.exportPDF = function() {
    if (!window.jspdf) return showToast("PDF library not loaded.", "danger");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Aadhav Intech - Industrial Instrument Library", 14, 15);
    
    const hasAnyTcp = allInstruments.some(i => i.tcpip?.enabled);
    const headers = ['Name', 'Model', 'Category', 'Protocol'];
    if (hasAnyTcp) headers.push('IP Address', 'Modbus Port');
    headers.push('Registers');

    const tableData = allInstruments.map(inst => {
        let row = [
            inst.general?.name || '',
            inst.general?.model || '',
            inst.general?.category || '',
            inst.communication?.protocol || ''
        ];
        if (hasAnyTcp) {
            if (inst.tcpip?.enabled) {
                row.push(inst.tcpip.ip || '', inst.tcpip.mod_port || '');
            } else {
                row.push('-', '-');
            }
        }
        row.push(inst.registers ? inst.registers.length.toString() : '0');
        return row;
    });

    doc.autoTable({
        head: [headers],
        body: tableData,
        startY: 22,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] }
    });
    doc.save('instrument_library.pdf');
};

window.printLibrary = function() {
    window.print();
};
