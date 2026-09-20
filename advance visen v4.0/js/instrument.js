import { db, ref, get, set } from './firebase.js';
import { showToast } from './utils.js';

const urlParams = new URLSearchParams(window.location.search);
const currentInstId = urlParams.get('id');
let currentInst = null;

document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById('tcpEnabled')?.addEventListener('change', e => {
        document.getElementById('tcpFields').style.display = e.target.checked ? 'flex' : 'none';
    });

    document.getElementById('btnAddRow')?.addEventListener('click', () => addRegisterRow());

    if(currentInstId) {
        document.getElementById('pageTitle').textContent = "Edit Instrument";
        await loadInstrument(currentInstId);
    } else {
        addRegisterRow();
    }

    document.getElementById('btnSaveInst')?.addEventListener('click', saveInstrument);
});

async function loadInstrument(id) {
    try {
        const snapshot = await get(ref(db, `instruments/${id}`));
        if(snapshot.exists()) {
            currentInst = snapshot.val();
            // General
            document.getElementById('iName').value = currentInst.general?.name || '';
            document.getElementById('iCompany').value = currentInst.general?.company || '';
            document.getElementById('iManuf').value = currentInst.general?.manufacturer || '';
            document.getElementById('iModel').value = currentInst.general?.model || '';
            document.getElementById('iCat').value = currentInst.general?.category || '';
            document.getElementById('iType').value = currentInst.general?.inst_type || '';
            document.getElementById('iFirmware').value = currentInst.general?.firmware || '';
            document.getElementById('iDesc').value = currentInst.general?.description || '';
            
            // Comm
            document.getElementById('cProto').value = currentInst.communication?.protocol || '';
            document.getElementById('cIface').value = currentInst.communication?.interface || '';
            document.getElementById('cSlave').value = currentInst.communication?.slave_id || '';
            document.getElementById('cBaud').value = currentInst.communication?.baud_rate || '';
            document.getElementById('cParity').value = currentInst.communication?.parity || '';
            document.getElementById('cData').value = currentInst.communication?.data_bits || '';
            document.getElementById('cStop').value = currentInst.communication?.stop_bits || '';
            document.getElementById('cTime').value = currentInst.communication?.timeout || '';
            
            // TCP
            if(currentInst.tcpip?.enabled) {
                document.getElementById('tcpEnabled').checked = true;
                document.getElementById('tcpFields').style.display = 'flex';
                document.getElementById('tIp').value = currentInst.tcpip.ip || '';
                document.getElementById('tSub').value = currentInst.tcpip.subnet || '';
                document.getElementById('tGate').value = currentInst.tcpip.gateway || '';
                document.getElementById('tDns').value = currentInst.tcpip.dns || '';
                document.getElementById('tMac').value = currentInst.tcpip.mac || '';
                document.getElementById('tHost').value = currentInst.tcpip.host || '';
                document.getElementById('tDevPort').value = currentInst.tcpip.dev_port || '';
                document.getElementById('tTcpPort').value = currentInst.tcpip.tcp_port || '';
                document.getElementById('tUdpPort').value = currentInst.tcpip.udp_port || '';
                document.getElementById('tModPort').value = currentInst.tcpip.mod_port || '';
                document.getElementById('tHttpPort').value = currentInst.tcpip.http_port || '';
                document.getElementById('tHttpsPort').value = currentInst.tcpip.https_port || '';
                document.getElementById('tFtpPort').value = currentInst.tcpip.ftp_port || '';
                document.getElementById('tMqttPort').value = currentInst.tcpip.mqtt_port || '';
                document.getElementById('tOpc').value = currentInst.tcpip.opc || '';
                document.getElementById('tConnTime').value = currentInst.tcpip.conn_timeout || '';
                document.getElementById('tRetry').value = currentInst.tcpip.retry || '';
                document.getElementById('tPoll').value = currentInst.tcpip.poll || '';
                document.getElementById('tKeep').value = currentInst.tcpip.keep_alive || '';
                document.getElementById('tSockTime').value = currentInst.tcpip.sock_timeout || '';
            }

            // Media
            const mediaCats = ['images', 'manuals', 'datasheets', 'wiring', 'certificates', 'calibration', 'firmware'];
            mediaCats.forEach(cat => {
                if(currentInst.media && currentInst.media[cat]) {
                    const urlInput = document.getElementById(`mUrl_${cat}`);
                    if(urlInput) urlInput.value = currentInst.media[cat];
                }
            });

            // Registers
            if(currentInst.registers && currentInst.registers.length > 0) {
                currentInst.registers.forEach(r => addRegisterRow(r));
            } else {
                addRegisterRow();
            }
        }
        // Enable file uploads if editing
        document.querySelectorAll('.media-file').forEach(el => {
            el.removeAttribute('disabled');
            el.addEventListener('change', () => {
                alert('Firebase Storage is not configured yet. Please paste a Web Link instead.');
                el.value = ''; // Reset
            });
        });

        // Live TCP/IP Toggle
        const tcpToggle = document.getElementById('tcpEnabled');
        const tcpFields = document.getElementById('tcpFields');
        tcpToggle.addEventListener('change', (e) => {
            tcpFields.style.display = e.target.checked ? 'flex' : 'none';
        });

    } catch (e) {
        console.error(e);
        showToast("Failed to load instrument", "danger");
    }
}

