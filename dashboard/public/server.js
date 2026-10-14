const guildId = decodeURIComponent(window.location.pathname.split("/").filter(Boolean).at(-1) || "");
const categoriesOrder = ["Comunidad", "Moderación", "Servidor", "Economía y XP"];
const nav = document.querySelector("#module-nav");
const content = document.querySelector("#module-content");
const notice = document.querySelector("#notice");
let csrfToken = "";
let resources = { channels: [], roles: [] };
let configState = null;
let currentModule = "";
let activeGuild = null;
let currentModules = null;
let favoritesOnly = false;
let activeFormGuard = null;
let favoriteModules = new Set();
let templatePopoverListenerInstalled = false;

function loadFavorites() {
    try {
        const stored = JSON.parse(localStorage.getItem(`bryants-dashboard-favorites:${guildId}`) || "[]");
        favoriteModules = new Set(Array.isArray(stored) ? stored.filter(key => typeof key === "string") : []);
    } catch {
        favoriteModules = new Set();
    }
}

function saveFavorites() {
    try { localStorage.setItem(`bryants-dashboard-favorites:${guildId}`, JSON.stringify([...favoriteModules])); } catch { /* Storage may be disabled by the browser. */ }
}

function normalizeSearch(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}

function applyModuleFilter() {
    const query = normalizeSearch(document.querySelector("#module-search")?.value);
    let visibleCount = 0;
    nav.querySelectorAll(".nav-entry").forEach(entry => {
        const visible = (!favoritesOnly || favoriteModules.has(entry.dataset.module))
            && (!query || normalizeSearch(entry.dataset.search).includes(query));
        entry.hidden = !visible;
        if (visible) visibleCount += 1;
    });
    nav.querySelectorAll(".nav-heading").forEach(heading => {
        heading.hidden = ![...nav.querySelectorAll(".nav-entry")].some(entry => entry.dataset.group === heading.dataset.category && !entry.hidden);
    });
    const homeButton = nav.querySelector('[data-module="__home"]');
    if (homeButton) homeButton.hidden = favoritesOnly || Boolean(query);
    const empty = nav.querySelector(".nav-empty");
    if (empty) {
        empty.hidden = visibleCount > 0;
        empty.textContent = favoritesOnly && favoriteModules.size === 0
            ? "Aún no tienes favoritos en este servidor."
            : favoritesOnly ? "No hay favoritos que coincidan con la búsqueda." : "No hay módulos que coincidan.";
    }
}

function formSnapshot(form, fields) {
    try { return JSON.stringify(readForm(form, fields)); } catch { return null; }
}

function formIsDirty() {
    return Boolean(activeFormGuard?.form.isConnected && formSnapshot(activeFormGuard.form, activeFormGuard.fields) !== activeFormGuard.baseline);
}

function registerFormGuard(form, fields) {
    const indicator = form.querySelector(".unsaved-indicator");
    const guard = { form, fields, baseline: formSnapshot(form, fields), update: null };
    guard.update = () => {
        const dirty = formSnapshot(form, fields) !== guard.baseline;
        if (indicator) indicator.hidden = !dirty;
        form.classList.toggle("has-unsaved-changes", dirty);
    };
    activeFormGuard = guard;
    form.addEventListener("input", guard.update);
    form.addEventListener("change", guard.update);
    form.addEventListener("click", event => {
        if (event.target.closest("[data-add-setup], [data-remove-setup], [data-add-config-button], [data-remove-config-button]")) window.setTimeout(guard.update, 0);
    });
}

function confirmDiscardChanges() {
    if (!formIsDirty()) return true;
    if (!window.confirm("Tienes cambios sin guardar. ¿Quieres descartarlos y continuar?")) return false;
    activeFormGuard = null;
    return true;
}

function navigateToHome() {
    if (!confirmDiscardChanges()) return;
    activeFormGuard = null;
    renderHome(activeGuild, currentModules);
}

function navigateToModule(key, modules = currentModules) {
    if (!confirmDiscardChanges()) return;
    activeFormGuard = null;
    renderModule(key, modules);
}

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

function setSaveFeedback(form, message, state = "") {
    const feedback = form?.querySelector(".save-feedback");
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = `save-feedback${state ? ` ${state}` : ""}`;
}

function showSavedState(form) {
    const button = form?.querySelector('button[type="submit"]');
    if (button) {
        const originalText = button.dataset.idleText || button.textContent;
        button.dataset.idleText = originalText;
        button.disabled = false;
        button.textContent = "Guardado ✓";
        window.setTimeout(() => {
            if (!button.isConnected) return;
            button.textContent = originalText;
        }, 2200);
    }
    setSaveFeedback(form, "Cambios guardados", "success");
}

