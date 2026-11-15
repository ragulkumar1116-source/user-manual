/* ==========================================================
   lock.js
   Basic Page Protection
   ========================================================== */

(function () {
    "use strict";

    console.log("lock.js loaded");

    // Disable Right Click
    document.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        return false;
    });

    // Disable Text Selection
    document.addEventListener("selectstart", function (e) {
        e.preventDefault();
        return false;
    });

    // Disable Dragging
    document.addEventListener("dragstart", function (e) {
        e.preventDefault();
        return false;
    });

    // Disable Copy
    document.addEventListener("copy", function (e) {
        e.preventDefault();
    });

    // Disable Cut
    document.addEventListener("cut", function (e) {
        e.preventDefault();
    });

    // Disable Paste
    document.addEventListener("paste", function (e) {
        e.preventDefault();
    });

    // Disable Keyboard Shortcuts
    document.addEventListener("keydown", function (e) {

        const key = e.key.toLowerCase();

        // F12
        if (e.key === "F12") {
            e.preventDefault();
            return false;
        }

        // Ctrl + Shift + I
        if (e.ctrlKey && e.shiftKey && key === "i") {
            e.preventDefault();
            return false;
        }

        // Ctrl + Shift + J
        if (e.ctrlKey && e.shiftKey && key === "j") {
            e.preventDefault();
            return false;
        }

        // Ctrl + Shift + C
        if (e.ctrlKey && e.shiftKey && key === "c") {
            e.preventDefault();
            return false;
        }

        // Ctrl + U
        if (e.ctrlKey && key === "u") {
            e.preventDefault();
            return false;
        }

        // Ctrl + S
        if (e.ctrlKey && key === "s") {
            e.preventDefault();
            return false;
        }

        // Ctrl + P
        if (e.ctrlKey && key === "p") {
            e.preventDefault();
            return false;
        }

        // Ctrl + A
        if (e.ctrlKey && key === "a") {
            e.preventDefault();
            return false;
        }

        // Ctrl + C
        if (e.ctrlKey && key === "c") {
            e.preventDefault();
            return false;
        }

        // Ctrl + X
        if (e.ctrlKey && key === "x") {
            e.preventDefault();
            return false;
        }

        // Ctrl + V
        if (e.ctrlKey && key === "v") {
            e.preventDefault();
            return false;
        }

    });

})();
