import { db, ref, get, remove, set } from './firebase.js';
import { showToast } from './utils.js';

let allInstruments = [];

document.addEventListener("DOMContentLoaded", async () => {
    await loadLibrary();
    
    document.getElementById('searchInput')?.addEventListener('input', function(e) {
        const term = e.target.value.toLowerCase();
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
            renderTable(allInstruments);
        } else {
            allInstruments = [];
            renderTable([]);
        }
    } catch (e) {
        console.error(e);
        document.getElementById('libraryTableBody').innerHTML = '<tr><td colspan="10" class="text-danger">Failed to load data.</td></tr>';
    }
}

function renderTable(data) {
    const tbody = document.getElementById('libraryTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    if(data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-4">No instruments found.</td></tr>';
        return;
    }

    data.forEach(inst => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${inst.media?.image ? `<img src="${inst.media.image}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;">` : `<div class="bg-light text-muted d-flex align-items-center justify-content-center" style="width:40px;height:40px;border-radius:4px;"><i class="fa-solid fa-image"></i></div>`}</td>
            <td class="fw-bold">${inst.general?.name || ''}</td>
            <td>${inst.general?.manufacturer || ''}</td>
            <td>${inst.general?.model || ''}</td>
            <td><span class="badge bg-primary text-white">${inst.general?.category || ''}</span></td>
            <td>${inst.general?.inst_type || ''}</td>
            <td>${inst.communication?.protocol || ''}</td>
            <td>${inst.general?.project || ''}</td>
            <td>${new Date(inst.updated_at).toLocaleDateString()}</td>
            <td class="text-end px-3 text-nowrap">
                <a href="details.html?id=${inst.id}" class="btn btn-sm btn-info text-white shadow-sm" title="View"><i class="fa-solid fa-eye"></i></a>
                <a href="add.html?id=${inst.id}" class="btn btn-sm btn-primary shadow-sm" title="Edit"><i class="fa-solid fa-pen"></i></a>
                <button class="btn btn-sm btn-warning text-white shadow-sm btn-duplicate" data-id="${inst.id}" title="Duplicate"><i class="fa-solid fa-copy"></i></button>
                <button class="btn btn-sm btn-danger shadow-sm btn-delete" data-id="${inst.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
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
    if(confirm("Are you sure you want to delete this instrument?")) {
        try {
            await remove(ref(db, `instruments/${id}`));
            showToast("Instrument deleted successfully", "success");
            await loadLibrary();
        } catch(e) {
            console.error(e);
            showToast("Failed to delete.", "danger");
        }
    }
}

async function duplicateInstrument(id) {
    const inst = allInstruments.find(i => i.id === id);
    if(!inst) return;
    
    let newInst = JSON.parse(JSON.stringify(inst));
    const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    newInst.id = newId;
    newInst.general.name = newInst.general.name + " (Copy)";
    newInst.created_at = new Date().toISOString();
    newInst.updated_at = new Date().toISOString();
    
    try {
        await set(ref(db, `instruments/${newId}`), newInst);
        showToast("Instrument duplicated!", "success");
        await loadLibrary();
    } catch(e) {
        console.error(e);
    }
}

// Export logic
    let csvData = allInstruments.map(inst => {
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
            "Updated": new Date(inst.updated_at).toLocaleDateString()
        };

        if(inst.tcpip?.enabled) {
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

window.exportCSV = function() {
    if(!window.XLSX) return showToast("Export library not loaded.", "danger");
    const ws = XLSX.utils.json_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Instruments");
    XLSX.writeFile(wb, "instrument_library.csv", {bookType: "csv"});
};

window.exportExcel = function() {
    if(!window.XLSX) return showToast("Excel library not loaded.", "danger");
    const ws = XLSX.utils.json_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Instruments");
    XLSX.writeFile(wb, "instrument_library.xlsx");
};

window.exportPDF = function() {
    if(!window.jspdf) return showToast("PDF library not loaded.", "danger");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    doc.text("Instrument Library", 14, 15);
    
    // Check if any has TCP to include headers
    const hasAnyTcp = allInstruments.some(i => i.tcpip?.enabled);
    
    const headers = ['Name', 'Model', 'Category', 'Protocol'];
    if(hasAnyTcp) headers.push('IP Address', 'Modbus Port');
    headers.push('Registers');

    const tableData = allInstruments.map(inst => {
        let row = [
            inst.general?.name || '',
            inst.general?.model || '',
            inst.general?.category || '',
            inst.communication?.protocol || ''
        ];
        if(hasAnyTcp) {
            if(inst.tcpip?.enabled) {
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
        startY: 20
    });
    doc.save('instrument_library.pdf');
};

window.printLibrary = function() {
    window.print();
};
