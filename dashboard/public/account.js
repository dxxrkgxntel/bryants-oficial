const profileAvatar = document.querySelector("#account-profile-avatar");
const profileName = document.querySelector("#account-profile-name");
const profileDisplay = document.querySelector("#account-profile-display");
const profileId = document.querySelector("#account-profile-id");
const profileForm = document.querySelector("#account-profile-form");
const languageForm = document.querySelector("#account-language-form");
const linksContainer = document.querySelector("#account-links");
let csrfToken = "";

function setFeedback(element, message, error = false) {
    element.textContent = message;
    element.classList.toggle("error", error);
}

function addProfileLink(link = {}) {
    if (linksContainer.children.length >= 5) return;
    const row = document.createElement("div");
    row.className = "account-link-row";
    const label = document.createElement("input");
    label.name = "link-label";
    label.maxLength = 40;
    label.placeholder = "Nombre del enlace";
    label.value = link.label || "";
    label.setAttribute("aria-label", "Nombre del enlace");
    const url = document.createElement("input");
    url.name = "link-url";
    url.type = "url";
    url.maxLength = 300;
    url.placeholder = "https://ejemplo.com";
    url.value = link.url || "";
    url.setAttribute("aria-label", "Dirección del enlace");
    const remove = document.createElement("button");
    remove.className = "quiet-button danger-text";
    remove.type = "button";
    remove.textContent = "Quitar";
    remove.addEventListener("click", () => {
        row.remove();
        document.querySelector("#account-add-link").disabled = linksContainer.children.length >= 5;
    });
    row.append(label, url, remove);
    linksContainer.append(row);
}

async function api(path, options = {}) {
    const response = await fetch(path, {
        credentials: "same-origin",
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.method === "PUT" || options.method === "POST" ? { "x-csrf-token": csrfToken } : {}),
            ...options.headers
        }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "No se pudo guardar la configuración.");
    return result;
}