function renderHome(guild, modules) {
    currentModule = "__home";
    nav.querySelectorAll(".nav-item").forEach(button => {
        const active = button.dataset.module === "__home";
        button.classList.toggle("active", active);
        if (active) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
    });
    const entries = [...Object.entries(modules.configurations), ...Object.entries(modules.lists)];
    const total = entries.length;
    const isModuleConfigured = key => {
        if (modules.lists[key]) return (configState.lists[key] || []).length > 0;
        return Boolean(configState.configurations[key]?.configured);
    };
    const configured = entries.filter(([key]) => isModuleConfigured(key)).length;
    const pendingEntries = entries.filter(([key]) => !isModuleConfigured(key));
    const categories = categoriesOrder.map(category => {
        const group = entries.filter(([, definition]) => definition.category === category);
        if (!group.length) return "";
        const ready = group.filter(([key]) => isModuleConfigured(key)).length;
        const percent = Math.round(ready / group.length * 100);
        const firstModule = group[0][0];
        const previewEntries = group.filter(([key]) => !isModuleConfigured(key)).slice(0, 3);
        const visibleEntries = previewEntries.length ? previewEntries : group.slice(0, 3);
        const preview = visibleEntries.map(([key, definition]) =>
            `<button class="overview-module-link${isModuleConfigured(key) ? " is-configured" : " is-pending"}" type="button" data-overview-module="${escapeHtml(key)}">${escapeHtml(definition.title)}${isModuleConfigured(key) ? "" : " · pendiente"}</button>`
        ).join("");
        const extraPending = Math.max(0, group.filter(([key]) => !isModuleConfigured(key)).length - visibleEntries.length);
        const extra = extraPending ? `<span class="overview-more">+${extraPending} pendientes</span>` : (!previewEntries.length && group.length > 3 ? `<span class="overview-more">+${group.length - 3} sistemas</span>` : "");
        return `<article class="overview-card"><div class="overview-card-top"><span class="eyebrow">${escapeHtml(category)}</span><span class="overview-count">${ready}/${group.length}</span></div><div class="overview-progress"><span style="width:${percent}%"></span></div><div class="overview-module-links">${preview}${extra}</div><button class="overview-open" type="button" data-overview-module="${escapeHtml(firstModule)}">Explorar sección <span aria-hidden="true">→</span></button></article>`;
    }).join("");
    const avatar = guild?.icon
        ? `<img src="${escapeHtml(guild.icon)}" alt="" width="64" height="64">`
        : `<span aria-hidden="true">${escapeHtml((guild?.name || "S").trim().slice(0, 2).toUpperCase())}</span>`;
    document.querySelector("#page-title").textContent = "Inicio";
    const pendingSummary = pendingEntries.length
        ? `<section class="overview-pending"><div><span class="overview-pending-icon" aria-hidden="true">✦</span><div><strong>${pendingEntries.length} ${pendingEntries.length === 1 ? "sistema pendiente" : "sistemas pendientes"}</strong><small>Completa su configuración para dejar todo a tu gusto.</small></div></div><div class="overview-pending-links">${pendingEntries.slice(0, 5).map(([key, definition]) => `<button class="overview-pending-link" type="button" data-overview-module="${escapeHtml(key)}">${escapeHtml(definition.title)}<span>Configurar →</span></button>`).join("")}${pendingEntries.length > 5 ? `<span class="overview-more">y ${pendingEntries.length - 5} más</span>` : ""}</div></section>`
        : `<section class="overview-all-ready"><span aria-hidden="true">✓</span><div><strong>¡Todo está configurado!</strong><small>Tus sistemas principales ya están listos.</small></div></section>`;
    content.innerHTML = `<div class="overview-page"><section class="overview-hero"><div class="overview-server-mark">${avatar}</div><div class="overview-welcome"><div class="eyebrow">TU ESPACIO DE TRABAJO</div><h2>Todo listo para tu comunidad.</h2><p>Administra los sistemas de <strong>${escapeHtml(guild?.name || "tu servidor")}</strong> desde un solo lugar.</p></div><div class="overview-hero-glow" aria-hidden="true"></div></section><section class="overview-stats" aria-label="Resumen del servidor"><article><span>Configurados</span><strong>${configured}<small> / ${total}</small></strong></article><article><span>Por configurar</span><strong>${pendingEntries.length}</strong></article><article><span>Servidor</span><strong class="overview-server-name">${escapeHtml(guild?.name || "Discord")}</strong></article></section>${pendingSummary}<div class="overview-section-title"><div><div class="eyebrow">PANEL DE CONTROL</div><h3>Explora tus sistemas</h3></div><span>Elige una sección para empezar</span></div><section class="overview-grid">${categories}</section></div>`;
    content.querySelectorAll("[data-overview-module]").forEach(button => button.addEventListener("click", () => navigateToModule(button.dataset.overviewModule, modules)));
    const homeImage = content.querySelector(".overview-server-mark img");
    homeImage?.addEventListener("error", () => {
        const fallback = document.createElement("span");
        fallback.setAttribute("aria-hidden", "true");
        fallback.textContent = (guild?.name || "S").trim().slice(0, 2).toUpperCase();
        homeImage.replaceWith(fallback);
    }, { once: true });
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
    if (field.type === "section") return `<div class="form-section-heading">${escapeHtml(field.label)}</div>`;
    const id = `field-${prefix}${field.name}`.replace(/[^a-zA-Z0-9_-]/g, "-");
    const required = field.optional ? "" : "required";
    const safeValue = value ?? field.default ?? "";
    const help = field.help ? `<small>${escapeHtml(field.help)}</small>` : "";
    if (field.type === "setups") return renderSetupsEditor(Array.isArray(value) ? value : []);
    if (field.type === "buttons") return renderButtonEditor(field, Array.isArray(value) ? value : [], prefix);
    if (field.type === "json" && ["prestigeRoles", "prestigeRewards"].includes(field.name)) return renderPrestigeMap(field, value);
    if (field.type === "boolean") {
        return `<label class="field checkbox-field" for="${id}"><span><strong>${escapeHtml(field.label)}</strong>${help}</span><input id="${id}" name="${escapeHtml(field.name)}" type="checkbox" ${safeValue ? "checked" : ""}></label>`;
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
        const control = `<textarea id="${id}" name="${escapeHtml(field.name)}" maxlength="${field.maxLength || 4000}" rows="5" ${required}>${escapeHtml(safeValue)}</textarea>`;
        return renderTextField(field, id, control, help);
    }
    const inputType = field.type === "number" ? "number" : field.type === "url" ? "url" : field.type === "color" ? "text" : "text";
    const minMax = field.type === "number" ? `min="${field.min ?? 0}" ${field.max !== undefined ? `max="${field.max}"` : ""} step="1"` : "";
    const control = `<input id="${id}" name="${escapeHtml(field.name)}" type="${inputType}" value="${escapeHtml(safeValue)}" maxlength="${field.maxLength || 2000}" ${minMax} ${required}>`;
    return renderTextField(field, id, control, help);
}

function renderButtonEditor(field, buttons, prefix = "") {
    const roles = resources.roles.map(role => `<option value="${escapeHtml(role.id)}">${escapeHtml(role.name)}</option>`).join("");
    const rows = buttons.map((button, index) => `<div class="config-button-row" data-config-button>
        <div class="config-button-row-heading"><strong>Botón ${index + 1}</strong><button type="button" class="quiet-button danger-text" data-remove-config-button>Eliminar</button></div>
        <div class="config-button-fields">
            <label class="field"><span>Nombre del botón</span><input data-button-label maxlength="80" value="${escapeHtml(button.label || "")}" placeholder="Ej. Reclamar rol"></label>
            <label class="field"><span>Emoji (opcional)</span><input data-button-emoji maxlength="100" value="${escapeHtml(button.emoji || "")}" placeholder="🎉 o <:emoji:id>"></label>
            <label class="field"><span>Acción</span><select data-button-action><option value="link" ${button.action === "link" ? "selected" : ""}>Abrir enlace</option><option value="role" ${button.action === "role" ? "selected" : ""}>Reclamar rol</option></select></label>
            <label class="field button-role-field" ${button.action === "role" ? "" : "hidden"}><span>Rol que se reclama</span><select data-button-role><option value="">Elige un rol</option>${roles.replace(`value="${escapeHtml(button.roleId || "")}"`, `value="${escapeHtml(button.roleId || "")}" selected`)}</select></label>
            <label class="field button-link-field" ${button.action === "link" || !button.action ? "" : "hidden"}><span>URL</span><input data-button-url type="url" value="${escapeHtml(button.url || "")}" placeholder="https://ejemplo.com"></label>
        </div>
    </div>`).join("");
    return `<section class="field button-list-field" data-button-list="${escapeHtml(field.name)}" data-prefix="${escapeHtml(prefix)}"><div class="button-list-heading"><div><strong>${escapeHtml(field.label)}</strong>${field.help ? `<small>${escapeHtml(field.help)}</small>` : ""}</div><button class="quiet-button" type="button" data-add-config-button>Añadir botón</button></div><div class="config-button-rows">${rows || '<p class="setup-empty">Aún no hay botones. Puedes añadir hasta cinco.</p>'}</div></section>`;
}

function readButtonRows(editor) {
    return [...editor.querySelectorAll("[data-config-button]")].map(row => ({
        label: row.querySelector("[data-button-label]").value,
        emoji: row.querySelector("[data-button-emoji]").value,
        action: row.querySelector("[data-button-action]").value,
        roleId: row.querySelector("[data-button-role]").value,
        url: row.querySelector("[data-button-url]").value
    }));
}

