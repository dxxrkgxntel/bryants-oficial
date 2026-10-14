const welcome = document.querySelector("#welcome");
const publicHome = document.querySelector("#public-home");
const publicNav = document.querySelector("#public-nav");
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

        if (publicHome) publicHome.hidden = true;
        if (publicNav) publicNav.hidden = true;
        if (welcome) welcome.hidden = true;
        serversSection.hidden = false;
        userArea.hidden = false;
        userArea.replaceChildren();
        const userAvatar = document.createElement("img");
        userAvatar.className = "user-avatar";
        userAvatar.alt = "";
        userAvatar.width = 36;
        userAvatar.height = 36;
        const defaultAvatarIndex = Number((BigInt(session.user.id) >> 22n) % 6n);
        userAvatar.src = session.user.avatar
            ? `https://cdn.discordapp.com/avatars/${encodeURIComponent(session.user.id)}/${encodeURIComponent(session.user.avatar)}.${session.user.avatar.startsWith("a_") ? "gif" : "png"}?size=64`
            : `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
        const sessionLabel = document.createElement("span");
        sessionLabel.textContent = `Sesión iniciada como ${session.user.username}`;
        userArea.append(userAvatar, sessionLabel);

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
