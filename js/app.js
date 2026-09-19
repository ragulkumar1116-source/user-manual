import { loadCompanySettings } from './utils.js';

document.addEventListener('DOMContentLoaded', async function () {
    // Menu Toggle
    document.getElementById('menu-toggle')?.addEventListener('click', function (e) {
        e.preventDefault();
        document.getElementById('wrapper').classList.toggle('toggled');
    });

    // Theme Toggle
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', function () {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-bs-theme', newTheme);
            themeBtn.innerHTML = newTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        });
    }

    // Load Settings
    await loadCompanySettings();
    
    // Live Clock
    const clockEl = document.getElementById('liveClock');
    if (clockEl) {
        setInterval(() => {
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const month = monthNames[now.getMonth()];
            const year = now.getFullYear();
            const time = now.toTimeString().split(' ')[0];
            clockEl.textContent = `${day} ${month} ${year} ${time}`;
        }, 1000);
    }
});