function addRegisterRow(reg = null) {
    const tbody = document.getElementById('registerTableBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="form-control form-control-sm r-name" value="${reg?.name || ''}"></td>
        <td><input type="text" class="form-control form-control-sm r-addr" value="${reg?.address || ''}"></td>
        <td><input type="number" class="form-control form-control-sm r-length" value="${reg?.length || '1'}"></td>
        <td><select class="form-select form-select-sm r-rtype">
            <option value="Holding" ${reg?.rtype=='Holding'?'selected':''}>Holding</option>
            <option value="Input" ${reg?.rtype=='Input'?'selected':''}>Input</option>
            <option value="Coil" ${reg?.rtype=='Coil'?'selected':''}>Coil</option>
        </select></td>
        <td><select class="form-select form-select-sm r-dtype">
            <option value="double" ${reg?.dtype=='double'?'selected':''}>double</option>
            <option value="double_swapped" ${reg?.dtype=='double_swapped'?'selected':''}>double_swapped</option>
            <option value="double_word_reversed" ${reg?.dtype=='double_word_reversed'?'selected':''}>double_word_reversed</option>
            <option value="float_dcba" ${reg?.dtype=='float_dcba'?'selected':''}>float_dcba</option>
            <option value="float_msrf" ${reg?.dtype=='float_msrf'?'selected':''}>float_msrf</option>
            <option value="float_normal" ${reg?.dtype=='float_normal'?'selected':''}>float_normal</option>
            <option value="float_swapped" ${reg?.dtype=='float_swapped'?'selected':''}>float_swapped</option>
            <option value="int16" ${reg?.dtype=='int16'?'selected':''}>int16</option>
            <option value="int32" ${reg?.dtype=='int32'?'selected':''}>int32</option>
            <option value="int32_swapped" ${reg?.dtype=='int32_swapped'?'selected':''}>int32_swapped</option>
            <option value="serial_text" ${reg?.dtype=='serial_text'?'selected':''}>serial_text</option>
            <option value="uint16" ${reg?.dtype=='uint16'||!reg?.dtype?'selected':''}>uint16</option>
            <option value="uint32" ${reg?.dtype=='uint32'?'selected':''}>uint32</option>
            <option value="uint32_byte_word_swap" ${reg?.dtype=='uint32_byte_word_swap'?'selected':''}>uint32_byte_word_swap</option>
            <option value="uint32_swapped" ${reg?.dtype=='uint32_swapped'?'selected':''}>uint32_swapped</option>
            <option value="uint64" ${reg?.dtype=='uint64'?'selected':''}>uint64</option>
            <option value="uint64_swapped" ${reg?.dtype=='uint64_swapped'?'selected':''}>uint64_swapped</option>
        </select></td>
        <td><input type="text" list="unitList" class="form-control form-control-sm r-unit" value="${reg?.unit || ''}"></td>
        <td><select class="form-select form-select-sm r-rw">
            <option value="R" ${reg?.rw=='R'?'selected':''}>R</option>
            <option value="R/W" ${reg?.rw=='R/W'?'selected':''}>R/W</option>
        </select></td>
        <td><input type="text" class="form-control form-control-sm r-notes" value="${reg?.notes || ''}"></td>
        <td><button class="btn btn-danger btn-sm" onclick="this.closest('tr').remove()"><i class="fa-solid fa-trash"></i></button></td>
    `;
    tbody.appendChild(tr);
}

async function saveInstrument() {
    const payload = {
        id: currentInstId || (Date.now().toString(36) + Math.random().toString(36).substr(2)),
        created_at: currentInst?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        general: {
            name: document.getElementById('iName').value,
            company: document.getElementById('iCompany').value,
            manufacturer: document.getElementById('iManuf').value,
            model: document.getElementById('iModel').value,
            category: document.getElementById('iCat').value,
            inst_type: document.getElementById('iType').value,
            firmware: document.getElementById('iFirmware').value,
            description: document.getElementById('iDesc').value
        },
        communication: { 
            protocol: document.getElementById('cProto').value,
            interface: document.getElementById('cIface').value,
            slave_id: document.getElementById('cSlave').value,
            baud_rate: document.getElementById('cBaud').value,
            parity: document.getElementById('cParity').value,
            data_bits: document.getElementById('cData').value,
            stop_bits: document.getElementById('cStop').value,
            timeout: document.getElementById('cTime').value
        },
        tcpip: {
            enabled: document.getElementById('tcpEnabled').checked,
            ip: document.getElementById('tIp').value,
            subnet: document.getElementById('tSub').value,
            gateway: document.getElementById('tGate').value,
            dns: document.getElementById('tDns').value,
            mac: document.getElementById('tMac').value,
            host: document.getElementById('tHost').value,
            dev_port: document.getElementById('tDevPort').value,
            tcp_port: document.getElementById('tTcpPort').value,
            udp_port: document.getElementById('tUdpPort').value,
            mod_port: document.getElementById('tModPort').value,
            http_port: document.getElementById('tHttpPort').value,
            https_port: document.getElementById('tHttpsPort').value,
            ftp_port: document.getElementById('tFtpPort').value,
            mqtt_port: document.getElementById('tMqttPort').value,
            opc: document.getElementById('tOpc').value,
            conn_timeout: document.getElementById('tConnTime').value,
            retry: document.getElementById('tRetry').value,
            poll: document.getElementById('tPoll').value,
            keep_alive: document.getElementById('tKeep').value,
            sock_timeout: document.getElementById('tSockTime').value
        },
        media: {
            images: document.getElementById('mUrl_images')?.value || '',
            manuals: document.getElementById('mUrl_manuals')?.value || '',
            datasheets: document.getElementById('mUrl_datasheets')?.value || '',
            wiring: document.getElementById('mUrl_wiring')?.value || '',
            certificates: document.getElementById('mUrl_certificates')?.value || '',
            calibration: document.getElementById('mUrl_calibration')?.value || '',
            firmware: document.getElementById('mUrl_firmware')?.value || ''
        },
        registers: []
    };

    document.querySelectorAll('#registerTableBody tr').forEach(tr => {
        const name = tr.querySelector('.r-name').value;
        if(name) { // only save if name exists
            payload.registers.push({
                name: name,
                address: tr.querySelector('.r-addr').value,
                length: tr.querySelector('.r-length').value,
                rtype: tr.querySelector('.r-rtype').value,
                dtype: tr.querySelector('.r-dtype').value,
                unit: tr.querySelector('.r-unit').value,
                rw: tr.querySelector('.r-rw').value,
                notes: tr.querySelector('.r-notes').value
            });
        }
    });

    try {
        await set(ref(db, `instruments/${payload.id}`), payload);
        showToast("Instrument Saved successfully!", "success");
        setTimeout(() => window.location.href = 'library.html', 1000);
    } catch(e) {
        console.error(e);
        showToast("Error saving instrument.", "danger");
    }
}
