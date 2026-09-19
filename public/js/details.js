import { db, ref, get } from './firebase.js';

const urlParams = new URLSearchParams(window.location.search);
const instId = urlParams.get('id');

document.addEventListener("DOMContentLoaded", async () => {
    if(!instId) return;
    document.getElementById('btnEdit').addEventListener('click', () => {
        window.location.href = `add.html?id=${instId}`;
    });
    
    try {
        const snap = await get(ref(db, `instruments/${instId}`));
        if(snap.exists()) {
            const inst = snap.val();
            
            // General
            document.getElementById('dTitle').textContent = `${inst.general?.name || 'Unnamed Instrument'}`;
            document.title = `${inst.general?.name} - Details`;
            
            document.getElementById('dSummaryManuf').textContent = inst.general?.manufacturer || '-';
            document.getElementById('dSummaryType').textContent = inst.general?.type || '-';
            document.getElementById('dSummaryCat').textContent = inst.general?.category || 'General';
            
            document.getElementById('dManuf').textContent = inst.general?.manufacturer || '-';
            document.getElementById('dModel').textContent = inst.general?.model || '-';
            document.getElementById('dFirmware').textContent = inst.general?.firmware || '-';
            document.getElementById('dDesc').textContent = inst.general?.description || 'No notes available.';
            
            // Comm
            document.getElementById('dProto').textContent = inst.communication?.protocol || '-';
            document.getElementById('dIface').textContent = inst.communication?.interface || '-';
            document.getElementById('dSlave').textContent = inst.communication?.slave_id || '-';
            document.getElementById('dBaud').textContent = inst.communication?.baud_rate || '-';
            document.getElementById('dParity').textContent = inst.communication?.parity || '-';
            document.getElementById('dData').textContent = inst.communication?.data_bits || '-';
            document.getElementById('dStop').textContent = inst.communication?.stop_bits || '-';
            document.getElementById('dTime').textContent = inst.communication?.timeout || '-';
            
            // TCP/IP
            document.getElementById('tcpSection').style.display = 'block';
            if(inst.tcpip?.enabled) {
                document.getElementById('tcpGrid').style.display = 'flex';
                document.getElementById('tcpDisabledMsg').style.display = 'none';
                
                document.getElementById('dIp').textContent = inst.tcpip.ip || '-';
                document.getElementById('dSub').textContent = inst.tcpip.subnet || '-';
                document.getElementById('dGate').textContent = inst.tcpip.gateway || '-';
                document.getElementById('dDns').textContent = inst.tcpip.dns || '-';
                document.getElementById('dMac').textContent = inst.tcpip.mac || '-';
                document.getElementById('dHost').textContent = inst.tcpip.host || '-';
                document.getElementById('dDevPort').textContent = inst.tcpip.dev_port || '-';
                document.getElementById('dTcpPort').textContent = inst.tcpip.tcp_port || '-';
                document.getElementById('dUdpPort').textContent = inst.tcpip.udp_port || '-';
                document.getElementById('dModPort').textContent = inst.tcpip.mod_port || '-';
                document.getElementById('dHttpPort').textContent = inst.tcpip.http_port || '-';
                document.getElementById('dHttpsPort').textContent = inst.tcpip.https_port || '-';
                document.getElementById('dFtpPort').textContent = inst.tcpip.ftp_port || '-';
                document.getElementById('dMqttPort').textContent = inst.tcpip.mqtt_port || '-';
                document.getElementById('dOpc').textContent = inst.tcpip.opc || '-';
                document.getElementById('dConnTime').textContent = inst.tcpip.conn_timeout || '-';
                document.getElementById('dRetry').textContent = inst.tcpip.retry || '-';
                document.getElementById('dPoll').textContent = inst.tcpip.poll || '-';
                document.getElementById('dKeep').textContent = inst.tcpip.keep_alive || '-';
                document.getElementById('dSockTime').textContent = inst.tcpip.sock_timeout || '-';
            } else {
                document.getElementById('tcpGrid').style.display = 'none';
                document.getElementById('tcpDisabledMsg').style.display = 'block';
            }
            
            // Media & Docs Split
            const docCats = ['manuals', 'datasheets', 'wiring', 'certificates', 'calibration', 'firmware'];
            const docContainer = document.getElementById('dDocContainer');
            let docHTML = '';
            
            docCats.forEach(cat => {
                if(inst.media && inst.media[cat]) {
                    const icon = cat === 'firmware' ? 'fa-file-code' : 'fa-file-pdf';
                    docHTML += `
                    <div class="col-md-4">
                        <div class="border rounded p-3 d-flex align-items-center bg-light">
                            <i class="fa-solid ${icon} fs-3 text-danger me-3"></i>
                            <div>
                                <h6 class="mb-1 text-capitalize">${cat}</h6>
                                <a href="${inst.media[cat]}" target="_blank" class="small text-decoration-none">View Document <i class="fa-solid fa-external-link ms-1"></i></a>
                            </div>
                        </div>
                    </div>`;
                }
            });
            docContainer.innerHTML = docHTML || '<div class="text-muted fst-italic">No documents uploaded.</div>';

            const mContainer = document.getElementById('dMediaContainer');
            let mediaHTML = '';
            if(inst.media && inst.media.images) {
                mediaHTML = `<img src="${inst.media.images}" alt="Instrument Image" class="img-fluid rounded shadow-sm border" style="max-height: 400px;">`;
            } else {
                mediaHTML = `<div class="text-muted p-5 bg-light rounded border"><i class="fa-regular fa-image fs-1 mb-2 d-block"></i>No image uploaded.</div>`;
            }
            mContainer.innerHTML = mediaHTML;

            // Registers
            const tbody = document.getElementById('dRegTable');
            if(inst.registers && inst.registers.length > 0) {
                inst.registers.forEach(r => {
                    tbody.innerHTML += `<tr>
                        <td class="fw-bold">${r.name||'-'}</td>
                        <td>${r.address||'-'}</td>
                        <td>${r.length||'1'}</td>
                        <td>${r.rtype||'-'}</td>
                        <td>${r.dtype||'-'}</td>
                        <td>${r.unit||'-'}</td>
                        <td>${r.rw||'-'}</td>
                        <td>${r.notes||'-'}</td>
                    </tr>`;
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="20" class="text-center py-3">No registers found.</td></tr>';
            }

            // Update Recent Views
            let recent = JSON.parse(localStorage.getItem('recentViews') || '[]');
            recent = recent.filter(id => id !== instId);
            recent.unshift(instId);
            if(recent.length > 20) recent.pop();
            localStorage.setItem('recentViews', JSON.stringify(recent));

        }
    } catch (e) {
        console.error(e);
    }
});