async function loadAccountSettings() {
    try {
        const [session, settings, rewards] = await Promise.all([api("/api/me"), api("/api/account/settings"), api("/api/account/rewards")]);
        if (!session.user) return window.location.assign("/");
        csrfToken = session.csrfToken || "";
        window.mountAccountMenu(document.querySelector("#account-menu-host"), session.user);

        const user = session.user;
        profileName.dataset.localeFixed = "true";
        profileDisplay.dataset.localeFixed = "true";
        profileId.dataset.localeFixed = "true";
        const defaultAvatarIndex = Number((BigInt(user.id) >> 22n) % 6n);
        profileAvatar.src = user.avatar
            ? `https://cdn.discordapp.com/avatars/${encodeURIComponent(user.id)}/${encodeURIComponent(user.avatar)}.${user.avatar.startsWith("a_") ? "gif" : "png"}?size=128`
            : `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
        profileName.textContent = user.username;
        profileDisplay.textContent = user.globalName || user.username;
        profileId.textContent = user.id;
        document.documentElement.lang = settings.locale;
        window.dashboardI18n?.setLocale(settings.locale);
        document.querySelector("#account-bio").value = settings.bio;
        document.querySelector("#bio-count").textContent = settings.bio.length;
        document.querySelector("#account-locale").value = settings.locale;
        settings.links.forEach(addProfileLink);
        document.querySelector("#account-add-link").disabled = settings.links.length >= 5;
        document.querySelector("#referral-count").textContent = rewards.referralCount.toLocaleString(settings.locale);
        document.querySelector("#vote-count").textContent = rewards.voteCount.toLocaleString(settings.locale);
        document.querySelector("#referral-link").value = rewards.referralUrl;
        document.querySelector("#topgg-vote").href = rewards.topggUrl;
        const rewardNotes = [];
        if (rewards.referralConfigured) rewardNotes.push(window.dashboardI18n.translate("Cada referido válido da {amount} monedas en el servidor donde se instala el bot.").replace("{amount}", rewards.referralReward.toLocaleString(settings.locale)));
        else rewardNotes.push(window.dashboardI18n.translate("Los referidos se activarán cuando se registre la URL de retorno OAuth en Discord Developer Portal."));
        if (rewards.voteConfigured) rewardNotes.push(window.dashboardI18n.translate("Cada voto verificado da {amount} monedas en el servidor configurado.").replace("{amount}", rewards.voteReward.toLocaleString(settings.locale)));
        else rewardNotes.push(window.dashboardI18n.translate("Las recompensas por votar se activarán al configurar el webhook de Top.gg y el servidor de pago en el hosting."));
        document.querySelector("#rewards-description").textContent = rewardNotes.join(" ");
    } catch (error) {
        if (error.message.includes("Inicia sesión")) return window.location.assign("/");
        setFeedback(document.querySelector("#profile-feedback"), error.message, true);
    }
}

document.querySelector("#account-bio").addEventListener("input", event => {
    document.querySelector("#bio-count").textContent = event.target.value.length;
});

document.querySelector("#account-add-link").addEventListener("click", event => {
    addProfileLink();
    event.currentTarget.disabled = linksContainer.children.length >= 5;
});

document.querySelector("#copy-referral").addEventListener("click", async event => {
    const button = event.currentTarget;
    try {
        await navigator.clipboard.writeText(document.querySelector("#referral-link").value);
        button.textContent = "Copiado";
        window.setTimeout(() => { button.textContent = "Copiar"; }, 1800);
    } catch {
        document.querySelector("#referral-link").select();
        document.execCommand("copy");
    }
});

linksContainer.addEventListener("input", () => {
    document.querySelector("#account-add-link").disabled = linksContainer.children.length >= 5;
});

profileForm.addEventListener("submit", async event => {
    event.preventDefault();
    const feedback = document.querySelector("#profile-feedback");
    const button = profileForm.querySelector("button[type=submit]");
    button.disabled = true;
    setFeedback(feedback, "Guardando…");
    const links = [...linksContainer.querySelectorAll(".account-link-row")].map(row => ({
        label: row.querySelector('[name="link-label"]').value,
        url: row.querySelector('[name="link-url"]').value
    }));
    try {
        await api("/api/account/settings", {
            method: "PUT",
            body: JSON.stringify({
                bio: document.querySelector("#account-bio").value,
                links
            })
        });
        setFeedback(feedback, "Perfil guardado.");
    } catch (error) {
        setFeedback(feedback, error.message, true);
    } finally {
        button.disabled = false;
    }
});

languageForm.addEventListener("submit", async event => {
    event.preventDefault();
    const feedback = document.querySelector("#language-feedback");
    const button = languageForm.querySelector("button[type=submit]");
    const localeSelect = document.querySelector("#account-locale");
    button.disabled = true;
    localeSelect.disabled = true;
    setFeedback(feedback, "Guardando…");
    try {
        await api("/api/account/settings", {
            method: "PUT",
            body: JSON.stringify({
                locale: localeSelect.value
            })
        });
        const locale = localeSelect.value;
        window.dashboardI18n?.setLocale(locale);
        setFeedback(feedback, window.dashboardI18n?.translate("Idioma guardado.") || "Idioma guardado.");
    } catch (error) {
        localeSelect.value = window.dashboardI18n?.locale || "es";
        setFeedback(feedback, error.message, true);
    } finally {
        button.disabled = false;
        localeSelect.disabled = false;
    }
});

document.querySelector("#account-locale").addEventListener("change", () => {
    languageForm.requestSubmit();
});

document.querySelectorAll(".account-settings-nav-item").forEach(link => link.addEventListener("click", () => {
    document.querySelectorAll(".account-settings-nav-item").forEach(item => {
        item.classList.toggle("active", item === link);
        if (item === link) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
    });
}));

document.querySelector("#account-logout").addEventListener("click", async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
        await api("/auth/logout", { method: "POST" });
        window.location.assign("/");
    } catch (error) {
        button.disabled = false;
        setFeedback(document.querySelector("#profile-feedback"), error.message, true);
    }
});

loadAccountSettings();