function setupButtonEditors(form, definition) {
    form.querySelectorAll("[data-button-list]").forEach(editor => {
        const field = definition.fields.find(item => item.name === editor.dataset.buttonList);
        const rows = editor.querySelector(".config-button-rows");
        const draw = buttons => {
            rows.innerHTML = renderButtonEditor(field, buttons, editor.dataset.prefix).match(/<div class="config-button-rows">([\s\S]*)<\/div><\/section>$/)?.[1] || "";
            editor.querySelector("[data-add-config-button]").disabled = buttons.length >= 5;
        };
        editor.addEventListener("click", event => {
            if (event.target.closest("[data-add-config-button]")) {
                const buttons = readButtonRows(editor);
                if (buttons.length < 5) { buttons.push({ action: "link" }); draw(buttons); }
                return;
            }
            if (event.target.closest("[data-remove-config-button]")) {
                const button = event.target.closest("[data-config-button]");
                const buttons = readButtonRows(editor);
                buttons.splice([...editor.querySelectorAll("[data-config-button]")].indexOf(button), 1);
                draw(buttons);
            }
        });
        editor.addEventListener("change", event => {
            if (!event.target.matches("[data-button-action]")) return;
            const row = event.target.closest("[data-config-button]");
            const isRole = event.target.value === "role";
            row.querySelector(".button-role-field").hidden = !isRole;
            row.querySelector(".button-link-field").hidden = isRole;
        });
        editor.querySelector("[data-add-config-button]").disabled = editor.querySelectorAll("[data-config-button]").length >= 5;
    });
}

function renderTextField(field, id, control, help) {
    if (!field.templateComposer) return `<label class="field" for="${id}"><span>${escapeHtml(field.label)}</span>${control}${help}</label>`;
    const variables = escapeHtml(JSON.stringify(field.templateVariables || []));
    return `<div class="field template-field"><label for="${id}">${escapeHtml(field.label)}</label>${control}<div class="template-composer" data-template-composer data-variables="${variables}"><div class="template-popover" data-template-popover hidden></div><div class="template-toolbar" role="toolbar" aria-label="Insertar en ${escapeHtml(field.label)}"><button type="button" data-composer-action="emoji" aria-label="Insertar emoji" title="Emoji">☺</button><button type="button" data-composer-action="channel" aria-label="Insertar canal" title="Canal">#</button><button type="button" data-composer-action="role" aria-label="Insertar rol" title="Rol">🛡</button><button type="button" data-composer-action="variable" aria-label="Insertar variable" title="Variable dinámica">{ }</button></div></div>${help}</div>`;
}

function setupTemplateComposers(form) {
    const emojis = ["👋", "🎉", "✨", "💜", "🎂", "🚀", "⭐", "🎁", "🥳", "📢", "🔥", "🏆"];
    form.querySelectorAll("[data-template-composer]").forEach(composer => {
        const target = composer.parentElement.querySelector("input, textarea");
        const popover = composer.querySelector("[data-template-popover]");
        if (!target || !popover) return;
        let selectionStart = 0;
        let selectionEnd = 0;
        const rememberSelection = () => {
            selectionStart = target.selectionStart ?? target.value.length;
            selectionEnd = target.selectionEnd ?? selectionStart;
        };
        ["keyup", "click", "select", "focus"].forEach(eventName => target.addEventListener(eventName, rememberSelection));
        const close = () => { popover.hidden = true; popover.replaceChildren(); };
        const insert = value => {
            target.focus();
            if (typeof target.setRangeText === "function") target.setRangeText(value, selectionStart, selectionEnd, "end");
            else target.value = `${target.value.slice(0, selectionStart)}${value}${target.value.slice(selectionEnd)}`;
            rememberSelection();
            target.dispatchEvent(new Event("input", { bubbles: true }));
            close();
        };
        const renderItems = (items, query = "") => {
            const filtered = items.filter(item => normalizeSearch(`${item.token} ${item.label} ${item.description}`)
                .includes(normalizeSearch(query)));
            const rows = filtered.map(item => `<button type="button" class="template-option" data-insert-value="${escapeHtml(item.value)}"><span class="template-option-icon">${escapeHtml(item.icon || "{ }")}</span><span><strong>${escapeHtml(item.token || item.label)}</strong><small>${escapeHtml(item.description || item.label)}</small></span></button>`).join("");
            const list = popover.querySelector(".template-options");
            if (list) list.innerHTML = rows || '<p class="template-empty">No hay resultados.</p>';
        };
        composer.querySelectorAll("[data-composer-action]").forEach(button => button.addEventListener("click", () => {
            rememberSelection();
            const action = button.dataset.composerAction;
            if (!popover.hidden && popover.dataset.action === action) return close();
            popover.dataset.action = action;
            const variables = JSON.parse(composer.dataset.variables || "[]");
            let items = [];
            let heading = "";
            let searchable = true;
            if (action === "variable") {
                heading = "Variables dinámicas";
                items = variables.map(variable => ({ token: variable.token, label: variable.label, description: variable.description, value: variable.token }));
            } else if (action === "channel") {
                heading = "Insertar canal";
                items = resources.channels.filter(channel => [0, 5].includes(channel.type)).map(channel => ({ token: `#${channel.name}`, label: channel.name, description: "Mención al canal", value: `<#${channel.id}>` }));
            } else if (action === "role") {
                heading = "Insertar rol";
                items = resources.roles.map(role => ({ token: `@${role.name}`, label: role.name, description: "Mención al rol", value: `<@&${role.id}>` }));
            } else {
                heading = "Insertar emoji";
                searchable = false;
                items = emojis.map(emoji => ({ token: emoji, label: emoji, description: "Emoji", value: emoji }));
            }
            popover.innerHTML = `<div class="template-popover-heading">${escapeHtml(heading)}</div>${searchable ? '<input class="template-search" type="search" placeholder="Filtrar…" aria-label="Filtrar opciones">' : ""}<div class="template-options"></div>`;
            popover.hidden = false;
            renderItems(items);
            popover.querySelector(".template-search")?.addEventListener("input", event => renderItems(items, event.target.value));
            popover.querySelector(".template-options").addEventListener("click", event => {
                const option = event.target.closest("[data-insert-value]");
                if (option) insert(option.dataset.insertValue);
            });
            popover.querySelector(".template-search")?.focus();
        }));
    });
    if (!templatePopoverListenerInstalled) {
        document.addEventListener("click", event => {
            if (!event.target.closest("[data-template-composer]")) document.querySelectorAll("[data-template-popover]").forEach(popover => { popover.hidden = true; });
        });
        templatePopoverListenerInstalled = true;
    }
}

function safePreviewImage(value) {
    try {
        const url = new URL(String(value || ""), window.location.href);
        return url.protocol === "https:" ? url.href : "";
    } catch { return ""; }
}

function validPreviewColor(value) {
    return /^#[\da-f]{6}$/i.test(String(value || "")) ? value : "#352b3d";
}

