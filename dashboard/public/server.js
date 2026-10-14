const guildId = decodeURIComponent(window.location.pathname.split("/").filter(Boolean).at(-1) || "");
const categoriesOrder = ["Comunidad", "Moderación", "Servidor", "Economía y XP"];
const nav = document.querySelector("#module-nav");
const content = document.querySelector("#module-content");
const notice = document.querySelector("#notice");
let csrfToken = "";
let resources = { channels: [], roles: [] };
let configState = null;
let currentModule = "";

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function showNotice(message, isError = false) {
    notice.textContent = message;
    notice.classList.toggle("notice-error", isError);
    notice.hidden = false;
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(() => { notice.hidden = true; }, 5000);
}

async function api(url, options = {}) {
    const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) };
    if (!["GET", "HEAD"].includes((options.method || "GET").toUpperCase())) headers["x-csrf-token"] = csrfToken;
    const response = await fetch(url, { ...options, headers, credentials: "same-origin" });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) window.location.assign("/");
    if (!response.ok) throw new Error(result.error || "La solicitud no se pudo completar.");
    return result;
}

function getNested(value, key) {
    return key.split(".").reduce((cursor, part) => cursor?.[part], value);
}

function optionsFor(field) {
    if (field.type === "role" || field.type === "role-list") return resources.roles.map(role => ({ id: role.id, name: role.name }));
    if (!["channel", "channel-list", "voice", "category"].includes(field.type)) return [];
    const allowedTypes = {
        category: [4],
        voice: [2, 13],
        channel: [0, 5, 15, 16],
        "channel-list": [0, 5, 15, 16]
    }[field.type];
    const filteredTypes = field.channelTypes || allowedTypes;
    return resources.channels.filter(channel => filteredTypes.includes(channel.type)).map(channel => ({ id: channel.id, name: channel.name }));
}

function renderSetupSelect(setup, key, label, type, channelTypes) {
    const current = String(setup?.[key] || "");
    const options = optionsFor({ type, channelTypes });
    const hasCurrent = options.some(option => option.id === current);
    const stale = current && !hasCurrent ? `<option value="${escapeHtml(current)}" selected>ID guardado: ${escapeHtml(current)}</option>` : "";
    return `<label class="field"><span>${escapeHtml(label)}</span><select data-setup-field="${key}" required><option value="">Elige una opción</option>${stale}${options.map(option => `<option value="${escapeHtml(option.id)}" ${current === option.id ? "selected" : ""}>${escapeHtml(option.name)}</option>`).join("")}</select></label>`;
}

function renderSetupRows(setups) {
    if (!setups.length) return '<p class="setup-empty">Todavía no hay canales creadores configurados.</p>';
    return setups.map((setup, index) => `<section class="setup-row"><div class="setup-row-heading"><strong>Configuración ${index + 1}</strong><button class="quiet-button danger-text" type="button" data-remove-setup="${index}">Quitar</button></div><div class="setup-row-fields">${renderSetupSelect(setup, "categoryId", "Categoría", "category")}${renderSetupSelect(setup, "creatorChannelId", "Canal creador (voz)", "voice")}${renderSetupSelect(setup, "panelChannelId", "Canal del panel (texto)", "channel", [0])}<label class="field"><span>ID del mensaje del panel <em>(opcional)</em></span><input data-setup-field="panelMessageId" type="text" maxlength="40" value="${escapeHtml(setup?.panelMessageId || "")}" placeholder="Se completa al publicar el panel"></label></div></section>`).join("");
}

function readSetupRows(editor) {
    return [...editor.querySelectorAll(".setup-row")].map(row => ({
        categoryId: row.querySelector('[data-setup-field="categoryId"]').value,
        creatorChannelId: row.querySelector('[data-setup-field="creatorChannelId"]').value,
        panelChannelId: row.querySelector('[data-setup-field="panelChannelId"]').value,
        panelMessageId: row.querySelector('[data-setup-field="panelMessageId"]').value.trim() || null
    }));
}

