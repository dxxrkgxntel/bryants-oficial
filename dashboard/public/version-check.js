(() => {
    const POLL_INTERVAL = 60_000;
    let currentVersion = "";
    let checking = false;
    let updateBanner = null;
    let userHasEditedForm = false;

    document.addEventListener("input", event => {
        if (event.target.closest("input, textarea, select, [contenteditable='true']")) userHasEditedForm = true;
    }, true);
    document.addEventListener("change", event => {
        if (event.target.closest("input, textarea, select, [contenteditable='true']")) userHasEditedForm = true;
    }, true);

    function showUpdateBanner() {
        if (updateBanner) return;
        updateBanner = document.createElement("aside");
        updateBanner.setAttribute("role", "status");
        updateBanner.setAttribute("aria-live", "polite");
        Object.assign(updateBanner.style, {
            position: "fixed", left: "50%", bottom: "22px", transform: "translateX(-50%)",
            zIndex: "99999", width: "min(560px, calc(100% - 28px))", boxSizing: "border-box",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px",
            padding: "16px 18px", border: "1px solid #39cc8370", borderRadius: "14px",
            background: "#17131f", color: "#f7f3fc", boxShadow: "0 16px 48px #0008",
            font: "500 14px/1.45 system-ui, sans-serif"
        });
        const message = document.createElement("span");
        const button = document.createElement("button");
        button.type = "button";
        Object.assign(button.style, {
            flexShrink: "0", border: "1px solid #39cc8370", borderRadius: "9px",
            padding: "10px 13px", background: "#39cc8320", color: "#82e7ae",
            font: "700 12px system-ui, sans-serif", cursor: "pointer"
        });
        const hasUnsavedChanges = () => userHasEditedForm || Boolean(document.querySelector(".has-unsaved-changes"));
        const refresh = () => {
            if (hasUnsavedChanges()) {
                message.textContent = "Guarda o descarta tus cambios antes de actualizar la página.";
                button.textContent = "Cerrar aviso";
                button.onclick = () => updateBanner?.remove();
                return;
            }
            window.location.reload();
        };
        message.textContent = hasUnsavedChanges()
            ? "Bryvex Bot se actualizó. Protegemos tus posibles cambios sin guardar."
            : "Hay una nueva versión de Bryvex Bot disponible.";
        button.textContent = hasUnsavedChanges() ? "Cerrar aviso" : "Actualizar";
        button.addEventListener("click", refresh);
        updateBanner.append(message, button);
        document.body.append(updateBanner);
    }

    async function checkVersion() {
        if (checking || document.visibilityState === "hidden") return;
        checking = true;
        try {
            const response = await fetch("/api/version", {
                cache: "no-store",
                credentials: "same-origin",
                headers: { "Accept": "application/json" }
            });
            if (!response.ok) return;
            const data = await response.json();
            if (!data || typeof data.version !== "string") return;
            if (!currentVersion) {
                currentVersion = data.version;
                return;
            }
            if (data.version !== currentVersion) {
                currentVersion = data.version;
                if (userHasEditedForm || document.querySelector(".has-unsaved-changes")) showUpdateBanner();
                else window.location.reload();
            }
        } catch {
            // A temporary network error should not interrupt dashboard use.
        } finally {
            checking = false;
        }
    }

    checkVersion();
    window.setInterval(checkVersion, POLL_INTERVAL);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkVersion();
    });
})();