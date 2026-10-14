const profileAvatar = document.querySelector("#account-profile-avatar");
const profileName = document.querySelector("#account-profile-name");
const profileDisplay = document.querySelector("#account-profile-display");
const profileId = document.querySelector("#account-profile-id");
const profileForm = document.querySelector("#account-profile-form");
const linksContainer = document.querySelector("#account-links");
const backgroundFile = document.querySelector("#background-file");
const backgroundBlur = document.querySelector("#background-blur");
const appearancePreview = document.querySelector("#appearance-preview");
let csrfToken = "";
let hasCustomBackground = false;
let previewObjectUrl = null;

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
            ...(options.method === "PUT" || options.method === "POST" || options.method === "DELETE" ? { "x-csrf-token": csrfToken } : {}),
            ...options.headers
        }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "No se pudo guardar la configuración.");
    return result;
}

async function loadAccountSettings() {
    try {
        const [session, settings, rewards, appearance] = await Promise.all([api("/api/me"), api("/api/account/settings"), api("/api/account/rewards"), api("/api/account/appearance")]);
        if (!session.user) return window.location.assign("/");
        csrfToken = session.csrfToken || "";
        window.mountAccountMenu(document.querySelector("#account-menu-host"), session.user);
        hasCustomBackground = appearance.hasCustomBackground;
        backgroundBlur.value = appearance.backgroundBlur;
        document.querySelector("#background-blur-value").textContent = `${appearance.backgroundBlur} px`;
        window.applyDashboardAppearance?.(appearance);
        updateAppearancePreview();

        const user = session.user;
        const defaultAvatarIndex = Number((BigInt(user.id) >> 22n) % 6n);
        profileAvatar.src = user.avatar
            ? `https://cdn.discordapp.com/avatars/${encodeURIComponent(user.id)}/${encodeURIComponent(user.avatar)}.${user.avatar.startsWith("a_") ? "gif" : "png"}?size=128`
            : `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
        profileName.textContent = user.username;
        profileDisplay.textContent = user.globalName || user.username;
        profileId.textContent = user.id;
        document.querySelector("#account-bio").value = settings.bio;
        document.querySelector("#bio-count").textContent = settings.bio.length;
        settings.links.forEach(addProfileLink);
        document.querySelector("#account-add-link").disabled = settings.links.length >= 5;
        document.querySelector("#referral-count").textContent = rewards.referralCount.toLocaleString("es");
        document.querySelector("#vote-count").textContent = rewards.voteCount.toLocaleString("es");
        document.querySelector("#referral-link").value = rewards.referralUrl;
        document.querySelector("#topgg-vote").href = rewards.topggUrl;
        const rewardNotes = [];
        if (rewards.referralConfigured) rewardNotes.push(`Cada referido válido da ${rewards.referralReward.toLocaleString("es")} monedas en el servidor donde se instala el bot.`);
        else rewardNotes.push("Los referidos se activarán cuando se registre la URL de retorno OAuth en Discord Developer Portal.");
        if (rewards.voteConfigured) rewardNotes.push(`Cada voto verificado da ${rewards.voteReward.toLocaleString("es")} monedas en el servidor configurado.`);
        else rewardNotes.push("Las recompensas por votar se activarán al configurar el webhook de Top.gg y el servidor de pago en el hosting.");
        document.querySelector("#rewards-description").textContent = rewardNotes.join(" ");
    } catch (error) {
        if (error.message.includes("Inicia sesión")) return window.location.assign("/");
        setFeedback(document.querySelector("#profile-feedback"), error.message, true);
    }
}

function updateAppearancePreview() {
    if (!appearancePreview) return;
    const source = previewObjectUrl || (hasCustomBackground ? `/api/account/background-image?v=${Date.now()}` : "/dashboard-gaming-background.png");
    appearancePreview.style.backgroundImage = `linear-gradient(110deg, #0a071170, #0a071140), url("${source}")`;
    appearancePreview.style.setProperty("--preview-blur", `${backgroundBlur.value}px`);
}

backgroundBlur.addEventListener("input", () => {
    document.querySelector("#background-blur-value").textContent = `${backgroundBlur.value} px`;
    updateAppearancePreview();
});

backgroundFile.addEventListener("change", () => {
    const file = backgroundFile.files?.[0];
    if (!file) return;
    const feedback = document.querySelector("#appearance-feedback");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        backgroundFile.value = "";
        setFeedback(feedback, "Elige una imagen PNG, JPG o WebP.", true);
        return;
    }
    if (file.size > 3 * 1024 * 1024) {
        backgroundFile.value = "";
        setFeedback(feedback, "La imagen no puede superar los 3 MB.", true);
        return;
    }
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = URL.createObjectURL(file);
    updateAppearancePreview();
    setFeedback(feedback, "Vista previa lista. Guarda para aplicar el fondo.");
});

document.querySelector("#save-appearance").addEventListener("click", async event => {
    const button = event.currentTarget;
    const feedback = document.querySelector("#appearance-feedback");
    button.disabled = true;
    setFeedback(feedback, "Guardando apariencia…");
    try {
        const file = backgroundFile.files?.[0];
        if (file) {
            const response = await fetch("/api/account/background", {
                method: "PUT", credentials: "same-origin", body: file,
                headers: { "Content-Type": "application/octet-stream", "x-csrf-token": csrfToken }
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "No se pudo subir la imagen.");
            hasCustomBackground = true;
            backgroundFile.value = "";
            if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
            previewObjectUrl = null;
        }
        const appearance = await api("/api/account/appearance", {
            method: "PUT", body: JSON.stringify({ backgroundBlur: Number(backgroundBlur.value) })
        });
        window.applyDashboardAppearance?.({ ...appearance, hasCustomBackground });
        updateAppearancePreview();
        setFeedback(feedback, "Apariencia guardada.");
    } catch (error) {
        setFeedback(feedback, error.message, true);
    } finally { button.disabled = false; }
});

document.querySelector("#reset-background").addEventListener("click", async event => {
    const button = event.currentTarget;
    const feedback = document.querySelector("#appearance-feedback");
    button.disabled = true;
    try {
        const result = await api("/api/account/background", { method: "DELETE" });
        hasCustomBackground = result.hasCustomBackground;
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = null;
        backgroundFile.value = "";
        const appearance = await api("/api/account/appearance", {
            method: "PUT", body: JSON.stringify({ backgroundBlur: Number(backgroundBlur.value) })
        });
        window.applyDashboardAppearance?.({ ...appearance, hasCustomBackground });
        updateAppearancePreview();
        setFeedback(feedback, "Fondo predeterminado restaurado.");
    } catch (error) {
        setFeedback(feedback, error.message, true);
    } finally { button.disabled = false; }
});

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