function renderSetupsEditor(setups) {
    return `<div class="field setups-field" data-setups-editor><span>Canales creadores y paneles</span><div class="setup-rows">${renderSetupRows(setups)}</div><button class="quiet-button setup-add" type="button" data-add-setup ${setups.length >= 10 ? "disabled" : ""}>＋ Añadir configuración</button><small>Puedes gestionar hasta 10 configuraciones. El ID del mensaje se deja vacío si todavía no tienes un panel publicado.</small></div>`;
}

function renderPrestigeMap(field, value) {
    const isRoleMap = field.name === "prestigeRoles";
    const entries = value && typeof value === "object" ? value : {};
    const rows = Array.from({ length: 5 }, (_unused, index) => {
        const level = String(index + 1);
        const current = entries[level] == null ? "" : String(entries[level]);
        let control;
        if (isRoleMap) {
            const roles = optionsFor({ type: "role" });
            const hasCurrent = roles.some(role => role.id === current);
            const stale = current && !hasCurrent ? `<option value="${escapeHtml(current)}" selected>ID guardado: ${escapeHtml(current)}</option>` : "";
            control = `<select data-prestige-level="${level}" required><option value="">Elige un rol</option>${stale}${roles.map(role => `<option value="${escapeHtml(role.id)}" ${current === role.id ? "selected" : ""}>${escapeHtml(role.name)}</option>`).join("")}</select>`;
        } else {
            control = `<input data-prestige-level="${level}" type="number" min="0" step="1" value="${escapeHtml(current)}" required>`;
        }
        return `<label class="prestige-row"><strong>Prestigio ${level}</strong>${control}</label>`;
    }).join("");
    const help = field.help ? `<small>${escapeHtml(field.help)}</small>` : "";
    return `<div class="field prestige-map-field" data-prestige-map="${field.name}"><span>${escapeHtml(field.label)}</span><div class="prestige-rows">${rows}</div>${help}</div>`;
}

