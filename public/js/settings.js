import { db, ref, get, set } from './firebase.js';
import { showToast } from './utils.js';

document.addEventListener("DOMContentLoaded", async () => {
    const fields = ['cLogo', 'cName', 'cTax', 'cDesc', 'cAddress', 'cCity', 'cState', 'cZip', 'cCountry', 'cWeb', 'cPhone1', 'cPhone2', 'cEmail1', 'cEmail2'];
    
    const updatePreview = () => {
        const logo = document.getElementById('cLogo').value;
        const pLogo = document.getElementById('pLogo');
        if(logo) {
            pLogo.src = logo;
            pLogo.style.display = 'inline-block';
        } else {
            pLogo.style.display = 'none';
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

    const snap = await get(ref(db, 'settings'));
    if(snap.exists()) {
        const s = snap.val();
        document.getElementById('cLogo').value = s.logo || '';
        document.getElementById('cName').value = s.name || '';
        document.getElementById('cTax').value = s.tax || '';
        document.getElementById('cDesc').value = s.desc || '';
        document.getElementById('cAddress').value = s.address || '';
        document.getElementById('cCity').value = s.city || '';
        document.getElementById('cState').value = s.state || '';
        document.getElementById('cZip').value = s.zip || '';
        document.getElementById('cCountry').value = s.country || '';
        document.getElementById('cWeb').value = s.web || '';
        document.getElementById('cPhone1').value = s.phone1 || '';
        document.getElementById('cPhone2').value = s.phone2 || '';
        document.getElementById('cEmail1').value = s.email1 || '';
        document.getElementById('cEmail2').value = s.email2 || '';
    }

    fields.forEach(id => {
        document.getElementById(id).addEventListener('input', updatePreview);
    });
    updatePreview();

    document.getElementById('btnSave').addEventListener('click', async () => {
        const settings = {
            logo: document.getElementById('cLogo').value,
            name: document.getElementById('cName').value,
            tax: document.getElementById('cTax').value,
            desc: document.getElementById('cDesc').value,
            address: document.getElementById('cAddress').value,
            city: document.getElementById('cCity').value,
            state: document.getElementById('cState').value,
            zip: document.getElementById('cZip').value,
            country: document.getElementById('cCountry').value,
            web: document.getElementById('cWeb').value,
            phone1: document.getElementById('cPhone1').value,
            phone2: document.getElementById('cPhone2').value,
            email1: document.getElementById('cEmail1').value,
            email2: document.getElementById('cEmail2').value
        };
        try {
            await set(ref(db, 'settings'), settings);
            showToast("Settings Saved Successfully!", "success");
        } catch(e) {
            console.error(e);
            showToast("Failed to save settings.", "danger");
        }
    });
});
