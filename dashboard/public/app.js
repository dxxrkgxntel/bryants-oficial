const welcome = document.querySelector("#welcome");
const publicHome = document.querySelector("#public-home");
const publicNav = document.querySelector("#public-nav");
const serversSection = document.querySelector("#servers-section");
const serversList = document.querySelector("#servers");
const userArea = document.querySelector("#user-area");
let csrfToken = "";

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
        csrfToken = session.csrfToken || "";

        document.body.classList.add("server-selection");
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
        const accountMenu = document.createElement("div");
        accountMenu.className = "account-menu";
        const accountTrigger = document.createElement("button");
        accountTrigger.className = "account-trigger";
        accountTrigger.type = "button";
        accountTrigger.setAttribute("aria-haspopup", "menu");
        accountTrigger.setAttribute("aria-expanded", "false");
        const sessionLabel = document.createElement("span");
        sessionLabel.textContent = `Sesión iniciada como ${session.user.username}`;
        const accountChevron = document.createElement("span");
        accountChevron.className = "account-chevron";
        accountChevron.setAttribute("aria-hidden", "true");
        accountChevron.textContent = "⌄";
        accountTrigger.append(userAvatar, sessionLabel, accountChevron);

        const accountDropdown = document.createElement("div");
        accountDropdown.className = "account-dropdown";
        accountDropdown.id = "account-dropdown";
        accountDropdown.setAttribute("role", "menu");
        accountDropdown.hidden = true;
        accountTrigger.setAttribute("aria-controls", accountDropdown.id);
        const accountActions = [
            { label: "Cambiar de cuenta", action: "switch", icon: "↗" },
            { label: "Cerrar sesión", action: "logout", icon: "⇥" }
        ];
        const actionButtons = accountActions.map(item => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "account-menu-item";
            button.setAttribute("role", "menuitem");
            button.dataset.accountAction = item.action;
            const label = document.createElement("span");
            label.textContent = item.label;
            const icon = document.createElement("span");
            icon.setAttribute("aria-hidden", "true");
            icon.textContent = item.icon;
            button.append(label, icon);
            return button;
        });
        accountDropdown.append(...actionButtons);
        accountMenu.append(accountTrigger, accountDropdown);
        userArea.append(accountMenu);

        accountTrigger.addEventListener("click", () => {
            accountDropdown.hidden = !accountDropdown.hidden;
            accountTrigger.setAttribute("aria-expanded", String(!accountDropdown.hidden));
            if (!accountDropdown.hidden) actionButtons[0].focus();
        });
        document.addEventListener("pointerdown", event => {
            if (!accountMenu.contains(event.target)) {
                accountDropdown.hidden = true;
                accountTrigger.setAttribute("aria-expanded", "false");
            }
        });
        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && !accountDropdown.hidden) {
                accountDropdown.hidden = true;
                accountTrigger.setAttribute("aria-expanded", "false");
                accountTrigger.focus();
            } else if (!accountDropdown.hidden && ["ArrowDown", "ArrowUp"].includes(event.key) && actionButtons.includes(document.activeElement)) {
                event.preventDefault();
                const currentIndex = actionButtons.indexOf(document.activeElement);
                const direction = event.key === "ArrowDown" ? 1 : -1;
                actionButtons[(currentIndex + direction + actionButtons.length) % actionButtons.length].focus();
            }
        });
        for (const button of actionButtons) {
            button.addEventListener("click", async () => {
                for (const item of actionButtons) item.disabled = true;
                accountTrigger.disabled = true;
                try {
                    const logoutResponse = await fetch("/auth/logout", {
                        method: "POST",
                        headers: { "x-csrf-token": csrfToken },
                        credentials: "same-origin"
                    });
                    const result = await logoutResponse.json().catch(() => ({}));
                    if (!logoutResponse.ok) throw new Error(result.error || "No se pudo cerrar la sesión.");
                    window.location.assign(button.dataset.accountAction === "switch" ? "/auth/login" : "/");
                } catch (error) {
                    showError(error.message);
                    for (const item of actionButtons) item.disabled = false;
                    accountTrigger.disabled = false;
                }
            });
        }

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
