import { db, ref, get } from './firebase.js';

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const snap = await get(ref(db, 'instruments'));
        let allInst = [];
        if (snap.exists()) {
            allInst = Object.values(snap.val());
        }
        
        allInst.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        const totalInst = allInst.length;
        const manufacturers = new Set(allInst.map(i => i.general?.manufacturer).filter(Boolean)).size;
        const projects = new Set(allInst.map(i => i.general?.project).filter(Boolean)).size;
        
        let totalRegisters = 0, totalImages = 0, totalManuals = 0;
        
        allInst.forEach(inst => {
            if(inst.registers) totalRegisters += inst.registers.length;
            if(inst.media?.images) totalImages += inst.media.images.length;
            if(inst.media?.documents) totalManuals += inst.media.documents.length;
        });

        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]').length;
        const recent = JSON.parse(localStorage.getItem('recentViews') || '[]').length;

        const s = document.getElementById('statsContainer');
        if(s) {
            s.innerHTML = `
                ${statCard('Total Instruments', totalInst, 'primary', 'fa-gauge-simple')}
                ${statCard('Manufacturers', manufacturers, 'info', 'fa-industry')}
                ${statCard('Projects', projects, 'secondary', 'fa-folder-open')}
                ${statCard('Registers', totalRegisters, 'success', 'fa-list-ol')}
                ${statCard('Manuals / Docs', totalManuals, 'warning', 'fa-file-pdf', 'text-dark')}
                ${statCard('Images', totalImages, 'danger', 'fa-image')}
                ${statCard('Favorites', favorites, 'danger', 'fa-heart')}
                ${statCard('Recent Views', recent, 'dark', 'fa-clock-rotate-left')}
            `;
        }

        const tbody = document.getElementById('recentTableBody');
        if(tbody) {
            tbody.innerHTML = '';
            const recent10 = allInst.slice(0, 10);
            if(recent10.length === 0) tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">No instruments found.</td></tr>';
            
            recent10.forEach(inst => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="fw-bold">${inst.general?.name || 'N/A'}</td>
                    <td>${inst.general?.manufacturer || 'N/A'}</td>
                    <td>${inst.general?.model || 'N/A'}</td>
                    <td><span class="badge bg-secondary">${inst.general?.category || 'N/A'}</span></td>
                    <td>${inst.communication?.protocol || 'N/A'}</td>
                    <td>${new Date(inst.created_at).toLocaleDateString()}</td>
                    <td><a href="details.html?id=${inst.id}" class="btn btn-sm btn-outline-primary">View</a></td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch(e) {
        console.error(e);
    }
});

function statCard(title, val, color, icon, textClass="text-white") {
    return `
        <div class="col-md-3 col-sm-6 mb-3">
            <div class="card bg-${color} ${textClass} h-100 border-0 shadow-sm">
                <div class="card-body p-3 d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="text-uppercase mb-1" style="font-size:0.8rem; opacity:0.8; font-weight:600;">${title}</h6>
                        <h2 class="mb-0 fw-bold">${val}</h2>
                    </div>
                    <i class="fa-solid ${icon} fs-1" style="opacity:0.3;"></i>
                </div>
            </div>
        </div>
    `;
}
