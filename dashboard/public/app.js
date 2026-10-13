const welcome = document.querySelector("#welcome");
const serversSection = document.querySelector("#servers-section");
const serversList = document.querySelector("#servers");
const userArea = document.querySelector("#user-area");

function showError(message) {
    const error = document.querySelector("#servers-error");
    error.textContent = message;
    error.hidden = false;
}

async function loadDashboard() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "failed") {
        document.querySelector("#login-error").hidden = false;
        window.history.replaceState({}, "", "/");
    }

    try {
        const sessionResponse = await fetch("/api/me", { credentials: "same-origin" });
        const session = await sessionResponse.json();
        if (!session.user) return;

        welcome.hidden = true;
        serversSection.hidden = false;
        userArea.hidden = false;
        userArea.textContent = `Sesión iniciada como ${session.user.username}`;

        const response = await fetch("/api/guilds", { credentials: "same-origin" });
        const result = await response.json();
        if (!response.ok) return showError(result.error || "No pude cargar los servidores.");

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
        showError("No pude conectar con la dashboard. Recarga la página e inténtalo de nuevo.");
    }
}

loadDashboard();
