import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// FIREBASE CONFIGURATION
const firebaseConfig = {
    apiKey: "AIzaSyAdWdihzNcva6QugwcJ5onhVv25bRzGOQI",
    authDomain: "aiterp-254c6.firebaseapp.com",
    databaseURL: "https://aiterp-254c6-default-rtdb.firebaseio.com",
    projectId: "aiterp-254c6",
    storageBucket: "aiterp-254c6.firebasestorage.app",
    messagingSenderId: "141769590506",
    appId: "1:141769590506:web:434df19c89511914657993",
    measurementId: "G-B4H74W4KCV"
};

// INITIALIZE FIREBASE
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DOM ELEMENTS
const authForm = document.getElementById("authForm");
const status = document.getElementById("status");
const formTitle = document.getElementById("formTitle");
const submitBtn = document.getElementById("submitBtn");
const toggleText = document.getElementById("toggleText");
const forgotPasswordLink = document.getElementById("forgotPassword");

let isLoginMode = true;

// --- AUTH LOGIC ---

const toggleMode = () => {
    isLoginMode = !isLoginMode;
    formTitle.innerText = isLoginMode ? "Sign In" : "Sign Up";
    submitBtn.innerText = isLoginMode ? "Continue" : "Create Account";
    forgotPasswordLink.style.display = isLoginMode ? 'block' : 'none';
    toggleText.innerHTML = isLoginMode 
        ? 'Don\'t have an account? <span id="switchMode">Sign Up</span>' 
        : 'Already have an account? <span id="switchMode">Sign In</span>';
    document.getElementById("switchMode").onclick = toggleMode;
};

document.getElementById("switchMode").onclick = toggleMode;

forgotPasswordLink.addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    if (!email) {
        showStatus("Please enter your email first.", "var(--error)");
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        showStatus("Reset link sent to your email!", "var(--accent)");
    } catch (error) {
        showStatus(formatError(error.code), "var(--error)");
    }
});

authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    showStatus(isLoginMode ? "Verifying..." : "Creating Account...", "#fff");

    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
            showStatus("Success! Redirecting...", "var(--accent)");
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
            showStatus("Account created successfully!", "var(--accent)");
        }
        setTimeout(() => { window.location.href = "dashboard.html"; }, 1500);
    } catch (error) {
        showStatus(formatError(error.code), "var(--error)");
    }
});

// --- INACTIVITY / AUTO-LOGOUT LOGIC (5 MINUTES) ---

let logoutTimer;
const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes in milliseconds

function resetTimer() {
    clearTimeout(logoutTimer);
    // Only set timer if a user is actually logged in
    if (auth.currentUser) {
        logoutTimer = setTimeout(logoutUser, INACTIVITY_LIMIT);
    }
}

async function logoutUser() {
    try {
        await signOut(auth);
        alert("You have been logged out due to 5 minutes of inactivity.");
        window.location.href = "index.html"; // Redirect to login page
    } catch (error) {
        console.error("Error logging out:", error);
    }
}

// Watch for user activity
window.onload = resetTimer;
window.onmousemove = resetTimer;
window.onmousedown = resetTimer; 
window.ontouchstart = resetTimer; 
window.onclick = resetTimer;     
window.onkeydown = resetTimer;   

// Listen for Auth State changes to start/stop the timer
onAuthStateChanged(auth, (user) => {
    if (user) {
        resetTimer();
        console.log("Session started. Auto-logout in 5 mins of inactivity.");
    } else {
        clearTimeout(logoutTimer);
    }
});

// --- HELPERS ---
function showStatus(text, color) {
    status.innerText = text;
    status.style.color = color;
}

function formatError(code) {
    return code.replace('auth/', '').replaceAll('-', ' ').toUpperCase();
}
