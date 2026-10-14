const welcome = document.querySelector("#welcome");
const publicHome = document.querySelector("#public-home");
const publicNav = document.querySelector("#public-nav");
const serversSection = document.querySelector("#servers-section");
const serversList = document.querySelector("#servers");
const userArea = document.querySelector("#user-area");
let dashboardLoadSequence = 0;
let loginRefreshPromise = null;

function showError(message) {
    const error = document.querySelector("#servers-error");
    error.textContent = message;
    error.hidden = false;
}

async function loadDashboard({ waitForSession = false } = {}) {
    const requestId = ++dashboardLoadSequence;
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "failed") {
        document.querySelector("#login-error").hidden = false;
        window.history.replaceState({}, "", "/");
    }

    try {
        let session;
        for (let attempt = 0; attempt < (waitForSession ? 6 : 1); attempt += 1) {
            const sessionResponse = await fetch("/api/me", { credentials: "same-origin", cache: "no-store" });
            session = await sessionResponse.json();
            if (session.user || !waitForSession) break;
            await new Promise(resolve => window.setTimeout(resolve, 250));
        }
        if (requestId !== dashboardLoadSequence) return;
        if (!session.user) return;

        document.body.classList.add("server-selection");
        if (publicHome) publicHome.hidden = true;
        if (publicNav) publicNav.hidden = true;
        if (welcome) welcome.hidden = true;
        serversSection.hidden = false;
        userArea.hidden = false;
        window.mountAccountMenu(userArea, session.user, showError);
        serversList.replaceChildren();
        document.querySelector("#servers-error").hidden = true;
        document.querySelector("#empty-state").hidden = true;

        const response = await fetch("/api/guilds", { credentials: "same-origin", cache: "no-store" });
        const result = await response.json();
        if (requestId !== dashboardLoadSequence) return;
        if (!response.ok) return showError(result.error || "No pude cargar los servidores.");

        try {
            sessionStorage.setItem("bryants-dashboard:guilds", JSON.stringify(result.guilds));
        } catch {
            // La selección de servidor sigue funcionando aunque el navegador bloquee el almacenamiento local.
        }

        if (result.guilds.length === 0) {
            document.querySelector("#empty-state").hidden = false;
            return;
        }

        for (const guild of result.guilds) {
            const card = document.createElement("a");
            card.className = "server-card";
            card.href = `/dashboard/${encodeURIComponent(guild.id)}`;

            const icon = document.createElement("span");
            icon.className = "server-icon";
            if (guild.icon) {
                const image = document.createElement("img");
                image.src = guild.icon;
                image.alt = "";
                icon.append(image);
            } else {
                icon.textContent = guild.name.slice(0, 2).toUpperCase();
            }

            const name = document.createElement("span");
            name.className = "server-name";
            name.textContent = guild.name;
            const action = document.createElement("span");
            action.className = "server-action";
            action.setAttribute("aria-hidden", "true");
            action.textContent = "›";
            card.append(icon, name, action);
            serversList.append(card);
        }
    } catch {
        if (requestId !== dashboardLoadSequence) return;
        showError("No pude conectar con la dashboard. Recarga la página e inténtalo de nuevo.");
    }
}

window.refreshDashboardAfterLogin = () => {
    if (loginRefreshPromise) return loginRefreshPromise;
    loginRefreshPromise = loadDashboard({ waitForSession: true }).finally(() => { loginRefreshPromise = null; });
    return loginRefreshPromise;
};

loadDashboard();
