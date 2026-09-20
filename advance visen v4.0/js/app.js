import { loadCompanySettings } from './utils.js';

document.addEventListener('DOMContentLoaded', async function () {
    // 1. Theme Initialization & Toggle with localStorage Persistence
    const savedTheme = localStorage.getItem('app-theme') || 'light';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);

    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.innerHTML = savedTheme === 'dark' 
            ? '<i class="fa-solid fa-sun text-warning"></i>' 
            : '<i class="fa-solid fa-moon"></i>';
            
        themeBtn.addEventListener('click', function () {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-bs-theme', newTheme);
            localStorage.setItem('app-theme', newTheme);
            themeBtn.innerHTML = newTheme === 'dark' 
                ? '<i class="fa-solid fa-sun text-warning"></i>' 
                : '<i class="fa-solid fa-moon"></i>';
        });
    }

    // 2. Mobile Sidebar Toggle with Backdrop Support
    const menuToggle = document.getElementById('menu-toggle');
    const wrapper = document.getElementById('wrapper');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (menuToggle && wrapper) {
        menuToggle.addEventListener('click', function (e) {
            e.preventDefault();
            wrapper.classList.toggle('toggled');
            if (backdrop) {
                backdrop.classList.toggle('active', wrapper.classList.contains('toggled'));
            }
        });
    }

    if (backdrop && wrapper) {
        backdrop.addEventListener('click', function () {
            wrapper.classList.remove('toggled');
            backdrop.classList.remove('active');
        });
    }

    // 3. Smart Active Sidebar Navigation
    const currentPath = window.location.pathname.split('/').pop().toLowerCase() || 'maindashbod.html';
    const sidebarLinks = document.querySelectorAll('#sidebar-wrapper .list-group-item:not(.btn-logout)');
    
    sidebarLinks.forEach(link => {
        const href = link.getAttribute('href')?.toLowerCase();
        link.classList.remove('active');
        
        if (href) {
            if (href === currentPath) {
                link.classList.add('active');
            } else if (currentPath === 'details.html' && href === 'library.html') {
                link.classList.add('active');
            } else if ((currentPath === '' || currentPath === 'index.html') && href === 'maindashbod.html') {
                link.classList.add('active');
            }
        }
    });

    // 4. Live Clock Display
    const clockEl = document.getElementById('liveClock');
    if (clockEl) {
        const updateClock = () => {
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const month = monthNames[now.getMonth()];
            const year = now.getFullYear();
            const time = now.toTimeString().split(' ')[0];
            clockEl.textContent = `${day} ${month} ${year} ${time}`;
        };
        updateClock();
        setInterval(updateClock, 1000);
    }

    // 5. Global Logout Handler
    document.querySelectorAll('.btn-logout').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            if (confirm("Are you sure you want to sign out of the portal?")) {
                sessionStorage.removeItem("verified");
                sessionStorage.clear();
                window.location.replace("index.html");
            }
        });
    });

    // 6. Dynamic Company Branding & Logo
    await loadCompanySettings();
});