function renderPreviewTemplate(template) {
    const samples = {
        usuario: "Bryant", user: "Bryant", member: "Bryant", mention: "Bryant",
        username: "Bryant", user_name: "Bryant", nombreusuario: "Bryant", nombre_usuario: "Bryant", name: "Bryant", usertag: "Bryant", user_tag: "Bryant",
        id: "123456789012345678", userid: "123456789012345678", user_id: "123456789012345678", memberid: "123456789012345678", member_id: "123456789012345678",
        servidor: "Bryant's Family", server: "Bryant's Family", servername: "Bryant's Family", server_name: "Bryant's Family", guild: "Bryant's Family", guildname: "Bryant's Family", guild_name: "Bryant's Family",
        serverid: "1552352310418202717", server_id: "1552352310418202717", guildid: "1552352310418202717", guild_id: "1552352310418202717",
        miembros: "128", members: "128", membercount: "128", member_count: "128", memberscount: "128", members_count: "128", cuenta: "hace 2 años", createdat: "hace 2 años", created_at: "hace 2 años", accountcreated: "hace 2 años", account_created: "hace 2 años", accountage: "hace 2 años", account_age: "hace 2 años",
        nivel: "5", level: "5", xp: "250", recompensa: "500", reward: "500", coins: "500", monedas: "500", rol: "Miembro VIP", role: "Miembro VIP", boosts: "12"
    };
    samples.boost = samples.boosts;
    samples.date = new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(new Date());
    samples.fecha = samples.date;
    samples.time = "18:30";
    samples.hora = samples.time;
    return String(template || "").replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}|\{\s*([a-zA-Z_]+)\s*\}/g, (token, doubleName, singleName) => {
        const name = (doubleName || singleName).toLowerCase();
        return samples[name] ?? token;
    }).replace(/<@&(\d+)>/g, (_, id) => `@${resources.roles.find(role => role.id === id)?.name || "rol"}`)
        .replace(/<#(\d+)>/g, (_, id) => `#${resources.channels.find(channel => channel.id === id)?.name || "canal"}`);
}

function renderPreviewMarkup(key, values) {
    const color = validPreviewColor(values.color);
    const banner = safePreviewImage(values.banner || values.image);
    const thumbnail = safePreviewImage(values.thumbnail);
    const title = renderPreviewTemplate(values.title).trim();
    const description = renderPreviewTemplate(values.description).trim();
    const configuredText = [title ? `<h3>${escapeHtml(title)}</h3>` : "", title && description ? '<hr class="discord-preview-separator">' : "", description ? `<p>${escapeHtml(description)}</p>` : ""].filter(Boolean).join("");
    const media = banner ? `<div class="message-preview-banner"><img data-preview-image src="${escapeHtml(banner)}" alt="Vista previa del banner"></div>` : "";
    const thumbnailBlock = thumbnail ? `<img class="message-preview-avatar" data-preview-image src="${escapeHtml(thumbnail)}" alt="Miniatura configurada">` : "";

    if (["welcome", "leaves", "boosts", "birthday"].includes(key)) {
        const empty = !configuredText && !media && !thumbnailBlock;
        const reminder = values.reminder ? `<p class="preview-reminder"><strong>Recordatorio:</strong> <span>${escapeHtml(renderPreviewTemplate(values.reminder))}</span></p>` : "";
        const dmColor = validPreviewColor(values.dmColor);
        const dmBanner = safePreviewImage(values.dmBanner);
        const dmThumbnail = safePreviewImage(values.dmThumbnail);
        const dmTitle = renderPreviewTemplate(values.dmTitle).trim();
        const dmDescription = renderPreviewTemplate(values.dmDescription).trim();
        const dmContent = [dmTitle ? `<h3>${escapeHtml(dmTitle)}</h3>` : "", dmTitle && dmDescription ? '<hr class="discord-preview-separator">' : "", dmDescription ? `<p>${escapeHtml(dmDescription)}</p>` : ""].filter(Boolean).join("");
        const dmPreview = key === "welcome" ? `<div class="dm-preview-block"><div class="live-preview-heading"><span class="eyebrow">MENSAJE PRIVADO</span><small>${values.sendDM ? "Vista previa del DM" : "Desactivado"}</small></div><article class="discord-preview" style="--preview-accent:${dmColor}">${dmBanner ? `<div class="message-preview-banner"><img data-preview-image src="${escapeHtml(dmBanner)}" alt="Banner del mensaje privado"></div>` : ""}<div class="discord-preview-body">${dmThumbnail ? `<img class="message-preview-avatar" data-preview-image src="${escapeHtml(dmThumbnail)}" alt="Miniatura del DM">` : ""}<div class="discord-preview-copy">${dmContent || '<p class="preview-empty">Configura el contenido que recibirá el miembro por mensaje privado.</p>'}</div></div></article></div>` : "";
        const configuredButtons = Array.isArray(values.buttons) ? values.buttons.filter(button => button.label) : [];
        const buttonPreview = configuredButtons.length ? `<div class="discord-preview-buttons">${configuredButtons.map(button => `<span class="discord-preview-button">${button.emoji ? `${escapeHtml(button.emoji)} ` : ""}${escapeHtml(button.label)}</span>`).join("")}</div>` : "";
        return `<section class="live-preview" data-preview="${key}"><div class="live-preview-heading"><span class="eyebrow">VISTA PREVIA</span><small>Contenido configurado para Discord</small></div><article class="discord-preview" style="--preview-accent:${color}">${media}<div class="discord-preview-body">${thumbnailBlock}<div class="discord-preview-copy">${configuredText || (empty ? '<p class="preview-empty">Todavía no hay contenido configurado para este aviso.</p>' : "")}</div></div>${buttonPreview}</article>${reminder}${dmPreview}</section>`;
    }
    if (key === "levelSettings") {
        const renderCard = (label, titleValue, descriptionValue) => {
            const title = renderPreviewTemplate(titleValue).trim();
            const description = renderPreviewTemplate(descriptionValue).trim();
            const contentText = [title ? `<strong>${escapeHtml(title)}</strong>` : "", title && description ? '<hr class="discord-preview-separator">' : "", description ? `<span>${escapeHtml(description)}</span>` : ""].filter(Boolean).join("");
            const empty = !contentText && !banner && !thumbnail;
            return `<div class="level-preview-panel"><div class="live-preview-heading"><span class="eyebrow">VISTA PREVIA · ${label}</span><small>Mensaje Componentes V2 que verá el miembro</small></div><article class="level-preview" style="--preview-accent:${color}"><div class="level-preview-background">${banner ? `<img data-preview-image src="${escapeHtml(banner)}" alt="Imagen configurada">` : ""}</div>${thumbnailBlock}<div class="level-preview-copy">${contentText || (empty ? '<span class="preview-empty">Configura título, descripción o imagen para mostrar una vista previa.</span>' : "")}</div></article></div>`;
        };
        return `<section class="live-preview level-preview-list" data-preview="${key}">${renderCard("MENSAJES", values.messageTitle, values.messageDescription)}${renderCard("VOZ", values.voiceTitle, values.voiceDescription)}${renderCard("ROL POR NIVEL", values.roleTitle, values.roleDescription)}</section>`;
    }
    return "";
}