function renderField(field, value, prefix = "") {
    const id = `field-${prefix}${field.name}`.replace(/[^a-zA-Z0-9_-]/g, "-");
    const required = field.optional ? "" : "required";
    const safeValue = value ?? field.default ?? "";
    const help = field.help ? `<small>${escapeHtml(field.help)}</small>` : "";
    if (field.type === "setups") return renderSetupsEditor(Array.isArray(value) ? value : []);
    if (field.type === "json" && ["prestigeRoles", "prestigeRewards"].includes(field.name)) return renderPrestigeMap(field, value);
    if (field.type === "boolean") {
        return `<label class="field checkbox-field" for="${id}"><span><strong>${escapeHtml(field.label)}</strong></span><input id="${id}" name="${escapeHtml(field.name)}" type="checkbox" ${value ? "checked" : ""}></label>`;
    }
    if (field.type === "select") {
        const options = field.options.map(option => `<option value="${escapeHtml(option)}" ${safeValue === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("");
        return `<label class="field" for="${id}"><span>${escapeHtml(field.label)}</span><select id="${id}" name="${escapeHtml(field.name)}" ${required}><option value="">Elige una opción</option>${options}</select>${help}</label>`;
    }
    if (["channel", "voice", "category", "role"].includes(field.type)) {
        const options = optionsFor(field);
        const current = String(safeValue || "");
        const hasCurrent = options.some(option => option.id === current);
        const blank = field.optional ? `<option value="">Sin asignar</option>` : `<option value="">Elige una opción</option>`;
        const stale = current && !hasCurrent ? `<option value="${escapeHtml(current)}" selected>ID guardado: ${escapeHtml(current)}</option>` : "";
        return `<label class="field" for="${id}"><span>${escapeHtml(field.label)}</span><select id="${id}" name="${escapeHtml(field.name)}" ${required}>${blank}${stale}${options.map(option => `<option value="${escapeHtml(option.id)}" ${current === option.id ? "selected" : ""}>${escapeHtml(option.name)}</option>`).join("")}</select>${help}</label>`;
    }
    if (["channel-list", "role-list"].includes(field.type)) {
        const values = Array.isArray(value) ? value.map(String) : [];
        const options = optionsFor(field);
        const stale = values.filter(current => !options.some(option => option.id === current)).map(current => `<option value="${escapeHtml(current)}" selected>ID guardado: ${escapeHtml(current)}</option>`).join("");
        return `<label class="field" for="${id}"><span>${escapeHtml(field.label)}</span><select id="${id}" name="${escapeHtml(field.name)}" multiple size="5">${stale}${options.map(option => `<option value="${escapeHtml(option.id)}" ${values.includes(option.id) ? "selected" : ""}>${escapeHtml(option.name)}</option>`).join("")}</select><small>Mantén Ctrl o Cmd para seleccionar varios.</small></label>`;
    }
    if (["string-list", "json"].includes(field.type)) {
        let text = "";
        if (field.type === "string-list") text = Array.isArray(value) ? value.join("\n") : "";
        else text = JSON.stringify(value ?? {}, null, 2);
        return `<label class="field" for="${id}"><span>${escapeHtml(field.label)}</span><textarea id="${id}" name="${escapeHtml(field.name)}" rows="5" spellcheck="false" ${required}>${escapeHtml(text)}</textarea></label>`;
    }
    if (field.type === "textarea") {
        return `<label class="field" for="${id}"><span>${escapeHtml(field.label)}</span><textarea id="${id}" name="${escapeHtml(field.name)}" maxlength="${field.maxLength || 4000}" rows="5" ${required}>${escapeHtml(safeValue)}</textarea>${help}</label>`;
    }
    const inputType = field.type === "number" ? "number" : field.type === "url" ? "url" : field.type === "color" ? "text" : "text";
    const minMax = field.type === "number" ? `min="${field.min ?? 0}" ${field.max !== undefined ? `max="${field.max}"` : ""} step="1"` : "";
    return `<label class="field" for="${id}"><span>${escapeHtml(field.label)}</span><input id="${id}" name="${escapeHtml(field.name)}" type="${inputType}" value="${escapeHtml(safeValue)}" maxlength="${field.maxLength || 2000}" ${minMax} ${required}>${help}</label>`;
}

function readForm(form, fields) {
    const result = {};
    for (const field of fields) {
        if (field.type === "setups") {
            result[field.name] = readSetupRows(form.querySelector("[data-setups-editor]"));
            continue;
        }
        if (field.type === "json" && ["prestigeRoles", "prestigeRewards"].includes(field.name)) {
            const isRoleMap = field.name === "prestigeRoles";
            const map = {};
            form.querySelectorAll(`[data-prestige-map="${field.name}"] [data-prestige-level]`).forEach(input => {
                map[input.dataset.prestigeLevel] = isRoleMap ? input.value : Number(input.value);
            });
            result[field.name] = map;
            continue;
        }
        const element = form.elements.namedItem(field.name);
        if (!element) continue;
        let value;
        if (field.type === "boolean") value = element.checked;
        else if (["channel-list", "role-list"].includes(field.type)) value = [...element.selectedOptions].map(option => option.value);
        else if (field.type === "string-list") value = element.value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
        else if (field.type === "json") {
            try { value = JSON.parse(element.value); } catch { throw new Error(`${field.label}: revisa el JSON.`); }
        } else if (field.type === "number") value = Number(element.value);
        else value = element.value;
        result[field.name] = value;
    }
    return result;
}

function makeNav(modules) {
    nav.replaceChildren();
    const all = [...Object.entries(modules.configurations), ...Object.entries(modules.lists)];
    for (const category of categoriesOrder) {
        const group = all.filter(([, definition]) => definition.category === category);
        if (!group.length) continue;
        const heading = document.createElement("div");
        heading.className = "nav-heading";
        heading.textContent = category;
        nav.append(heading);
        for (const [key, definition] of group) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "nav-item";
            button.textContent = definition.title;
            button.dataset.module = key;
            button.addEventListener("click", () => renderModule(key, modules));
            nav.append(button);
        }
    }
}

function renderModule(key, modules) {
    currentModule = key;
    nav.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.module === key));
    const isList = Boolean(modules.lists[key]);
    const definition = isList ? modules.lists[key] : modules.configurations[key];
    document.querySelector("#page-title").textContent = definition.title;
    if (isList) return renderList(key, definition);

    const data = configState.configurations[key] || { configured: false };
    const formFields = definition.fields.map(field => {
        let value = getNested(data, field.name);
        if (field.type === "setups" && (!Array.isArray(value) || value.length === 0) && data.creatorChannelId && data.panelChannelId) {
            value = [{
                categoryId: data.categoryId || "",
                creatorChannelId: data.creatorChannelId,
                panelChannelId: data.panelChannelId,
                panelMessageId: data.panelMessageId || null
            }];
        }
        return renderField(field, value);
    }).join("");
    const description = definition.description || "Los cambios se guardan en la configuración del servidor y los canales y roles existentes se conservan.";
    content.innerHTML = `<article class="settings-card"><div class="card-heading"><div><div class="eyebrow">${escapeHtml(definition.category)}</div><h2>${escapeHtml(definition.title)}</h2></div><span class="status-pill ${data.configured ? "configured" : "unconfigured"}">${data.configured ? "Configurado" : "Sin configurar"}</span></div><p class="card-description">${escapeHtml(description)}</p><form id="settings-form" class="fields-grid">${formFields}<div class="form-actions"><button class="primary-button" type="submit">Guardar cambios</button></div></form></article>`;
    const setupsEditor = content.querySelector("[data-setups-editor]");
    if (setupsEditor) {
        const updateSetupRows = setups => {
            setupsEditor.querySelector(".setup-rows").innerHTML = renderSetupRows(setups);
            setupsEditor.querySelector("[data-add-setup]").disabled = setups.length >= 10;
        };
        setupsEditor.querySelector("[data-add-setup]").addEventListener("click", () => {
            const setups = readSetupRows(setupsEditor);
            if (setups.length >= 10) return;
            setups.push({ categoryId: "", creatorChannelId: "", panelChannelId: "", panelMessageId: null });
            updateSetupRows(setups);
        });
        setupsEditor.addEventListener("click", event => {
            const button = event.target.closest("[data-remove-setup]");
            if (!button) return;
            const setups = readSetupRows(setupsEditor);
            setups.splice(Number(button.dataset.removeSetup), 1);
            updateSetupRows(setups);
        });
    }
    content.querySelector("#settings-form").addEventListener("submit", async event => {
        event.preventDefault();
        const button = event.currentTarget.querySelector("button[type=submit]");
        button.disabled = true;
        try {
            const payload = readForm(event.currentTarget, definition.fields);
            const result = await api(`/api/guilds/${encodeURIComponent(guildId)}/config/${encodeURIComponent(key)}`, {
                method: "PUT", body: JSON.stringify(payload)
            });
            configState.configurations[key] = { ...result.configuration, configured: true };
            showNotice(key === "voiceConnection"
                ? "Canal guardado. El bot cambiará en unos segundos."
                : "Configuración guardada.");
            renderModule(key, modules);
        } catch (error) {
            showNotice(error.message, true);
        } finally {
            button.disabled = false;
        }
    });
}

function getRecordLabel(key, record, definition) {
    const role = record.roleId ? resources.roles.find(item => item.id === record.roleId) : null;
    const roleName = role?.name || (record.roleId ? "Rol no disponible" : "");
    if (key === "levelRewards") return `Nivel ${record.level} · ${roleName}`;
    if (key === "shopItems") return `${roleName} · ${Number(record.price || 0).toLocaleString("es-DO")} monedas`;
    if (key === "bankDonorRoles") return `${roleName} · bonificación desde ${Number(record.requiredAmount || 0).toLocaleString("es-DO")}`;
    return record.name || record[definition.identity] || roleName || (record._id ? `Registro ${String(record._id).slice(-8)}` : "Registro sin identificar");
}

function renderList(key, definition, editItem = null) {
    const records = configState.lists[key] || [];
    const editing = Boolean(editItem);
    const form = `<form id="list-form" class="fields-grid">${definition.fields.map(field => renderField(field, getNested(editItem, field.name), `${key}-`)).join("")}<div class="form-actions"><button class="primary-button" type="submit">${editing ? "Guardar elemento" : "Añadir elemento"}</button>${editing ? '<button class="quiet-button" id="cancel-edit" type="button">Cancelar</button>' : ""}</div></form>`;
    const rows = records.map(record => {
        const label = getRecordLabel(key, record, definition);
        return `<div class="record-row"><div class="record-title">${escapeHtml(label)}</div><div class="record-actions"><button type="button" class="quiet-button" data-edit="${escapeHtml(record._id)}">Editar</button><button type="button" class="quiet-button danger-text" data-delete="${escapeHtml(record._id)}">Eliminar</button></div></div>`;
    }).join("");
    content.innerHTML = `<article class="settings-card"><div class="card-heading"><div><div class="eyebrow">${escapeHtml(definition.category)}</div><h2>${escapeHtml(definition.title)}</h2></div></div><div class="records-list">${rows || '<p class="empty-state">Todavía no hay elementos configurados.</p>'}</div><div class="form-divider"></div><h3>${editing ? "Editar elemento" : "Añadir elemento"}</h3>${form}</article>`;

    content.querySelectorAll("[data-edit]").forEach(button => button.addEventListener("click", () => {
        const record = records.find(item => item._id === button.dataset.edit);
        renderList(key, definition, record);
    }));
    content.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", async () => {
        if (!window.confirm("¿Eliminar este elemento de la configuración del servidor?")) return;
        try {
            await api(`/api/guilds/${encodeURIComponent(guildId)}/lists/${encodeURIComponent(key)}/${encodeURIComponent(button.dataset.delete)}`, { method: "DELETE" });
            configState.lists[key] = records.filter(item => item._id !== button.dataset.delete);
            renderList(key, definition);
            showNotice("Elemento eliminado.");
        } catch (error) { showNotice(error.message, true); }
    }));
    content.querySelector("#list-form").addEventListener("submit", async event => {
        event.preventDefault();
        const button = event.currentTarget.querySelector("button[type=submit]");
        button.disabled = true;
        try {
            const payload = readForm(event.currentTarget, definition.fields);
            const url = `/api/guilds/${encodeURIComponent(guildId)}/lists/${encodeURIComponent(key)}${editing ? `/${encodeURIComponent(editItem._id)}` : ""}`;
            const result = await api(url, { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) });
            if (editing) configState.lists[key] = records.map(item => item._id === editItem._id ? result.item : item);
            else configState.lists[key] = [...records, result.item];
            renderList(key, definition);
            showNotice(editing ? "Elemento actualizado." : "Elemento añadido.");
        } catch (error) { showNotice(error.message, true); }
        finally { button.disabled = false; }
    });
    content.querySelector("#cancel-edit")?.addEventListener("click", () => renderList(key, definition));
}

async function initialize() {
    try {
        const sessionResult = await api("/api/me");
        if (!sessionResult.user) return window.location.assign("/");
        csrfToken = sessionResult.csrfToken;
        document.querySelector("#user-name").textContent = sessionResult.user.username;
        const [guildsResult, resourcesResult, configResult] = await Promise.all([
            api("/api/guilds"),
            api(`/api/guilds/${encodeURIComponent(guildId)}/resources`),
            api(`/api/guilds/${encodeURIComponent(guildId)}/config`)
        ]);
        const guild = guildsResult.guilds.find(item => item.id === guildId);
        document.querySelector("#server-name").textContent = guild?.name || "Servidor de Discord";
        resources = resourcesResult;
        configState = configResult;
        makeNav(configResult.modules);
        const first = [...Object.keys(configResult.modules.configurations), ...Object.keys(configResult.modules.lists)][0];
        if (first) renderModule(first, configResult.modules);
    } catch (error) {
        content.innerHTML = `<div class="loading-card error">${escapeHtml(error.message)} <a href="/">Volver a elegir servidor</a></div>`;
    }
}

document.querySelector("#logout").addEventListener("click", async () => {
    try {
        await api("/auth/logout", { method: "POST" });
        window.location.assign("/");
    } catch (error) { showNotice(error.message, true); }
});

initialize();
