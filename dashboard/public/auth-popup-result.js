(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("status") === "success";
    const title = document.querySelector("#result-title");
    const userLine = document.querySelector("#result-user");
    const note = document.querySelector("#result-note");
    const mark = document.querySelector("#result-mark");
    const closeButton = document.querySelector("#close-window");

    async function render() {
        if (!success) {
            title.textContent = "No se pudo completar el inicio de sesión";
            note.textContent = "Cierra esta ventana e inténtalo de nuevo desde el panel.";
            mark.textContent = "!";
            mark.classList.add("failed");
            closeButton.textContent = "Cerrar ventana";
            closeButton.hidden = false;
            return;
        }

        let username = "Discord";
        try {
            const response = await fetch("/api/me", { credentials: "same-origin", cache: "no-store" });
            const session = await response.json();
            username = session.user?.username || username;
        } catch {
            // La sesión ya se creó en el callback; el nombre es solo informativo.
        }

        title.textContent = "Sesión iniciada correctamente";
        userLine.textContent = `Has iniciado sesión como @${username}.`;
        note.textContent = "Esta ventana se cerrará en unos segundos…";
        if ("BroadcastChannel" in window) {
            const loginChannel = new BroadcastChannel("bryants-discord-login");
            loginChannel.postMessage({ type: "bryants-discord-login-complete" });
            loginChannel.close();
        }
        try {
            localStorage.setItem("bryants-discord-login-complete", `${Date.now()}-${Math.random()}`);
        } catch {
            // postMessage y BroadcastChannel también notifican a la ventana principal.
        }
        if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: "bryants-discord-login-complete" }, window.location.origin);
        }
        window.setTimeout(() => window.close(), 1800);
        window.setTimeout(() => {
            if (!window.closed) {
                note.textContent = "Esta ventana se cerrará en unos segundos…";
                closeButton.textContent = "Cerrar ventana";
                closeButton.hidden = false;
            }
        }, 2200);
    }

    closeButton.addEventListener("click", () => window.close());
    render();
})();