function previewValues(key, form) {
    const read = name => form.elements.namedItem(name)?.value || "";
    if (key === "welcome") return { title: read("Title"), description: read("MessageDes"), color: read("Color"), banner: read("Banner"), thumbnail: read("Thumbnail"), buttons: form.querySelector('[data-button-list="Buttons"]') ? readButtonRows(form.querySelector('[data-button-list="Buttons"]')) : [], sendDM: form.elements.namedItem("SendDM")?.checked, dmTitle: read("DMTitle"), dmDescription: read("DMMessage"), dmColor: read("DMColor"), dmBanner: read("DMBanner"), dmThumbnail: read("DMThumbnail") };
    if (key === "leaves") return { title: read("Title"), description: read("MessageDes"), color: read("Color"), banner: read("Banner"), thumbnail: read("Thumbnail") };
    if (key === "birthday") return { title: read("birthdayTitle"), description: read("birthdayDescription"), color: read("birthdayColor"), banner: read("birthdayBanner"), reminder: read("birthdayReminder") };
    if (key === "boosts") return { title: read("boostTitle"), description: read("boostDescription"), color: read("boostColor"), banner: read("boostImage"), thumbnail: read("boostThumbnail"), buttons: form.querySelector('[data-button-list="boostButtons"]') ? readButtonRows(form.querySelector('[data-button-list="boostButtons"]')) : [] };
    return { messageTitle: read("messageLevelTitle"), messageDescription: read("messageLevelDescription"), voiceTitle: read("voiceLevelTitle"), voiceDescription: read("voiceLevelDescription"), roleTitle: read("levelRoleTitle"), roleDescription: read("levelRoleDescription"), color: read("levelColor"), image: read("levelImage"), thumbnail: read("levelThumbnail") };
}

function renderPreview(key, data) {
    if (!["welcome", "leaves", "boosts", "birthday", "levelSettings"].includes(key)) return "";
    const values = key === "welcome"
        ? { title: data.Title, description: data.MessageDes, color: data.Color, banner: data.Banner, thumbnail: data.Thumbnail, buttons: data.Buttons, sendDM: data.SendDM, dmTitle: data.DMTitle, dmDescription: data.DMMessage, dmColor: data.DMColor, dmBanner: data.DMBanner, dmThumbnail: data.DMThumbnail }
        : key === "leaves"
            ? { title: data.Title, description: data.MessageDes, color: data.Color, banner: data.Banner, thumbnail: data.Thumbnail }
            : key === "birthday"
                ? { title: data.birthdayTitle, description: data.birthdayDescription, color: data.birthdayColor, banner: data.birthdayBanner, reminder: data.birthdayReminder }
        : key === "boosts"
                ? { title: data.boostTitle, description: data.boostDescription, color: data.boostColor, banner: data.boostImage, thumbnail: data.boostThumbnail, buttons: boostButtonsFor(data) }
                : { messageTitle: data.messageLevelTitle !== undefined ? data.messageLevelTitle : data.levelUpTitle, messageDescription: data.messageLevelDescription !== undefined ? data.messageLevelDescription : data.levelUpDescription, voiceTitle: data.voiceLevelTitle !== undefined ? data.voiceLevelTitle : data.levelUpTitle, voiceDescription: data.voiceLevelDescription !== undefined ? data.voiceLevelDescription : data.levelUpDescription, roleTitle: data.levelRoleTitle, roleDescription: data.levelRoleDescription, color: data.levelColor, image: data.levelImage, thumbnail: data.levelThumbnail };
    return renderPreviewMarkup(key, values);
}

function boostButtonsFor(data) {
    if (Array.isArray(data.boostButtons)) return data.boostButtons;
    return [["boosterRole", "Booster"], ["boosterVipRole", "Booster VIP"], ["boosterLegendRole", "Booster Legend"]]
        .filter(([roleKey]) => data[roleKey])
        .map(([roleKey, label]) => ({ label: resources.roles.find(role => role.id === data[roleKey])?.name || label, emoji: "", action: "role", roleId: data[roleKey] }));
}

function updatePreview(key, form) {
    const preview = content.querySelector(".live-preview");
    if (!preview) return;
    preview.outerHTML = renderPreviewMarkup(key, previewValues(key, form));
    content.querySelectorAll("[data-preview-image]").forEach(image => image.addEventListener("error", () => {
        if (image.classList.contains("message-preview-avatar")) {
            const fallback = document.createElement("span");
            fallback.className = "message-preview-avatar";
            fallback.setAttribute("aria-hidden", "true");
            image.replaceWith(fallback);
        } else {
            const fallback = document.createElement("span");
            fallback.textContent = "No se pudo cargar la imagen";
            image.parentElement.replaceChildren(fallback);
        }
    }, { once: true }));
}

