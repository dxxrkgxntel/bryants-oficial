window.mountAccountMenu = function (container, user, onError = message => window.alert(message)) {
    if (!container || !user) return;
    container.replaceChildren();

    const menu = document.createElement("div");
    menu.className = "account-menu";
    const trigger = document.createElement("button");
    trigger.className = "account-trigger";
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");

    const avatar = document.createElement("img");
    avatar.className = "user-avatar";
    avatar.alt = "";
    avatar.width = 36;
    avatar.height = 36;
    const defaultAvatarIndex = Number((BigInt(user.id) >> 22n) % 6n);
    avatar.src = user.avatar
        ? `https://cdn.discordapp.com/avatars/${encodeURIComponent(user.id)}/${encodeURIComponent(user.avatar)}.${user.avatar.startsWith("a_") ? "gif" : "png"}?size=64`
        : `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
    const identity = document.createElement("span");
    identity.className = "account-identity";
    const status = document.createElement("small");
    status.textContent = "Sesión iniciada como";
    const username = document.createElement("strong");
    username.textContent = user.username;
    identity.append(status, username);
    const chevron = document.createElement("span");
    chevron.className = "account-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "⌄";
    trigger.append(avatar, identity, chevron);

    const dropdown = document.createElement("div");
    dropdown.className = "account-dropdown";
    dropdown.id = "account-dropdown";
    dropdown.setAttribute("role", "menu");
    dropdown.hidden = true;
    trigger.setAttribute("aria-controls", dropdown.id);

    const settings = document.createElement("a");
    settings.className = "account-menu-item";
    settings.href = "/settings";
    settings.setAttribute("role", "menuitem");
    settings.innerHTML = '<span>Settings</span><span aria-hidden="true">⚙</span>';
    dropdown.append(settings);

    const actions = [
        { label: "Cambiar de cuenta", action: "switch", icon: "↗" },
        { label: "Cerrar sesión", action: "logout", icon: "⇥" }
    ];
    const actionButtons = actions.map(item => {
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
    dropdown.append(...actionButtons);
    menu.append(trigger, dropdown);
    container.append(menu);

    trigger.addEventListener("click", () => {
        dropdown.hidden = !dropdown.hidden;
        trigger.setAttribute("aria-expanded", String(!dropdown.hidden));
        if (!dropdown.hidden) settings.focus();
    });
    document.addEventListener("pointerdown", event => {
        if (!menu.contains(event.target)) {
            dropdown.hidden = true;
            trigger.setAttribute("aria-expanded", "false");
        }
    });
    document.addEventListener("keydown", event => {
        const items = [settings, ...actionButtons];
        if (event.key === "Escape" && !dropdown.hidden) {
            dropdown.hidden = true;
            trigger.setAttribute("aria-expanded", "false");
            trigger.focus();
        } else if (!dropdown.hidden && ["ArrowDown", "ArrowUp"].includes(event.key) && items.includes(document.activeElement)) {
            event.preventDefault();
            const index = items.indexOf(document.activeElement);
            const direction = event.key === "ArrowDown" ? 1 : -1;
            items[(index + direction + items.length) % items.length].focus();
        }
    });

    for (const button of actionButtons) {
        button.addEventListener("click", async () => {
            for (const item of actionButtons) item.disabled = true;
            trigger.disabled = true;
            try {
                const tokenResponse = await fetch("/api/me", { credentials: "same-origin" });
                const session = await tokenResponse.json();
                const response = await fetch("/auth/logout", {
                    method: "POST",
                    headers: { "x-csrf-token": session.csrfToken || "" },
                    credentials: "same-origin"
                });
                const result = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(result.error || "No se pudo cerrar la sesión.");
                window.location.assign(button.dataset.accountAction === "switch" ? "/auth/login" : "/");
            } catch (error) {
                onError(error.message);
                for (const item of actionButtons) item.disabled = false;
                trigger.disabled = false;
            }
        });
    }
};
