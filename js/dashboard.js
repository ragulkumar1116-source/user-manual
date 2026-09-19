import { db, ref, get } from './firebase.js';

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const snap = await get(ref(db, 'instruments'));
        let allInst = [];
        if (snap.exists()) {
            allInst = Object.values(snap.val());
        }
        
        allInst.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        
        const totalInst = allInst.length;
        const manufacturers = new Set(allInst.map(i => i.general?.manufacturer).filter(Boolean)).size;
        const projects = new Set(allInst.map(i => i.general?.project).filter(Boolean)).size;
        
        let totalRegisters = 0, totalImages = 0, totalManuals = 0;
        
        allInst.forEach(inst => {
            if (inst.registers) totalRegisters += inst.registers.length;
            if (inst.media?.images) totalImages += inst.media.images.length;
            if (inst.media?.documents) totalManuals += inst.media.documents.length;
        });

        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]').length;
        const recent = JSON.parse(localStorage.getItem('recentViews') || '[]').length;

        const s = document.getElementById('statsContainer');
        if (s) {
            s.innerHTML = `
                ${statCard('Total Instruments', totalInst, 'stat-icon-blue', 'fa-gauge-simple')}
                ${statCard('Manufacturers', manufacturers, 'stat-icon-cyan', 'fa-industry')}
                ${statCard('Projects', projects, 'stat-icon-purple', 'fa-folder-open')}
                ${statCard('Registers', totalRegisters, 'stat-icon-green', 'fa-list-ol')}
                ${statCard('Manuals / Docs', totalManuals, 'stat-icon-amber', 'fa-file-pdf')}
                ${statCard('Images', totalImages, 'stat-icon-rose', 'fa-image')}
                ${statCard('Favorites', favorites, 'stat-icon-rose', 'fa-heart')}
                ${statCard('Recent Views', recent, 'stat-icon-slate', 'fa-clock-rotate-left')}
            `;
        }

        const tbody = document.getElementById('recentTableBody');
        if (tbody) {
            tbody.innerHTML = '';
            const recent10 = allInst.slice(0, 10);
            if (recent10.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4"><i class="fa-regular fa-folder-open fs-3 d-block mb-2 text-secondary"></i>No instruments found yet.</td></tr>';
            } else {
                recent10.forEach(inst => {
                    const tr = document.createElement('tr');
                    const dateStr = inst.created_at ? new Date(inst.created_at).toLocaleDateString() : '-';
                    tr.innerHTML = `
                        <td class="fw-bold text-dark-emphasis">${inst.general?.name || 'Unnamed Instrument'}</td>
                        <td>${inst.general?.manufacturer || '-'}</td>
                        <td><span class="badge badge-soft-info">${inst.general?.model || '-'}</span></td>
                        <td><span class="badge badge-soft-primary">${inst.general?.category || 'General'}</span></td>
                        <td>${inst.communication?.protocol || '-'}</td>
                        <td class="text-muted small">${dateStr}</td>
                        <td class="text-end">
                            <a href="details.html?id=${inst.id}" class="btn btn-sm btn-outline-secondary">
                                <i class="fa-solid fa-eye me-1"></i>View
                            </a>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }
    } catch (e) {
        console.error("Dashboard data load error:", e);
    }
});

function statCard(title, val, iconClass, icon) {
    return `
        <div class="col-xl-3 col-md-6 col-sm-6 mb-3">
            <div class="stat-card-modern">
                <div>
                    <div class="stat-card-title">${title}</div>
                    <div class="stat-card-value">${val}</div>
                </div>
                <div class="stat-card-icon ${iconClass}">
                    <i class="fa-solid ${icon}"></i>
                </div>
            </div>
        </div>
    `;
}