function readForm(form, fields) {
    const result = {};
    for (const field of fields) {
        if (field.type === "buttons") {
            result[field.name] = readButtonRows(form.querySelector(`[data-button-list="${CSS.escape(field.name)}"]`));
            continue;
        }
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
        if (field.type === "section") continue;
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
    const homeButton = document.createElement("button");
    homeButton.type = "button";
    homeButton.className = "nav-item nav-home";
    homeButton.textContent = "Inicio";
    homeButton.dataset.module = "__home";
    homeButton.addEventListener("click", navigateToHome);
    nav.append(homeButton);
    const all = [...Object.entries(modules.configurations), ...Object.entries(modules.lists)];
    const appendHeading = category => {
        const heading = document.createElement("div");
        heading.className = "nav-heading";
        heading.textContent = category;
        heading.dataset.category = category;
        nav.append(heading);
    };
    const appendEntry = (key, definition, group) => {
        const entry = document.createElement("div");
        entry.className = "nav-entry";
        entry.dataset.module = key;
        entry.dataset.group = group;
        entry.dataset.search = `${definition.title} ${definition.category}`;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "nav-item";
        button.textContent = definition.title;
        button.dataset.module = key;
        button.addEventListener("click", () => navigateToModule(key, modules));
        const favorite = document.createElement("button");
        favorite.type = "button";
        favorite.className = `nav-favorite${favoriteModules.has(key) ? " is-favorite" : ""}`;
        favorite.textContent = favoriteModules.has(key) ? "★" : "☆";
        favorite.setAttribute("aria-label", favoriteModules.has(key) ? `Quitar ${definition.title} de favoritos` : `Añadir ${definition.title} a favoritos`);
        favorite.setAttribute("aria-pressed", String(favoriteModules.has(key)));
        favorite.title = favoriteModules.has(key) ? "Quitar de favoritos" : "Añadir a favoritos";
        favorite.addEventListener("click", () => {
            if (favoriteModules.has(key)) favoriteModules.delete(key);
            else favoriteModules.add(key);
            saveFavorites();
            makeNav(modules);
        });
        entry.append(button, favorite);
        nav.append(entry);
    };
    const pinnedEntries = all.filter(([key]) => favoriteModules.has(key));
    if (pinnedEntries.length) {
        appendHeading("Favoritos");
        pinnedEntries.forEach(([key, definition]) => appendEntry(key, definition, "Favoritos"));
    }
    for (const category of categoriesOrder) {
        const group = all.filter(([key, definition]) => definition.category === category && !favoriteModules.has(key));
        if (!group.length) continue;
        appendHeading(category);
        group.forEach(([key, definition]) => appendEntry(key, definition, category));
    }
    const empty = document.createElement("div");
    empty.className = "nav-empty";
    empty.hidden = true;
    nav.append(empty);
    const searchInput = document.querySelector("#module-search");
    const favoritesToggle = document.querySelector("#favorites-toggle");
    searchInput.oninput = applyModuleFilter;
    favoritesToggle.onclick = () => {
        favoritesOnly = !favoritesOnly;
        favoritesToggle.classList.toggle("active", favoritesOnly);
        favoritesToggle.setAttribute("aria-pressed", String(favoritesOnly));
        favoritesToggle.textContent = favoritesOnly ? "★ Favoritos" : "☆ Favoritos";
        applyModuleFilter();
    };
    nav.querySelectorAll(".nav-item").forEach(button => {
        const active = button.dataset.module === currentModule;
        button.classList.toggle("active", active);
        if (active) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
    });
    applyModuleFilter();
}

function renderModule(key, modules) {
    currentModule = key;
    nav.querySelectorAll(".nav-item").forEach(button => {
        const active = button.dataset.module === key;
        button.classList.toggle("active", active);
        if (active) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
    });
    const isList = Boolean(modules.lists[key]);
    const definition = isList ? modules.lists[key] : modules.configurations[key];
    document.querySelector("#page-title").textContent = definition.title;
    if (isList) return renderList(key, definition);

    const data = configState.configurations[key] || { configured: false };
    const formFields = definition.fields.map(field => {
        if (field.type === "section") return renderField(field);
        let value = getNested(data, field.name);
        if (key === "boosts" && field.name === "boostButtons" && !Array.isArray(value)) {
            value = boostButtonsFor(data);
        }
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
    content.innerHTML = `<article class="settings-card"><div class="card-heading"><div><div class="eyebrow">${escapeHtml(definition.category)}</div><h2>${escapeHtml(definition.title)}</h2></div><span class="status-pill ${data.configured ? "configured" : "unconfigured"}">${data.configured ? "Configurado" : "Sin configurar"}</span></div><p class="card-description">${escapeHtml(description)}</p>${renderPreview(key, data)}<form id="settings-form" class="fields-grid">${formFields}<div class="form-actions"><button class="primary-button" type="submit">Guardar cambios</button><span class="unsaved-indicator" hidden>● Cambios sin guardar</span><span class="save-feedback" role="status" aria-live="polite"></span></div></form></article>${key === "polls" ? '<div id="poll-admin"><div class="loading-card">Cargando encuestas…</div></div>' : ""}`;
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
    const settingsForm = content.querySelector("#settings-form");
    registerFormGuard(settingsForm, definition.fields);
    setupButtonEditors(settingsForm, definition);
    setupTemplateComposers(settingsForm);
    updatePreview(key, settingsForm);
    settingsForm.addEventListener("input", () => updatePreview(key, settingsForm));
    settingsForm.addEventListener("change", () => updatePreview(key, settingsForm));
    settingsForm.addEventListener("submit", async event => {
        event.preventDefault();
        const button = event.currentTarget.querySelector("button[type=submit]");
        const form = event.currentTarget;
        button.disabled = true;
        button.dataset.idleText = button.textContent;
        button.textContent = "Guardando…";
        setSaveFeedback(form, "Guardando cambios…", "pending");
        try {
            const payload = readForm(form, definition.fields);
            const result = await api(`/api/guilds/${encodeURIComponent(guildId)}/config/${encodeURIComponent(key)}`, {
                method: "PUT", body: JSON.stringify(payload)
            });
            configState.configurations[key] = { ...result.configuration, configured: true };
            showNotice(key === "voiceConnection"
                ? "Canal guardado. El bot cambiará en unos segundos."
                : "Configuración guardada.");
            // A save can finish after the user has navigated elsewhere. Keep the data,
            // but never replace the newly selected module with this form's old view.
            if (currentModule === key && form.isConnected) {
                renderModule(key, modules);
                showSavedState(content.querySelector("#settings-form"));
            }
        } catch (error) {
            showNotice(error.message, true);
            setSaveFeedback(form, error.message, "error");
            button.textContent = button.dataset.idleText;
        } finally {
            if (button.isConnected) button.disabled = false;
        }
    });
    if (key === "polls") renderPollAdmin();
}

async function renderPollAdmin(editingPoll = null) {
    const container = content.querySelector("#poll-admin");
    if (!container) return;
    try {
        const result = await api(`/api/guilds/${encodeURIComponent(guildId)}/polls`);
        if (!container.isConnected) return;
        const polls = result.polls || [];
        const channelName = channelId => resources.channels.find(channel => channel.id === channelId)?.name || "Canal no disponible";
        const configuredPolls = polls.filter(poll => poll.channelId === result.configuredChannelId);
        const activePolls = configuredPolls.filter(poll => !poll.ended).length;
        const registeredPolls = configuredPolls.length;
        const totalVotes = polls.reduce((total, poll) => total + poll.options.reduce((sum, option) => sum + option.voteCount, 0), 0);
        const form = `<article class="settings-card poll-create-card"><div class="card-heading"><div><div class="eyebrow">PUBLICACIÓN EN DISCORD</div><h2>${editingPoll ? "Editar encuesta" : "Crear encuesta"}</h2></div>${editingPoll ? '<button class="quiet-button" type="button" data-poll-cancel>Cancelar</button>' : ""}</div><p class="card-description">${editingPoll ? `Se actualizará el mensaje en #<span>${escapeHtml(channelName(editingPoll.channelId))}</span>.` : `Se publicará en el canal guardado arriba: #<span>${escapeHtml(channelName(result.configuredChannelId || ""))}</span>.`} La duración se cuenta desde que guardes.</p><form id="poll-form" class="fields-grid"><label class="field poll-full-field"><span>Pregunta</span><input name="question" type="text" maxlength="256" required value="${escapeHtml(editingPoll?.question || "")}" placeholder="¿Qué te gustaría preguntarle al servidor?"></label><label class="field poll-full-field"><span>Opciones <small>(una por línea, entre 2 y 4)</small></span><textarea name="options" rows="4" required placeholder="Opción 1&#10;Opción 2">${escapeHtml(editingPoll?.options.map(option => option.text).join("\n") || "")}</textarea></label><label class="field"><span>Duración (minutos, máximo 7 días)</span><input name="duration" type="number" min="1" max="10080" required value="${editingPoll ? Math.max(1, Math.ceil((new Date(editingPoll.endAt).getTime() - Date.now()) / 60000)) : 60}"></label><div class="poll-form-note">${editingPoll ? "Si cambias las opciones, los votos existentes se reiniciarán para que los resultados no queden asociados a opciones distintas." : "Los miembros podrán cambiar su voto hasta que termine la encuesta."}</div><div class="form-actions poll-full-field"><button class="primary-button" type="submit">${editingPoll ? "Guardar encuesta" : "Publicar encuesta"}</button><span class="save-feedback" role="status" aria-live="polite"></span></div></form></article>`;
        const rows = polls.map(poll => {
            const votes = poll.options.reduce((sum, option) => sum + option.voteCount, 0);
            const status = poll.ended ? "Finalizada" : "Activa";
            const options = poll.options.map((option, index) => `<li><span>${index + 1}️⃣ <span>${escapeHtml(option.text)}</span></span><strong>${option.voteCount}</strong></li>`).join("");
            return `<article class="poll-row"><div class="poll-row-main"><div class="poll-row-top"><span class="status-pill ${poll.ended ? "unconfigured" : "configured"}">${status}</span><span class="poll-channel">#<span>${escapeHtml(channelName(poll.channelId))}</span></span><span class="poll-votes">${votes} ${votes === 1 ? "voto" : "votos"}</span></div><h3>${escapeHtml(poll.question)}</h3><ul>${options}</ul><small>${poll.endAt ? `${poll.ended ? "Terminó" : "Termina"} ${new Date(poll.endAt).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })}` : "Sin fecha de término"}</small></div><div class="record-actions">${poll.url ? `<a class="quiet-button" href="${escapeHtml(poll.url)}" target="_blank" rel="noopener noreferrer">Ver en Discord ↗</a>` : ""}${poll.ended ? "" : `<button class="quiet-button" type="button" data-poll-edit="${escapeHtml(poll._id)}">Editar</button>`}<button class="quiet-button danger-text" type="button" data-poll-delete="${escapeHtml(poll._id)}">Eliminar</button></div></article>`;
        }).join("");
        container.innerHTML = `${form}<article class="settings-card poll-list-card"><div class="card-heading"><div><div class="eyebrow">GESTIÓN</div><h2>Encuestas creadas</h2></div><button class="quiet-button" type="button" data-poll-refresh>Actualizar</button></div><div class="poll-stats"><div><span>Activas en el canal configurado</span><strong>${activePolls}</strong></div><div><span>Registradas en ese canal</span><strong>${registeredPolls}</strong></div><div><span>Votos acumulados</span><strong>${totalVotes}</strong></div></div><p class="card-description">Los contadores de arriba corresponden al canal configurado, como en <code>/poll list</code>. La lista incluye todas las encuestas del servidor y sus estados.</p><div class="poll-list">${rows || '<p class="empty-state">Todavía no hay encuestas registradas.</p>'}</div></article>`;

        container.querySelector("[data-poll-refresh]").addEventListener("click", () => renderPollAdmin());
        container.querySelector("[data-poll-cancel]")?.addEventListener("click", () => renderPollAdmin());
        container.querySelectorAll("[data-poll-edit]").forEach(button => button.addEventListener("click", () => {
            const poll = polls.find(item => item._id === button.dataset.pollEdit);
            if (poll) renderPollAdmin(poll);
        }));
        container.querySelectorAll("[data-poll-delete]").forEach(button => button.addEventListener("click", async () => {
            const poll = polls.find(item => item._id === button.dataset.pollDelete);
            if (!poll || !window.confirm(`¿Eliminar la encuesta “${poll.question}” y su mensaje de Discord?`)) return;
            button.disabled = true;
            try {
                await api(`/api/guilds/${encodeURIComponent(guildId)}/polls/${encodeURIComponent(poll._id)}`, { method: "DELETE" });
                showNotice("Encuesta y mensaje eliminados.");
                renderPollAdmin();
            } catch (error) {
                showNotice(error.message, true);
                button.disabled = false;
            }
        }));
        container.querySelector("#poll-form").addEventListener("submit", async event => {
            event.preventDefault();
            const formElement = event.currentTarget;
            const button = formElement.querySelector("button[type=submit]");
            const feedback = formElement.querySelector(".save-feedback");
            const options = formElement.elements.options.value.split(/\r?\n/).map(option => option.trim()).filter(Boolean);
            const selectedChannelId = content.querySelector("#field-channelId")?.value || "";
            if (!editingPoll && !result.configuredChannelId) {
                showNotice("Primero guarda un canal de encuestas arriba.", true);
                return;
            }
            if (!editingPoll && selectedChannelId !== result.configuredChannelId) {
                showNotice("Guarda primero el canal seleccionado arriba; luego podrás publicar la encuesta ahí.", true);
                return;
            }
            button.disabled = true;
            button.textContent = editingPoll ? "Guardando…" : "Publicando…";
            feedback.textContent = editingPoll ? "Actualizando el mensaje de Discord…" : "Publicando en el canal…";
            try {
                const payload = JSON.stringify({ question: formElement.elements.question.value, options, duration: formElement.elements.duration.value });
                await api(`/api/guilds/${encodeURIComponent(guildId)}/polls${editingPoll ? `/${encodeURIComponent(editingPoll._id)}` : ""}`, {
                    method: editingPoll ? "PUT" : "POST", body: payload
                });
                showNotice(editingPoll ? "Encuesta actualizada en Discord." : "Encuesta publicada en Discord.");
                renderPollAdmin();
            } catch (error) {
                feedback.textContent = error.message;
                showNotice(error.message, true);
                button.disabled = false;
                button.textContent = editingPoll ? "Guardar encuesta" : "Publicar encuesta";
            }
        });
    } catch (error) {
        if (container.isConnected) container.innerHTML = `<article class="settings-card"><p class="error">${escapeHtml(error.message)}</p><button class="quiet-button" type="button" data-poll-retry>Reintentar</button></article>`;
        container.querySelector("[data-poll-retry]")?.addEventListener("click", () => renderPollAdmin(editingPoll));
    }
}

function getRecordLabel(key, record, definition) {
    const role = record.roleId ? resources.roles.find(item => item.id === record.roleId) : null;
    const roleName = role?.name || (record.roleId ? "Rol no disponible" : "");
    if (key === "levelRewards") return `Nivel ${record.level} · ${roleName}`;
    if (key === "shopItems") return `${roleName} · ${Number(record.price || 0).toLocaleString("es")} monedas`;
    if (key === "bankDonorRoles") return `${roleName} · bonificación desde ${Number(record.requiredAmount || 0).toLocaleString("es")}`;
    if (key === "birthdayMembers") return record.discordName || (record.userId ? `Cargando nombre… · ${record.day}/${record.month}` : "Miembro sin ID de Discord");
    return record.name || record[definition.identity] || roleName || (record._id ? `Registro ${String(record._id).slice(-8)}` : "Registro sin identificar");
}

function getRecordSearchText(key, record, definition) {
    const values = definition.fields.map(field => {
        const value = getNested(record, field.name);
        if (value == null) return "";
        const options = field.type === "role" || field.type === "role-list"
            ? resources.roles
            : ["channel", "channel-list", "voice", "category"].includes(field.type) ? resources.channels : [];
        if (Array.isArray(value)) return `${field.label} ${value.map(item => options.find(option => option.id === String(item))?.name || item).join(" ")}`;
        return `${field.label} ${options.find(option => option.id === String(value))?.name || value}`;
    }).join(" ");
    return normalizeSearch(`${getRecordLabel(key, record, definition)} ${values}`);
}

function renderList(key, definition, editItem = null) {
    const records = configState.lists[key] || [];
    const editing = Boolean(editItem);
    const form = `<form id="list-form" class="fields-grid">${definition.fields.map(field => renderField(field, getNested(editItem, field.name), `${key}-`)).join("")}<div class="form-actions"><button class="primary-button" type="submit">${editing ? "Guardar elemento" : "Añadir elemento"}</button>${editing ? '<button class="quiet-button" id="cancel-edit" type="button">Cancelar</button>' : ""}<span class="unsaved-indicator" hidden>● Cambios sin guardar</span><span class="save-feedback" role="status" aria-live="polite"></span></div></form>`;
    const rows = records.map(record => {
        const label = getRecordLabel(key, record, definition);
        return `<div class="record-row" data-record-id="${escapeHtml(record._id)}" data-search="${escapeHtml(getRecordSearchText(key, record, definition))}"><div class="record-title">${escapeHtml(label)}</div><div class="record-actions"><button type="button" class="quiet-button" data-edit="${escapeHtml(record._id)}">Editar</button><button type="button" class="quiet-button danger-text" data-delete="${escapeHtml(record._id)}">Eliminar</button></div></div>`;
    }).join("");
    const search = records.length > 3 ? `<div class="list-toolbar"><span>${records.length} elementos</span><label class="record-search"><span class="sr-only">Buscar en ${escapeHtml(definition.title)}</span><input type="search" id="record-search" placeholder="Buscar en la lista…" autocomplete="off"></label></div>` : "";
    content.innerHTML = `<article class="settings-card"><div class="card-heading"><div><div class="eyebrow">${escapeHtml(definition.category)}</div><h2>${escapeHtml(definition.title)}</h2></div></div>${search}<div class="records-list">${rows || '<p class="empty-state">Todavía no hay elementos configurados.</p>'}<p id="list-no-results" class="empty-state" hidden>No hay elementos que coincidan con la búsqueda.</p></div><div class="form-divider"></div><h3>${editing ? "Editar elemento" : "Añadir elemento"}</h3>${form}</article>`;

    if (key === "birthdayMembers" && !editing && records.length) {
        api(`/api/guilds/${encodeURIComponent(guildId)}/birthday-members/names`).then(result => {
            for (const record of records) {
                if (!record.userId || !result.names[record.userId]) continue;
                record.discordName = result.names[record.userId];
                const row = content.querySelector(`[data-record-id="${CSS.escape(record._id)}"]`);
                if (!row) continue;
                row.querySelector(".record-title").textContent = `${record.discordName} · ${record.day}/${record.month}`;
                row.dataset.search = normalizeSearch(getRecordSearchText(key, record, definition));
            }
        }).catch(error => console.warn("No se pudieron cargar los nombres de cumpleaños:", error.message));
    }

    content.querySelector("#record-search")?.addEventListener("input", event => {
        const query = normalizeSearch(event.currentTarget.value);
        let matches = 0;
        content.querySelectorAll(".record-row").forEach(row => {
            const match = !query || row.dataset.search.includes(query);
            row.hidden = !match;
            if (match) matches += 1;
        });
        content.querySelector("#list-no-results").hidden = matches > 0;
    });

    content.querySelectorAll("[data-edit]").forEach(button => button.addEventListener("click", () => {
        if (!confirmDiscardChanges()) return;
        activeFormGuard = null;
        const record = records.find(item => item._id === button.dataset.edit);
        renderList(key, definition, record);
    }));
    content.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", async () => {
        if (!window.confirm("¿Eliminar este elemento de la configuración del servidor?")) return;
        if (!confirmDiscardChanges()) return;
        activeFormGuard = null;
        try {
            await api(`/api/guilds/${encodeURIComponent(guildId)}/lists/${encodeURIComponent(key)}/${encodeURIComponent(button.dataset.delete)}`, { method: "DELETE" });
            configState.lists[key] = records.filter(item => item._id !== button.dataset.delete);
            renderList(key, definition);
            showNotice("Elemento eliminado.");
        } catch (error) { showNotice(error.message, true); }
    }));
    const listForm = content.querySelector("#list-form");
    registerFormGuard(listForm, definition.fields);
    listForm.addEventListener("submit", async event => {
        event.preventDefault();
        const button = event.currentTarget.querySelector("button[type=submit]");
        const form = event.currentTarget;
        button.disabled = true;
        button.dataset.idleText = button.textContent;
        button.textContent = "Guardando…";
        setSaveFeedback(form, "Guardando cambios…", "pending");
        try {
            const payload = readForm(form, definition.fields);
            const url = `/api/guilds/${encodeURIComponent(guildId)}/lists/${encodeURIComponent(key)}${editing ? `/${encodeURIComponent(editItem._id)}` : ""}`;
            const result = await api(url, { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) });
            if (editing) configState.lists[key] = records.map(item => item._id === editItem._id ? result.item : item);
            else configState.lists[key] = [...records, result.item];
            renderList(key, definition);
            showNotice(editing ? "Elemento actualizado." : "Elemento añadido.");
            showSavedState(content.querySelector("#list-form"));
        } catch (error) {
            showNotice(error.message, true);
            setSaveFeedback(form, error.message, "error");
            button.textContent = button.dataset.idleText;
        } finally {
            if (button.isConnected) button.disabled = false;
        }
    });
    content.querySelector("#cancel-edit")?.addEventListener("click", () => {
        if (!confirmDiscardChanges()) return;
        activeFormGuard = null;
        renderList(key, definition);
    });
}

