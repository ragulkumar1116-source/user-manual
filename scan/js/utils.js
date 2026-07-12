import { db, ref, get } from './firebase.js';

export function showToast(message, type = 'primary') {
    const toastBody = document.getElementById('toastMessage');
    const toastEl = document.getElementById('appToast');
    if(!toastBody || !toastEl) return;
    
    toastBody.textContent = message;
    toastEl.className = `toast align-items-center text-bg-${type} border-0`;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

export async function loadCompanySettings() {
    try {
        const snap = await get(ref(db, 'settings'));
        if (snap.exists()) {
            const data = snap.val();
            // Branding updates across DOM
            if(data.name) {
                document.querySelectorAll('.app-company-name').forEach(el => el.textContent = data.name);
                document.title = data.name + " - Instrument Library";
            }
            if(data.logo) {
                document.querySelectorAll('.app-company-logo').forEach(el => el.src = data.logo);
                let link = document.querySelector("link[rel~='icon']");
                if (!link) {
                    link = document.createElement('link');
                    link.rel = 'icon';
                    document.head.appendChild(link);
                }
                link.href = data.logo;
            }
            // Footer details
            if(document.getElementById('footerAddress')) {
                document.getElementById('footerAddress').textContent = data.address || '';
                document.getElementById('footerPhone').textContent = data.phone1 || '';
                document.getElementById('footerEmail').textContent = data.email1 || '';
            }
            return data;
        }
    } catch(e) {
        console.error("Error loading settings:", e);
    }
    return null;
}