async function initialize() {
    loadFavorites();
    try {
        const sessionResult = await api("/api/me");
        if (!sessionResult.user) return window.location.assign("/");
        csrfToken = sessionResult.csrfToken;
        window.mountAccountMenu(document.querySelector("#header-account"), sessionResult.user, message => showNotice(message, true));
        const [resourcesResult, configResult] = await Promise.all([
            api(`/api/guilds/${encodeURIComponent(guildId)}/resources`),
            api(`/api/guilds/${encodeURIComponent(guildId)}/config`)
        ]);
        let cachedGuilds = [];
        try {
            const savedGuilds = JSON.parse(sessionStorage.getItem("bryants-dashboard:guilds") || "[]");
            if (Array.isArray(savedGuilds)) cachedGuilds = savedGuilds;
        } catch {
            // A direct link or restricted browser storage can omit the cached server preview.
        }
        const guild = resourcesResult.guild || cachedGuilds.find(item => item?.id === guildId) || null;
        activeGuild = guild || null;
        const serverName = guild?.name || "Servidor de Discord";
        const avatar = document.querySelector("#server-avatar");
        document.querySelector("#server-name").textContent = serverName;
        avatar.textContent = serverName.trim().slice(0, 2).toUpperCase();
        if (guild?.icon) {
            const image = document.createElement("img");
            image.src = guild.icon;
            image.alt = "";
            image.width = 44;
            image.height = 44;
            image.decoding = "async";
            image.addEventListener("error", () => {
                avatar.classList.remove("has-image");
                avatar.replaceChildren(document.createTextNode(serverName.trim().slice(0, 2).toUpperCase()));
            }, { once: true });
            avatar.replaceChildren(image);
            avatar.classList.add("has-image");
        }
        resources = resourcesResult;
        configState = configResult;
        currentModules = configResult.modules;
        makeNav(configResult.modules);
        renderHome(guild, configResult.modules);
    } catch (error) {
        content.innerHTML = `<div class="loading-card error">${escapeHtml(error.message)} <a href="/">Volver a elegir servidor</a></div>`;
    }
}

window.addEventListener("beforeunload", event => {
    if (!formIsDirty()) return;
    event.preventDefault();
    event.returnValue = "";
});

initialize();
