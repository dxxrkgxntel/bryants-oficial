const guildId = decodeURIComponent(window.location.pathname.split("/").filter(Boolean).at(-1) || "");
const categoriesOrder = ["Comunidad", "Alertas sociales", "Moderación", "Servidor", "Economía y XP"];
const nav = document.querySelector("#module-nav");
const content = document.querySelector("#module-content");
const notice = document.querySelector("#notice");
let csrfToken = "";
let resources = { channels: [], roles: [], roleIds: [] };
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

function searchSettingResults(query) {
    if (!query || !currentModules) return [];
    const results = [];
    const entries = [...Object.entries(currentModules.configurations), ...Object.entries(currentModules.lists)];
    for (const [key, definition] of entries) {
        const moduleText = `${definition.title || ""} ${definition.category || ""} ${definition.description || ""}`;
        if (normalizeSearch(moduleText).includes(query)) {
            results.push({ type: "module", key, title: definition.title, category: definition.category || "Sistema", searchText: moduleText });
        }
        for (const field of definition.fields || []) {
            if (field.type === "section") continue;
            const fieldText = `${field.label || ""} ${field.name || ""} ${field.help || ""} ${field.type || ""} ${definition.title || ""} ${definition.category || ""}`;
            if (normalizeSearch(fieldText).includes(query)) {
                results.push({ type: "field", key, title: field.label || field.name, moduleTitle: definition.title, category: definition.category || "Sistema", fieldName: field.name, searchText: fieldText });
            }
        }
    }
    const seen = new Set();
    return results.filter(result => {
        const id = result.type === "field" ? `${result.key}:${result.fieldName}` : `module:${result.key}`;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    }).sort((a, b) => {
        const aExact = normalizeSearch(a.title) === query ? 0 : 1;
        const bExact = normalizeSearch(b.title) === query ? 0 : 1;
        return aExact - bExact || (a.type === b.type ? 0 : a.type === "field" ? -1 : 1);
    }).slice(0, 8);
}

function renderModuleSearchResults(query) {
    const panel = document.querySelector("#module-search-results");
    if (!panel) return;
    const input = document.querySelector("#module-search");
    if (!query) { panel.hidden = true; panel.replaceChildren(); input?.setAttribute("aria-expanded", "false"); return; }
    const results = searchSettingResults(query);
    panel.hidden = false;
    input?.setAttribute("aria-expanded", "true");
    if (!results.length) {
        panel.innerHTML = '<div class="module-search-empty">No se encontraron módulos ni ajustes.</div>';
        return;
    }
    panel.innerHTML = `<div class="module-search-results-heading">RESULTADOS (${results.length})</div>${results.map((result, index) => `<button type="button" class="module-search-result" data-search-result="${index}" data-result-key="${escapeHtml(result.key)}" ${result.type === "field" ? `data-result-field="${escapeHtml(result.fieldName)}"` : ""}><span class="module-search-result-icon" aria-hidden="true">${result.type === "field" ? "⚙" : "▦"}</span><span class="module-search-result-copy"><strong>${escapeHtml(result.title)}</strong><small>${escapeHtml(result.type === "field" ? `${result.moduleTitle} · ${result.category}` : `${result.category} · Módulo`)}</small></span><span class="module-search-result-arrow" aria-hidden="true">↗</span></button>`).join("")}`;
}

function applyModuleFilter() {
    const query = normalizeSearch(document.querySelector("#module-search")?.value);
    let visibleCount = 0;
    nav.querySelectorAll(".nav-entry").forEach(entry => {
        const visible = (!favoritesOnly || (!entry.dataset.special && favoriteModules.has(entry.dataset.module)))
            && (!query || normalizeSearch(entry.dataset.search).includes(query));
        entry.hidden = !visible;
        if (visible) visibleCount += 1;
    });
    nav.querySelectorAll(".nav-heading").forEach(heading => {
        heading.hidden = ![...nav.querySelectorAll(".nav-entry")].some(entry => entry.dataset.group === heading.dataset.category && !entry.hidden);
    });
    const empty = nav.querySelector(".nav-empty");
    if (empty) {
        empty.hidden = visibleCount > 0;
        empty.textContent = favoritesOnly && favoriteModules.size === 0
            ? "Aún no tienes favoritos en este servidor."
            : favoritesOnly ? "No hay favoritos que coincidan con la búsqueda." : "No hay módulos que coincidan.";
    }
    renderModuleSearchResults(query);
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
    const memberBalanceButton = document.querySelector("#member-balance-update");
    if (memberBalanceButton) memberBalanceButton.hidden = true;
    activeFormGuard = null;
    renderHome(activeGuild, currentModules);
}

function navigateToModule(key, modules = currentModules) {
    const definitionExists = Boolean(modules && (modules.configurations?.[key] || modules.lists?.[key] || key === "memberEconomy"));
    if (!definitionExists) {
        showNotice("No se pudo abrir ese sistema porque ya no está disponible. Recarga el panel e inténtalo de nuevo.", true);
        return false;
    }
    if (!confirmDiscardChanges()) return false;
    activeFormGuard = null;
    renderModule(key, modules);
    return true;
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

function findUnavailableChannelReferences(modules) {
    const availableChannelIds = new Set((resources.channels || []).map(channel => String(channel.id)));
    const findings = new Map();
    const channelIdPattern = /^\d{17,20}$/;

    const inspect = (value, moduleKey, definition, parentKey = "") => {
        if (Array.isArray(value)) {
            for (const item of value) inspect(item, moduleKey, definition, parentKey);
            return;
        }
        if (!value || typeof value !== "object") {
            if (/channel/i.test(parentKey) && typeof value === "string" && channelIdPattern.test(value) && !availableChannelIds.has(value)) {
                const identity = `${moduleKey}:${value}`;
                if (!findings.has(identity)) findings.set(identity, { key: moduleKey, title: definition?.title || moduleKey, channelId: value });
            }
            return;
        }
        for (const [key, nested] of Object.entries(value)) {
            if (["_id", "__v", "guildId", "userId"].includes(key)) continue;
            inspect(nested, moduleKey, definition, key);
        }
    };

    for (const [key, definition] of Object.entries(modules.configurations || {})) inspect(configState.configurations?.[key], key, definition);
    for (const [key, definition] of Object.entries(modules.lists || {})) inspect(configState.lists?.[key], key, definition);
    return [...findings.values()];
}

function findConfiguredChannelPermissionIssues(modules) {
    const permissionByChannel = new Map((resources.channelPermissions || []).map(item => [String(item.id), item]));
    const channelById = new Map((resources.channels || []).map(item => [String(item.id), item]));
    const findings = new Map();
    const channelTypes = new Set(["channel", "voice"]);
    const inspectDefinition = (key, definition, data) => {
        if (!data || !Array.isArray(definition?.fields)) return;
        for (const field of definition.fields) {
            if (!channelTypes.has(field.type)) continue;
            const value = getNested(data, field.name);
            const ids = Array.isArray(value) ? value : [value];
            for (const rawId of ids) {
                const id = String(rawId || "");
                if (!/^\d{17,20}$/.test(id)) continue;
                const channel = channelById.get(id);
                const permission = permissionByChannel.get(id);
                if (!channel || !permission) continue;
                const required = field.type === "voice"
                    ? [["viewChannel", "Ver canal"], ["manageChannels", "Gestionar canal"]]
                    : [["viewChannel", "Ver canal"], ["sendMessages", "Enviar mensajes"], ["embedLinks", "Insertar enlaces/embeds"]];
                const missing = required.filter(([name]) => !permission[name]).map(([, label]) => label);
                if (!missing.length) continue;
                const identity = `${key}:${id}`;
                if (!findings.has(identity)) findings.set(identity, {
                    key,
                    title: definition.title || key,
                    channelId: id,
                    channelName: channel.name,
                    missing
                });
            }
        }
    };
    for (const [key, definition] of Object.entries(modules.configurations || {})) {
        inspectDefinition(key, definition, configState.configurations?.[key]);
    }
    for (const [key, definition] of Object.entries(modules.lists || {})) {
        for (const record of configState.lists?.[key] || []) inspectDefinition(key, definition, record);
    }
    return [...findings.values()];
}

function findUnavailableRoleReferences(modules) {
    const availableRoleIds = new Set((resources.roleIds || resources.roles || []).map(role => String(typeof role === "object" ? role.id : role)));
    const findings = new Map();
    const roleIdPattern = /^\d{17,20}$/;
    const inspect = (value, moduleKey, definition, parentKey = "", roleContext = false) => {
        if (Array.isArray(value)) {
            for (const item of value) inspect(item, moduleKey, definition, parentKey, roleContext);
            return;
        }
        if (!value || typeof value !== "object") {
            if ((roleContext || /role/i.test(parentKey)) && typeof value === "string" && roleIdPattern.test(value) && !availableRoleIds.has(value)) {
                const identity = `${moduleKey}:${value}`;
                if (!findings.has(identity)) findings.set(identity, { key: moduleKey, title: definition?.title || moduleKey, roleId: value });
            }
            return;
        }
        for (const [key, nested] of Object.entries(value)) {
            if (["_id", "__v", "guildId", "userId"].includes(key)) continue;
            inspect(nested, moduleKey, definition, key, roleContext || /role/i.test(key));
        }
    };
    for (const [key, definition] of Object.entries(modules.configurations || {})) inspect(configState.configurations?.[key], key, definition);
    for (const [key, definition] of Object.entries(modules.lists || {})) inspect(configState.lists?.[key], key, definition);
    return [...findings.values()];
}

function findChannelTypeMismatches(modules) {
    const channelById = new Map((resources.channels || []).map(channel => [String(channel.id), channel]));
    const findings = new Map();
    const inspectDefinition = (key, definition, data) => {
        if (!data || !Array.isArray(definition?.fields)) return;
        for (const field of definition.fields) {
            if (!["channel", "channel-list", "voice", "category"].includes(field.type) || !Array.isArray(field.channelTypes)) continue;
            const value = getNested(data, field.name);
            const ids = Array.isArray(value) ? value : [value];
            for (const rawId of ids) {
                const id = String(rawId || "");
                if (!/^\d{17,20}$/.test(id)) continue;
                const channel = channelById.get(id);
                if (!channel || field.channelTypes.includes(Number(channel.type))) continue;
                const identity = [key, field.name, id].join(":");
                if (!findings.has(identity)) findings.set(identity, {
                    key,
                    title: definition.title || key,
                    field: field.label || field.name,
                    channelName: channel.name
                });
            }
        }
    };
    for (const [key, definition] of Object.entries(modules.configurations || {})) {
        inspectDefinition(key, definition, configState.configurations?.[key]);
    }
    for (const [key, definition] of Object.entries(modules.lists || {})) {
        for (const record of configState.lists?.[key] || []) inspectDefinition(key, definition, record);
    }
    return [...findings.values()];
}

function findMissingRequiredSettings(modules) {
    const findings = new Map();
    const isMissing = (field, value) => {
        if (field.optional || field.type === "section" || field.type === "boolean" || field.default !== undefined) return false;
        if (value === undefined || value === null) return true;
        if (typeof value === "string") return value.trim() === "";
        if (Array.isArray(value)) return value.length === 0;
        return false;
    };
    const inspect = (key, definition, data, configured) => {
        if (!configured || !data || !Array.isArray(definition?.fields)) return;
        for (const field of definition.fields) {
            if (field.type === "section" || !field.name || !isMissing(field, getNested(data, field.name))) continue;
            const identity = [key, field.name].join(":");
            if (!findings.has(identity)) findings.set(identity, {
                key,
                title: definition.title || key,
                field: field.label || field.name
            });
        }
    };
    for (const [key, definition] of Object.entries(modules.configurations || {})) {
        const data = configState.configurations?.[key];
        inspect(key, definition, data, Boolean(data?.configured));
    }
    for (const [key, definition] of Object.entries(modules.lists || {})) {
        for (const record of configState.lists?.[key] || []) inspect(key, definition, record, true);
    }
    return [...findings.values()];
}

function findConfiguredUnassignableRoles(modules) {
    const findings = new Map();
    const roleManagement = resources.roleManagement;
    if (!roleManagement) return null;

    const roleById = new Map((resources.roles || []).map(role => [String(role.id), role]));
    const blockedById = new Map((roleManagement.unmanageableRoles || []).map(role => [String(role.id), role]));
    const add = (rawId, moduleKey, definition, source) => {
        const id = String(rawId || "");
        if (!/^\d{17,20}$/.test(id) || !roleById.has(id)) return;
        const role = roleById.get(id);
        const hierarchyBlocked = blockedById.has(id);
        if (roleManagement.canManageRoles && !hierarchyBlocked) return;
        const identity = `${moduleKey}:${id}:${source}`;
        if (!findings.has(identity)) findings.set(identity, {
            key: moduleKey,
            title: definition?.title || moduleKey,
            roleId: id,
            roleName: role.name,
            source,
            reason: !roleManagement.canManageRoles ? "Falta Gestionar roles" : "Rol al nivel del bot o por encima"
        });
    };
    const addButtons = (buttons, moduleKey, definition, source) => {
        for (const button of Array.isArray(buttons) ? buttons : []) {
            if (button?.action === "role") add(button.roleId, moduleKey, definition, source);
        }
    };

    const configurations = modules.configurations || {};
    const config = configState.configurations || {};
    const autoroles = config.autoroles;
    if (autoroles && autoroles.enabled !== false) {
        add(autoroles.userRole, "autoroles", configurations.autoroles, "Autorol para miembros");
        add(autoroles.botRole, "autoroles", configurations.autoroles, "Autorol para bots");
    }
    const birthday = config.birthday;
    if (birthday?.roleId) add(birthday.roleId, "birthday", configurations.birthday, "Rol de cumpleaños");
    const boosts = config.boosts;
    if (boosts) {
        for (const field of ["boosterRole", "boosterVipRole", "boosterLegendRole"]) {
            if (boosts[field]) add(boosts[field], "boosts", configurations.boosts, "Rol de boost");
        }
        addButtons(boosts.boostButtons, "boosts", configurations.boosts, "Botón para reclamar rol");
    }
    const welcome = config.welcome;
    if (welcome) addButtons(welcome.Buttons, "welcome", configurations.welcome, "Botón para reclamar rol");

    const prestige = config.prestige;
    if (prestige?.enabled !== false && prestige?.prestigeRoles && typeof prestige.prestigeRoles === "object") {
        for (const [level, roleId] of Object.entries(prestige.prestigeRoles)) {
            if (roleId) add(roleId, "prestige", configurations.prestige, `Rol de prestigio ${level}`);
        }
    }
    const levelRewards = (configState.lists?.levelRewards || []);
    for (const item of levelRewards) {
        if (item.roleId) add(item.roleId, "levelRewards", modules.lists?.levelRewards, `Recompensa de nivel ${item.level ?? ""}`.trim());
    }
    for (const item of configState.lists?.shopItems || []) {
        if (item.roleId) add(item.roleId, "shopItems", modules.lists?.shopItems, "Tienda de roles");
    }

    return [...findings.values()];
}

function renderChecks(modules = currentModules) {
    if (!confirmDiscardChanges()) return;
    const memberBalanceButton = document.querySelector("#member-balance-update");
    if (memberBalanceButton) memberBalanceButton.hidden = true;
    activeFormGuard = null;
    currentModule = "__checks";
    nav.querySelectorAll(".nav-item").forEach(button => {
        const active = button.dataset.module === currentModule;
        button.classList.toggle("active", active);
        if (active) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
    });
    document.querySelector("#page-title").textContent = "Comprobaciones";
    const entries = [...Object.entries(modules.configurations), ...Object.entries(modules.lists)];
    const isModuleConfigured = key => modules.lists[key] ? (configState.lists[key] || []).length > 0 : Boolean(configState.configurations[key]?.configured);
    const pendingEntries = entries.filter(([key]) => !isModuleConfigured(key));
    const pendingSummary = pendingEntries.length
        ? `<section class="overview-pending"><div><span class="overview-pending-icon" aria-hidden="true">✦</span><div><strong>${pendingEntries.length} ${pendingEntries.length === 1 ? "sistema pendiente" : "sistemas pendientes"}</strong><small>Completa su configuración para dejar todo a tu gusto.</small></div></div><div class="overview-pending-links">${pendingEntries.slice(0, 5).map(([key, definition]) => `<button class="overview-pending-link" type="button" data-overview-module="${escapeHtml(key)}">${escapeHtml(definition.title)}<span>Configurar →</span></button>`).join("")}${pendingEntries.length > 5 ? `<span class="overview-more">y ${pendingEntries.length - 5} más</span>` : ""}</div></section>`
        : `<section class="overview-all-ready"><span aria-hidden="true">✓</span><div><strong>¡Todo está configurado!</strong><small>Tus sistemas principales ya están listos.</small></div></section>`;
    const unavailableChannels = findUnavailableChannelReferences(modules);
    const channelIntegrity = unavailableChannels.length
        ? `<section class="overview-integrity overview-integrity-warning"><div class="overview-integrity-heading"><span aria-hidden="true">!</span><div><strong>${unavailableChannels.length} referencias de canal necesitan revisión</strong><small>Estos canales guardados no aparecen en la lista actual del servidor. Puede que se hayan eliminado o que la referencia pertenezca a otro servidor.</small></div></div><div class="overview-integrity-links">${unavailableChannels.slice(0, 6).map(item => `<button type="button" data-overview-module="${escapeHtml(item.key)}"><span>${escapeHtml(item.title)}</span><small>Revisar configuración →</small></button>`).join("")}${unavailableChannels.length > 6 ? `<span class="overview-more">y ${unavailableChannels.length - 6} referencias más</span>` : ""}</div></section>`
        : `<section class="overview-integrity overview-integrity-ok"><div class="overview-integrity-heading"><span aria-hidden="true">✓</span><div><strong>Sin referencias de canal ausentes detectadas</strong><small>Las referencias de canal guardadas que se pudieron comprobar coinciden con los canales actuales del servidor.</small></div></div></section>`;
    const channelTypeMismatches = findChannelTypeMismatches(modules);
    const missingRequiredSettings = findMissingRequiredSettings(modules);
    const permissionIssues = resources.channelPermissions
        ? findConfiguredChannelPermissionIssues(modules)
        : null;
    const permissionIntegrity = permissionIssues === null
        ? `<section class="overview-integrity"><div class="overview-integrity-heading"><span aria-hidden="true">i</span><div><strong>No se pudieron verificar los permisos efectivos</strong><small>Discord no devolvió todos los datos necesarios. Revisa los permisos del bot directamente en los canales configurados.</small></div></div></section>`
        : permissionIssues.length
            ? `<section class="overview-integrity overview-integrity-warning"><div class="overview-integrity-heading"><span aria-hidden="true">!</span><div><strong>${permissionIssues.length} configuraciones con permisos de canal pendientes</strong><small>El bot podría no ver, enviar mensajes o insertar embeds en algunos canales que usan tus sistemas configurados.</small></div></div><div class="overview-integrity-links">${permissionIssues.slice(0, 6).map(item => `<button type="button" data-overview-module="${escapeHtml(item.key)}"><span>${escapeHtml(item.title)} · #${escapeHtml(item.channelName)}</span><small>Falta: ${escapeHtml(item.missing.join(", "))} · Revisar →</small></button>`).join("")}${permissionIssues.length > 6 ? `<span class="overview-more">y ${permissionIssues.length - 6} configuraciones más</span>` : ""}</div></section>`
            : `<section class="overview-integrity overview-integrity-ok"><div class="overview-integrity-heading"><span aria-hidden="true">✓</span><div><strong>Permisos básicos comprobados en los canales configurados</strong><small>El bot puede acceder a los canales detectados y dispone de los permisos básicos de publicación necesarios.</small></div></div></section>`;
    const roleManagement = resources.roleManagement;
    const roleManagementIntegrity = !roleManagement
        ? `<section class="overview-integrity"><div class="overview-integrity-heading"><span aria-hidden="true">i</span><div><strong>No se pudo verificar la gestión de roles</strong><small>Comprueba los permisos Gestionar roles y la posición del rol de Bryvex Bot en Ajustes del servidor.</small></div></div></section>`
        : !roleManagement.canManageRoles
            ? `<section class="overview-integrity overview-integrity-warning"><div class="overview-integrity-heading"><span aria-hidden="true">!</span><div><strong>A Bryvex Bot le falta Gestionar roles</strong><small>La asignación automática de roles, las recompensas de nivel y las reclamaciones de roles pueden fallar.</small></div></div></section>`
            : roleManagement.unmanageableRoles?.length
                ? `<section class="overview-integrity overview-integrity-warning"><div class="overview-integrity-heading"><span aria-hidden="true">!</span><div><strong>${roleManagement.unmanageableRoles.length} roles están al nivel del bot o por encima</strong><small>Discord no permite que el bot gestione roles iguales o superiores a su rol más alto. Baja esos roles por debajo del rol de Bryvex Bot si deben asignarse automáticamente.</small></div></div><div class="overview-integrity-links">${roleManagement.unmanageableRoles.slice(0, 6).map(role => `<span><span>@${escapeHtml(role.name)}</span><small>Posición ${role.position} · no gestionable</small></span>`).join("")}${roleManagement.unmanageableRoles.length > 6 ? `<span class="overview-more">y ${roleManagement.unmanageableRoles.length - 6} roles más</span>` : ""}</div></section>`
                : `<section class="overview-integrity overview-integrity-ok"><div class="overview-integrity-heading"><span aria-hidden="true">✓</span><div><strong>Permisos y jerarquía de roles comprobados</strong><small>Bryvex Bot tiene Gestionar roles y los roles no administrables se han identificado para evitar asignaciones que Discord rechazaría.</small></div></div></section>`;
    const configuredUnassignableRoles = findConfiguredUnassignableRoles(modules);
    const configuredRoleIntegrity = configuredUnassignableRoles === null
        ? `<section class="overview-integrity"><div class="overview-integrity-heading"><span aria-hidden="true">i</span><div><strong>No se pudo comprobar la asignación de roles configurados</strong><small>Vuelve a cargar el panel para verificar permisos y jerarquía del bot.</small></div></div></section>`
        : configuredUnassignableRoles.length
            ? `<section class="overview-integrity overview-integrity-warning"><div class="overview-integrity-heading"><span aria-hidden="true">!</span><div><strong>${configuredUnassignableRoles.length} asignaciones de roles podrían fallar</strong><small>Estos roles están usados por funciones de asignación y el bot no tiene permiso o jerarquía suficiente para entregarlos. No se modificó ninguna configuración.</small></div></div><div class="overview-integrity-links">${configuredUnassignableRoles.slice(0, 8).map(item => `<button type="button" data-overview-module="${escapeHtml(item.key)}"><span>@${escapeHtml(item.roleName)}</span><small>${escapeHtml(item.title)} · ${escapeHtml(item.source)} · ${escapeHtml(item.reason)} · Revisar →</small></button>`).join("")}${configuredUnassignableRoles.length > 8 ? `<span class="overview-more">y ${configuredUnassignableRoles.length - 8} asignaciones más</span>` : ""}</div></section>`
            : `<section class="overview-integrity overview-integrity-ok"><div class="overview-integrity-heading"><span aria-hidden="true">✓</span><div><strong>Los roles configurados para asignación son gestionables</strong><small>Se revisaron autoroles, roles de cumpleaños y boosts, botones de reclamación, recompensas de nivel, prestigios y tienda de roles.</small></div></div></section>`;
    const unavailableRoles = findUnavailableRoleReferences(modules);
    let recommendedStep = null;
    if (configuredUnassignableRoles?.length) {
        const issue = configuredUnassignableRoles[0];
        recommendedStep = { key: issue.key, eyebrow: "PERMISOS Y ROLES", title: "Revisa un rol que Bryvex no puede asignar", description: `${issue.title} utiliza el rol @${issue.roleName}, pero el bot no puede entregarlo: ${issue.reason.toLocaleLowerCase("es")}.`, action: "Revisar roles" };
    } else if (Array.isArray(permissionIssues) && permissionIssues.length) {
        const issue = permissionIssues[0];
        recommendedStep = { key: issue.key, eyebrow: "PERMISOS DE CANAL", title: "Corrige los permisos de un canal", description: `En #${issue.channelName}, a ${issue.title} le faltan permisos para funcionar correctamente: ${issue.missing.join(", ")}.`, action: "Revisar canal" };
    } else if (unavailableChannels.length) {
        const issue = unavailableChannels[0];
        recommendedStep = { key: issue.key, eyebrow: "REFERENCIAS DEL SERVIDOR", title: "Actualiza una referencia de canal", description: `${issue.title} guarda un canal que ya no aparece entre los canales actuales del servidor.`, action: "Actualizar configuración" };
    } else if (unavailableRoles.length) {
        const issue = unavailableRoles[0];
        recommendedStep = { key: issue.key, eyebrow: "REFERENCIAS DEL SERVIDOR", title: "Actualiza una referencia de rol", description: `${issue.title} guarda un rol que ya no aparece entre los roles actuales del servidor.`, action: "Actualizar configuración" };
    } else if (pendingEntries.length) {
        const [key, definition] = pendingEntries[0];
        recommendedStep = { key, eyebrow: "CONFIGURACIÓN INICIAL", title: `Continúa con ${definition.title}`, description: definition.description || "Revisa los ajustes de este sistema para completar la configuración de tu comunidad.", action: "Configurar sistema" };
    } else if (!resources.roleManagement || !resources.channelPermissions) {
        recommendedStep = { key: null, eyebrow: "VERIFICACIÓN INCOMPLETA", title: "Confirma los permisos del bot", description: "No se pudieron verificar todos los permisos de Discord. Revisa los avisos de diagnóstico de abajo antes de dar la configuración por validada.", action: null };
    }
    const setupGuide = recommendedStep
        ? `<section class="overview-next-step${recommendedStep.key ? "" : " overview-next-step-info"}"><div class="overview-next-step-marker" aria-hidden="true">${recommendedStep.key ? "01" : "!"}</div><div class="overview-next-step-copy"><span class="eyebrow">${escapeHtml(recommendedStep.eyebrow)}</span><h3>${escapeHtml(recommendedStep.title)}</h3><p>${escapeHtml(recommendedStep.description)}</p></div>${recommendedStep.key ? `<button type="button" data-overview-module="${escapeHtml(recommendedStep.key)}">${escapeHtml(recommendedStep.action)} <span aria-hidden="true">→</span></button>` : ""}</section>`
        : `<section class="overview-next-step overview-next-step-ready"><div class="overview-next-step-marker" aria-hidden="true">✓</div><div class="overview-next-step-copy"><span class="eyebrow">CONFIGURACIÓN COMPLETADA</span><h3>No hay pasos prioritarios pendientes</h3><p>Los módulos aparecen configurados y las comprobaciones de permisos disponibles no detectan problemas.</p></div></section>`;
    const roleIntegrity = unavailableRoles.length
        ? `<section class="overview-integrity overview-integrity-warning"><div class="overview-integrity-heading"><span aria-hidden="true">!</span><div><strong>${unavailableRoles.length} referencias de rol necesitan revisión</strong><small>Estos roles guardados no aparecen entre los roles actuales del servidor. Puede que se hayan eliminado o que la referencia pertenezca a otro servidor.</small></div></div><div class="overview-integrity-links">${unavailableRoles.slice(0, 6).map(item => `<button type="button" data-overview-module="${escapeHtml(item.key)}"><span>${escapeHtml(item.title)}</span><small>Revisar configuración →</small></button>`).join("")}${unavailableRoles.length > 6 ? `<span class="overview-more">y ${unavailableRoles.length - 6} referencias más</span>` : ""}</div></section>`
        : `<section class="overview-integrity overview-integrity-ok"><div class="overview-integrity-heading"><span aria-hidden="true">✓</span><div><strong>Sin referencias de rol ausentes detectadas</strong><small>Las referencias de rol guardadas que se pudieron comprobar coinciden con los roles actuales del servidor.</small></div></div></section>`;
    const requiredSettingsIntegrity = missingRequiredSettings.length
        ? '<section class="overview-integrity overview-integrity-warning"><div class="overview-integrity-heading"><span aria-hidden="true">!</span><div><strong>' + missingRequiredSettings.length + ' campos obligatorios necesitan revisión</strong><small>Hay sistemas guardados con campos requeridos vacíos. Abre cada ajuste y completa los valores que falten.</small></div></div><div class="overview-integrity-links">' + missingRequiredSettings.slice(0, 8).map(item => '<button type="button" data-overview-module="' + escapeHtml(item.key) + '"><span>' + escapeHtml(item.title) + '</span><small>' + escapeHtml(item.field) + ' · Completar campo →</small></button>').join("") + (missingRequiredSettings.length > 8 ? '<span class="overview-more">y ' + (missingRequiredSettings.length - 8) + ' campos más</span>' : '') + '</div></section>'
        : '<section class="overview-integrity overview-integrity-ok"><div class="overview-integrity-heading"><span aria-hidden="true">✓</span><div><strong>No se detectaron campos obligatorios vacíos</strong><small>Se revisaron los campos requeridos de los sistemas configurados que exponen un esquema en la dashboard.</small></div></div></section>';
    const channelTypeIntegrity = channelTypeMismatches.length
        ? '<section class="overview-integrity overview-integrity-warning"><div class="overview-integrity-heading"><span aria-hidden="true">!</span><div><strong>' + channelTypeMismatches.length + ' canales no coinciden con el tipo esperado</strong><small>Algunos sistemas tienen seleccionado un canal que no coincide con el tipo admitido por ese ajuste.</small></div></div><div class="overview-integrity-links">' + channelTypeMismatches.slice(0, 6).map(item => '<button type="button" data-overview-module="' + escapeHtml(item.key) + '"><span>' + escapeHtml(item.title) + ' · #' + escapeHtml(item.channelName) + '</span><small>' + escapeHtml(item.field) + ' · Tipo de canal incompatible · Revisar →</small></button>').join("") + (channelTypeMismatches.length > 6 ? '<span class="overview-more">y ' + (channelTypeMismatches.length - 6) + ' casos más</span>' : '') + '</div></section>'
        : '<section class="overview-integrity overview-integrity-ok"><div class="overview-integrity-heading"><span aria-hidden="true">✓</span><div><strong>Tipos de canal compatibles</strong><small>Los canales seleccionados coinciden con los tipos definidos para los ajustes que se pudieron comprobar.</small></div></div></section>';
    const intelligenceFindings = [];
    if (configuredUnassignableRoles?.length) {
        const issue = configuredUnassignableRoles[0];
        intelligenceFindings.push({ priority: 1, key: issue.key, category: "Permisos y roles", title: "Corrige una asignación de rol", detail: `${issue.title} usa @${issue.roleName}, pero el bot no puede asignarlo: ${issue.reason}.`, action: "Revisar roles", count: configuredUnassignableRoles.length });
    }
    if (Array.isArray(permissionIssues) && permissionIssues.length) {
        const issue = permissionIssues[0];
        intelligenceFindings.push({ priority: 2, key: issue.key, category: "Permisos de canal", title: "Un sistema podría no funcionar en su canal", detail: `En #${issue.channelName} faltan permisos: ${issue.missing.join(", ")}.`, action: "Revisar canal", count: permissionIssues.length });
    }
    if (unavailableChannels.length) {
        const issue = unavailableChannels[0];
        intelligenceFindings.push({ priority: 3, key: issue.key, category: "Integridad", title: "Actualiza una referencia de canal", detail: `${issue.title} apunta a un canal que no aparece entre los canales actuales del servidor.`, action: "Actualizar canal", count: unavailableChannels.length });
    }
    if (unavailableRoles.length) {
        const issue = unavailableRoles[0];
        intelligenceFindings.push({ priority: 4, key: issue.key, category: "Integridad", title: "Actualiza una referencia de rol", detail: `${issue.title} apunta a un rol que no aparece entre los roles actuales del servidor.`, action: "Actualizar rol", count: unavailableRoles.length });
    }
    if (missingRequiredSettings.length) {
        const issue = missingRequiredSettings[0];
        intelligenceFindings.push({ priority: 5, key: issue.key, category: "Configuración", title: "Completa un campo obligatorio", detail: `${issue.title}: el campo “${issue.field}” está vacío y podría impedir que este sistema funcione como se espera.`, action: "Completar campo", count: missingRequiredSettings.length });
    }
    if (channelTypeMismatches.length) {
        const issue = channelTypeMismatches[0];
        intelligenceFindings.push({ priority: 6, key: issue.key, category: "Compatibilidad", title: "Selecciona un canal compatible", detail: `${issue.title} tiene “${issue.field}” asignado a #${issue.channelName}, cuyo tipo no coincide con el requerido por ese ajuste.`, action: "Corregir canal", count: channelTypeMismatches.length });
    }
    if (!resources.roleManagement) {
        intelligenceFindings.push({ priority: 7, key: null, category: "Verificación incompleta", title: "No se pudo verificar la jerarquía de roles", detail: "Comprueba en Discord que Bryvex Bot tenga Gestionar roles y que su rol esté por encima de los roles que debe asignar.", action: null, count: 1 });
    } else if (!resources.roleManagement.canManageRoles) {
        intelligenceFindings.push({ priority: 7, key: null, category: "Permisos del bot", title: "Falta el permiso Gestionar roles", detail: "Las funciones que asignan o retiran roles pueden fallar hasta que concedas este permiso al bot.", action: null, count: 1 });
    }
    if (!intelligenceFindings.length && pendingEntries.length) {
        const [key, definition] = pendingEntries[0];
        intelligenceFindings.push({ priority: 8, key, category: "Siguiente paso", title: `Continúa con ${definition.title}`, detail: definition.description || "Configura este sistema para completar la preparación de tu servidor.", action: "Configurar sistema", count: pendingEntries.length });
    }
    intelligenceFindings.sort((a, b) => a.priority - b.priority);
    const visibleIntelligenceFindings = intelligenceFindings.slice(0, 3);
    const intelligenceStatus = intelligenceFindings.length
        ? `${intelligenceFindings.length} prioridades detectadas`
        : "Sin incidencias detectadas";
    const checksIntelligence = `<section class="intelligence-panel checks-intelligence-panel" aria-labelledby="checks-intelligence-title"><div class="intelligence-heading"><div><div class="eyebrow">BRYVEX INTELLIGENCE</div><h3 id="checks-intelligence-title">Diagnóstico y próximos pasos</h3><p>Hallazgos priorizados según los datos disponibles. Cada acción abre el sistema relacionado para que puedas revisar la configuración.</p></div><span class="intelligence-status">${escapeHtml(intelligenceStatus)}</span></div><div class="intelligence-list">${visibleIntelligenceFindings.length ? visibleIntelligenceFindings.map((item, index) => `<article class="intelligence-item"><span class="intelligence-number">0${index + 1}</span><div class="intelligence-copy"><span class="intelligence-category">${escapeHtml(item.category)}</span><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p><small>${item.count > 1 ? `${item.count} casos detectados en esta categoría.` : "Prioridad calculada por las comprobaciones disponibles."}</small></div>${item.key ? `<button class="intelligence-action" type="button" data-overview-module="${escapeHtml(item.key)}">${escapeHtml(item.action)} <span aria-hidden="true">→</span></button>` : ""}</article>`).join("") : '<article class="intelligence-empty"><strong>No se detectaron problemas prioritarios.</strong><p>Las comprobaciones disponibles no han encontrado incidencias en las referencias y permisos que se pudieron verificar. Esto no sustituye una prueba funcional en Discord.</p></article>'}</div></section>`;
    content.innerHTML = `<div class="checks-page"><header class="checks-page-heading"><div class="eyebrow">ESTADO DEL SERVIDOR</div><h2>Comprobaciones de Bryvex</h2><p>Revisa permisos, roles y referencias guardadas para detectar problemas antes de que afecten a los sistemas de tu comunidad.</p></header>${checksIntelligence}<section class="checks-summary"><article><span>Sistemas pendientes</span><strong>${pendingEntries.length}</strong></article><article><span>Referencias de canal</span><strong>${unavailableChannels.length}</strong></article><article><span>Referencias de rol</span><strong>${unavailableRoles.length}</strong></article><article><span>Permisos de canal</span><strong>${permissionIssues === null ? "—" : permissionIssues.length}</strong></article></section>${setupGuide}${pendingSummary}<div class="checks-section-heading"><div class="eyebrow">DIAGNÓSTICO</div><h3>Permisos e integridad de la configuración</h3><p>Los resultados se calculan con los datos disponibles del servidor y la configuración guardada.</p></div>${channelIntegrity}${channelTypeIntegrity}${requiredSettingsIntegrity}${roleIntegrity}${permissionIntegrity}${roleManagementIntegrity}${configuredRoleIntegrity}</div>`;
    content.querySelectorAll("[data-overview-module]").forEach(button => button.addEventListener("click", () => navigateToModule(button.dataset.overviewModule, modules)));
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
    const completion = total ? Math.round(configured / total * 100) : 0;
    const quickStart = ["welcome", "socialAlerts", "autoroles", "levelSettings"]
        .map(key => [key, modules.configurations[key] || modules.lists[key]])
        .filter(([, definition]) => definition)
        .slice(0, 4)
        .map(([key, definition]) => `<button class="overview-quick-link${isModuleConfigured(key) ? " is-configured" : " is-pending"}" type="button" data-overview-module="${escapeHtml(key)}"><span>${escapeHtml(definition.title)}</span><span aria-hidden="true">→</span></button>`)
        .join("");
    const recommendationOrder = [
        { keys: ["logs", "antiScam", "antiInvites", "raidDetection"], title: "Refuerza la seguridad", detail: "Revisa los registros y las protecciones para detectar actividad sospechosa.", category: "Seguridad", priority: 1 },
        { keys: ["welcome", "autoroles", "leaves"], title: "Prepara la llegada de nuevos miembros", detail: "Configura bienvenidas, roles automáticos y mensajes de salida.", category: "Comunidad", priority: 2 },
        { keys: ["inviteTracker", "stats"], title: "Mejora el seguimiento del servidor", detail: "Activa el seguimiento de invitaciones y las estadísticas del servidor.", category: "Seguimiento", priority: 3 },
        { keys: ["levelSettings", "levels", "economy", "socialAlerts"], title: "Activa la participación", detail: "Añade incentivos y avisos para mantener a tu comunidad activa.", category: "Participación", priority: 4 }
    ];
    const diagnosticRecommendations = [];
    const homeMissingRequiredSettings = findMissingRequiredSettings(modules);
    const homeChannelTypeMismatches = findChannelTypeMismatches(modules);
    if (homeMissingRequiredSettings.length) {
        const issue = homeMissingRequiredSettings[0];
        diagnosticRecommendations.push({
            category: "Diagnóstico",
            title: "Completa un ajuste obligatorio",
            detail: issue.title + " tiene un campo requerido vacío: " + issue.field + ".",
            moduleKey: issue.key,
            moduleTitle: issue.title,
            pendingCount: homeMissingRequiredSettings.length
        });
    }
    if (homeChannelTypeMismatches.length) {
        const issue = homeChannelTypeMismatches[0];
        diagnosticRecommendations.push({
            category: "Diagnóstico",
            title: "Corrige un canal incompatible",
            detail: issue.title + " tiene un canal seleccionado que no coincide con el tipo esperado: #" + issue.channelName + ".",
            moduleKey: issue.key,
            moduleTitle: issue.title,
            pendingCount: homeChannelTypeMismatches.length
        });
    }
    const recommendations = recommendationOrder.map(item => {
        const available = item.keys.filter(key => modules.configurations[key] || modules.lists[key]);
        if (!available.length) return null;
        const pending = available.filter(key => !isModuleConfigured(key));
        if (!pending.length) return null;
        return { ...item, moduleKey: pending[0], moduleTitle: (modules.configurations[pending[0]] || modules.lists[pending[0]]).title, pendingCount: pending.length };
    }).filter(Boolean);
    recommendations.unshift(...diagnosticRecommendations);
    recommendations.splice(3);
    const intelligenceStatus = recommendations.length
        ? "Hay mejoras que puedes aplicar"
        : pendingEntries.length
            ? "Vamos a completar tu configuración"
            : "Todos los módulos aparecen configurados";
    const intelligenceCards = recommendations.length
        ? recommendations.map((item, index) => `<article class="intelligence-item"><span class="intelligence-number">0${index + 1}</span><div class="intelligence-copy"><span class="intelligence-category">${escapeHtml(item.category)}</span><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p><small>Siguiente paso: ${escapeHtml(item.moduleTitle)}${item.pendingCount > 1 ? ` · ${item.pendingCount} sistemas pendientes en esta área` : ""}</small></div><button class="intelligence-action" type="button" data-overview-module="${escapeHtml(item.moduleKey)}">Revisar <span aria-hidden="true">→</span></button></article>`).join("")
        : pendingEntries.length
            ? `<article class="intelligence-empty"><strong>Elige el próximo sistema que quieres preparar.</strong><p>Bryvex puede guiarte por las secciones pendientes; empieza por la que más necesite tu comunidad.</p><button class="intelligence-action" type="button" data-overview-module="${escapeHtml(pendingEntries[0][0])}">Empezar con ${escapeHtml(pendingEntries[0][1].title)} <span aria-hidden="true">→</span></button></article>`
            : '<article class="intelligence-empty"><strong>Buen trabajo: todos los módulos aparecen configurados.</strong><p>Este resumen se basa en la configuración guardada; no sustituye una prueba en Discord de los permisos ni del funcionamiento de cada sistema.</p></article>';
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
    content.innerHTML = `<div class="overview-page"><section class="overview-hero"><div class="overview-hero-copy"><div class="overview-server-mark">${avatar}</div><div class="overview-welcome"><div class="eyebrow">PANEL DE TU COMUNIDAD</div><h2>Bienvenido a ${escapeHtml(guild?.name || "tu servidor")}</h2><p>Administra los sistemas de tu comunidad y continúa configurando tu espacio desde aquí.</p></div><nav class="overview-quick-links" aria-label="Accesos rápidos">${quickStart}</nav></div><aside class="overview-readiness" aria-label="Progreso de configuración"><div class="overview-readiness-ring" style="--completion:${completion}%"><div><strong>${completion}%</strong><small>LISTO</small></div></div><div class="overview-readiness-copy"><span class="eyebrow">ESTADO GENERAL</span><strong>${configured} de ${total}</strong><small>sistemas configurados</small></div></aside><div class="overview-hero-glow" aria-hidden="true"></div></section><section class="overview-stats" aria-label="Resumen del servidor"><article><span>Configurados</span><strong>${configured}<small> / ${total}</small></strong></article><article><span>Por configurar</span><strong>${pendingEntries.length}</strong></article><article><span>Servidor seleccionado</span><strong class="overview-server-name">${escapeHtml(guild?.name || "Discord")}</strong></article></section><section class="intelligence-panel" aria-labelledby="intelligence-title"><div class="intelligence-heading"><div><div class="eyebrow">BRYVEX INTELLIGENCE</div><h3 id="intelligence-title">Recomendaciones para tu servidor</h3><p>Prioridades calculadas según los módulos que tienes pendientes.</p></div><span class="intelligence-status">${intelligenceStatus}</span></div><div class="intelligence-list">${intelligenceCards}</div></section><div class="overview-section-title"><div><div class="eyebrow">PANEL DE CONTROL</div><h3>Explora tus sistemas</h3></div><span>Elige una sección para empezar</span></div><section class="overview-grid">${categories}</section></div>`;
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
    if (field.type === "boolean" && /^sistema activo$/i.test(String(field.label || "").trim())) {
        return `<div class="field checkbox-field system-toggle-field"><span><strong>${escapeHtml(field.label)}</strong>${help}</span><button id="${id}" class="system-toggle ${safeValue ? "is-active" : ""}" type="button" name="${escapeHtml(field.name)}" data-toggle-field="${escapeHtml(field.name)}" data-enabled="${safeValue ? "true" : "false"}" aria-pressed="${safeValue ? "true" : "false"}">${safeValue ? "ACTIVO" : "DESACTIVADO"}</button></div>`;
    }
    if (field.type === "boolean") {
        return `<label class="field checkbox-field" for="${id}"><span><strong>${escapeHtml(field.label)}</strong>${help}</span><input id="${id}" name="${escapeHtml(field.name)}" type="checkbox" ${safeValue ? "checked" : ""}></label>`;
    }
    if (field.type === "select") {
        const options = field.options.map(option => `<option value="${escapeHtml(option)}" ${safeValue === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("");
        return `<label class="field" for="${id}"><span>${escapeHtml(field.label)}</span><select id="${id}" name="${escapeHtml(field.name)}" ${required}><option value="">Elige una opción</option>${options}</select>${help}</label>`;
    }
    if (["kick-channel", "social-channel"].includes(field.type)) {
        const current = String(safeValue || "");
        const pickerType = field.type === "social-channel" ? "data-social-channel-picker" : "data-kick-channel-picker";
        return `<div class="field kick-channel-field" ${pickerType}><label for="${id}" data-channel-label>${escapeHtml(field.label)}</label><div class="kick-channel-control"><input id="${id}" type="search" data-kick-channel-query value="${escapeHtml(current)}" maxlength="${field.maxLength || 50}" placeholder="Buscar un canal de Kick" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false"><input type="hidden" name="${escapeHtml(field.name)}" value="${escapeHtml(current)}"><div class="kick-channel-selected" data-kick-channel-selected ${current ? "" : "hidden"}></div><div class="kick-channel-results" data-kick-channel-results role="listbox" hidden></div><div class="kick-channel-status" data-kick-channel-status role="status" aria-live="polite"></div></div>${help}</div>`;
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
        if (field.maxItems) {
            const staleOptions = values.filter(current => !options.some(option => option.id === current)).map(current => ({ id: current, name: `ID guardado: ${current}` }));
            const itemOptions = [...staleOptions, ...options];
            const noun = field.type === "role-list" ? "roles" : "canales";
            const icon = field.type === "role-list" ? "@" : "#";
            return `<div class="field role-picker-field" data-role-picker="${escapeHtml(field.name)}" data-max-selected="${field.maxItems}" data-item-label="${noun}"><span>${escapeHtml(field.label)}</span><details class="role-picker"><summary class="role-picker-trigger"><span data-role-summary>${values.length ? `${values.length} de ${field.maxItems} ${noun} seleccionados` : `Selecciona hasta ${field.maxItems} ${noun}`}</span><span class="role-picker-chevron" aria-hidden="true">⌄</span></summary><div class="role-picker-menu"><input type="search" class="role-picker-search" placeholder="Buscar ${noun}…" aria-label="Buscar ${noun}"><div class="role-picker-options" role="group" aria-label="${escapeHtml(field.label)}">${itemOptions.map(option => `<label class="role-picker-option" data-role-name="${escapeHtml(normalizeSearch(option.name))}"><input type="checkbox" value="${escapeHtml(option.id)}" data-role-option ${values.includes(option.id) ? "checked" : ""}><span>${icon}</span><span>${escapeHtml(option.name)}</span></label>`).join("")}</div></div></details><small>Selecciona hasta ${field.maxItems} ${noun}. Haz clic para añadir o quitar cada elemento.</small></div>`;
        }
        const stale = values.filter(current => !options.some(option => option.id === current)).map(current => `<option value="${escapeHtml(current)}" selected>ID guardado: ${escapeHtml(current)}</option>`).join("");
        return `<label class="field" for="${id}"><span>${escapeHtml(field.label)}</span><select id="${id}" name="${escapeHtml(field.name)}" multiple size="5" ${field.maxItems ? `data-max-selected="${field.maxItems}"` : ""}>${stale}${options.map(option => `<option value="${escapeHtml(option.id)}" ${values.includes(option.id) ? "selected" : ""}>${escapeHtml(option.name)}</option>`).join("")}</select><small>${field.maxItems ? `Selecciona hasta ${field.maxItems} roles. ` : ""}Mantén Ctrl o Cmd para seleccionar varios.</small></label>`;
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

async function renderAudit(page = 1, perPage = 25) {
    if (!confirmDiscardChanges()) return;
    const memberBalanceButton = document.querySelector("#member-balance-update");
    if (memberBalanceButton) memberBalanceButton.hidden = true;
    activeFormGuard = null;
    currentModule = "__audit";
    nav.querySelectorAll(".nav-item").forEach(button => {
        const active = button.dataset.module === currentModule;
        button.classList.toggle("active", active);
        if (active) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
    });
    document.querySelector("#page-title").textContent = "Auditoría";
    content.innerHTML = `<section class="audit-card"><header class="audit-heading"><div><div class="eyebrow">PRINCIPAL</div><h2>Registro de actividad</h2><p>Consulta quién cambió la configuración de este servidor desde la web.</p></div><span class="audit-live-mark">● Registro activo</span></header><div class="audit-table-wrap"><table class="audit-table"><thead><tr><th>Fecha</th><th>Usuario de Discord</th><th>Acción</th></tr></thead><tbody><tr><td colspan="3"><div class="audit-loading">Cargando actividad…</div></td></tr></tbody></table></div><footer class="audit-pagination"><label>Filas por página<select data-audit-size><option value="10" ${perPage === 10 ? "selected" : ""}>10</option><option value="25" ${perPage === 25 ? "selected" : ""}>25</option><option value="50" ${perPage === 50 ? "selected" : ""}>50</option></select></label><div class="audit-page-actions"><span data-audit-page-label></span><button type="button" data-audit-page="${Math.max(1, page - 1)}" ${page <= 1 ? "disabled" : ""} aria-label="Página anterior">←</button><button type="button" data-audit-page="${page + 1}" aria-label="Página siguiente">→</button></div></footer></section>`;
    const tbody = content.querySelector(".audit-table tbody");
    try {
        const result = await api(`/api/guilds/${encodeURIComponent(guildId)}/audit?page=${page}&perPage=${perPage}`);
        if (currentModule !== "__audit") return;
        const totalPages = result.totalPages || 1;
        if (page > totalPages) return renderAudit(totalPages, perPage);
        if (!result.entries.length) {
            tbody.innerHTML = '<tr><td colspan="3"><div class="audit-empty">Todavía no hay cambios registrados desde la web.</div></td></tr>';
        } else {
            tbody.innerHTML = result.entries.map(entry => {
                const created = new Date(entry.createdAt);
                const validDate = !Number.isNaN(created.getTime());
                const date = validDate ? new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" }).format(created) : "—";
                const dateTime = validDate ? created.toISOString() : "";
                const actor = entry.actorUsername
                    ? `<a href="https://discord.com/users/${encodeURIComponent(entry.actorId)}" target="_blank" rel="noopener noreferrer">@${escapeHtml(entry.actorUsername)}</a>`
                    : `<span class="audit-unknown-user">Usuario · ${escapeHtml(entry.actorId)}</span>`;
                return `<tr><td><time datetime="${escapeHtml(dateTime)}">${escapeHtml(date)}</time></td><td>${actor}</td><td>${escapeHtml(entry.action)}</td></tr>`;
            }).join("");
        }
        content.querySelector("[data-audit-page-label]").textContent = `Página ${page} de ${totalPages} · ${result.total} cambios`;
        content.querySelectorAll("[data-audit-page]").forEach(button => {
            const target = Number(button.dataset.auditPage);
            button.disabled = target < 1 || target > totalPages;
            button.addEventListener("click", () => renderAudit(target, perPage));
        });
        content.querySelector("[data-audit-size]").addEventListener("change", event => renderAudit(1, Number(event.currentTarget.value)));
    } catch (error) {
        if (currentModule !== "__audit") return;
        tbody.innerHTML = `<tr><td colspan="3"><div class="audit-empty">${escapeHtml(error.message)}</div></td></tr>`;
    }
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

function renderPreviewTemplate(template, overrides = {}) {
    const samples = {
        usuario: "Bryant", user: "Bryant", member: "Bryant", mention: "Bryant",
        username: "Bryant", user_name: "Bryant", nombreusuario: "Bryant", nombre_usuario: "Bryant", name: "Bryant", usertag: "Bryant", user_tag: "Bryant",
        id: "123456789012345678", userid: "123456789012345678", user_id: "123456789012345678", memberid: "123456789012345678", member_id: "123456789012345678",
        servidor: "Bryant's Family", server: "Bryant's Family", servername: "Bryant's Family", server_name: "Bryant's Family", guild: "Bryant's Family", guildname: "Bryant's Family", guild_name: "Bryant's Family",
        serverid: "1552352310418202717", server_id: "1552352310418202717", guildid: "1552352310418202717", guild_id: "1552352310418202717",
        miembros: "128", members: "128", membercount: "128", member_count: "128", memberscount: "128", members_count: "128", cuenta: "hace 2 años", createdat: "hace 2 años", created_at: "hace 2 años", accountcreated: "hace 2 años", account_created: "hace 2 años", accountage: "hace 2 años", account_age: "hace 2 años",
        nivel: "5", level: "5", xp: "250", recompensa: "500", reward: "500", coins: "500", monedas: "500", rol: "Miembro VIP", role: "Miembro VIP", boosts: "12"
    };
    Object.assign(samples, {
        users_rewarded: "65",
        total_coins: "1.628.117",
        days_until_drop: "7",
        next_drop: "en 7 días"
    });
    Object.assign(samples, {
        channel: "CanalDemo",
        title: "Jugando con la comunidad",
        viewers: "1.234",
        category: "Charlando",
        url: "https://kick.com/CanalDemo"
    });
    Object.assign(samples, overrides);
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

    if (key === "socialAlerts") {
        const alertColor = /^#[\da-f]{6}$/i.test(String(values.color || "")) ? values.color : "#53fc18";
        const platform = ["TikTok", "Twitch", "YouTube"].includes(values.platform) ? values.platform : "Kick";
        const sampleLogin = platform === "TikTok" ? "usuario_demo" : platform === "Twitch" ? "streamer_demo" : platform === "YouTube" ? "canal_demo" : "CanalDemo";
        const sampleUrl = platform === "TikTok" ? "https://www.tiktok.com/@usuario_demo/live" : platform === "Twitch" ? "https://www.twitch.tv/streamer_demo" : platform === "YouTube" ? "https://www.youtube.com/@canal_demo/live" : "https://kick.com/CanalDemo";
        const sampleValues = { channel: sampleLogin, platform, url: sampleUrl };
        const alertTitle = renderPreviewTemplate(values.title, sampleValues).trim();
        const alertMessage = renderPreviewTemplate(values.description, sampleValues).trim();
        const avatar = safePreviewImage(values.avatarUrl);
        const sampleChannel = sampleLogin;
        const author = escapeHtml(values.displayName || sampleChannel);
        const avatarBlock = avatar
            ? `<img class="message-preview-avatar" data-preview-image src="${escapeHtml(avatar)}" alt="Avatar configurado">`
            : '<span class="social-alert-preview-avatar" aria-hidden="true">🎥</span>';
        const header = `<div class="social-alert-preview-author">${avatarBlock}<strong>${author}</strong><span>APP</span><small>ahora</small></div>`;
        const copy = [alertTitle ? `<h3>${escapeHtml(alertTitle)}</h3>` : `<h3>🔴 ${sampleChannel} está en vivo en ${platform}</h3>`, '<hr class="discord-preview-separator">', alertMessage ? `<p>${escapeHtml(alertMessage)}</p>` : `<p class="preview-empty">Escribe el mensaje para ver aquí la alerta de ${platform}.</p>`].join("");
        return `<section class="live-preview social-alert-live-preview" data-preview="${key}"><div class="live-preview-heading"><span class="eyebrow">VISTA PREVIA</span><small>Mensaje Componentes V2 que aparecerá en Discord</small></div>${header}<article class="discord-preview" style="--preview-accent:${alertColor}">${media}<div class="discord-preview-body"><div class="discord-preview-copy">${copy}</div></div></article></section>`;
    }

    if (key === "polls") {
        const question = String(values.question || "").trim();
        const options = Array.isArray(values.options) ? values.options.map(option => String(option || "").trim()).filter(Boolean).slice(0, 4) : [];
        const duration = Math.max(1, Math.min(10080, Number(values.duration) || 60));
        const optionMarkup = options.length
            ? options.map((option, index) => `<li><span>${index + 1}️⃣ ${escapeHtml(option)}</span><small>0 votos</small></li>`).join("")
            : '<li class="poll-preview-empty">Las opciones que escribas aparecerán aquí.</li>';
        return `<section class="live-preview poll-live-preview" data-preview="polls"><div class="live-preview-heading"><span class="eyebrow">VISTA PREVIA</span><small>Así se verá la encuesta en Discord</small></div><article class="discord-preview" style="--preview-accent:#5865f2"><div class="discord-preview-body"><div class="discord-preview-copy poll-preview-copy"><small>ENCUESTA · BRYVEX BOT</small><h3>${escapeHtml(question || "Tu pregunta aparecerá aquí")}</h3><hr class="discord-preview-separator"><ol class="poll-preview-options">${optionMarkup}</ol><p class="poll-preview-duration">Duración: ${duration} ${duration === 1 ? "minuto" : "minutos"}</p></div></div></article></section>`;
    }
    if (key === "weeklyDrop") {
        const description = renderPreviewTemplate(values.description).trim();
        const banner = safePreviewImage(values.banner);
        const media = banner ? `<div class="message-preview-banner"><img data-preview-image src="${escapeHtml(banner)}" alt="Banner del drop semanal"></div>` : "";
        return `<section class="live-preview" data-preview="${key}"><div class="live-preview-heading"><span class="eyebrow">VISTA PREVIA</span><small>Mensaje Componentes V2 para el drop</small></div><article class="discord-preview" style="--preview-accent:${color}">${media}<div class="discord-preview-body"><div class="discord-preview-copy"><h3>🪙 Weekly Drop Repartido</h3><hr class="discord-preview-separator">${description ? `<p>${escapeHtml(description)}</p>` : '<p class="preview-empty">Escribe una descripción y añade variables dinámicas para ver el aviso.</p>'}</div></div></article></section>`;
    }

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
        const buttonPreview = configuredButtons.length ? `<div class="discord-preview-buttons">${configuredButtons.map(button => { const isRole = button.action === "role"; const roleName = isRole ? resources.roles.find(role => role.id === button.roleId)?.name : ""; const detail = isRole ? (roleName || "Rol sin seleccionar") : (button.url ? "Enlace configurado" : "Enlace pendiente"); return `<span class="discord-preview-button ${isRole ? "role-button" : "link-button"}"><span class="discord-preview-button-main">${button.emoji ? `<span class="discord-preview-button-emoji">${escapeHtml(button.emoji)}</span>` : ""}${escapeHtml(button.label)}<span class="discord-preview-button-kind">${isRole ? "ROL" : "ENLACE"}</span></span><small>${escapeHtml(detail)}</small></span>`; }).join("")}</div>` : "";
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
    if (key === "socialAlerts") return { title: read("title"), description: read("messageTemplate"), color: read("color"), banner: read("image"), avatarUrl: read("avatarUrl"), displayName: read("displayName"), platform: read("platform") };
    if (key === "welcome") return { title: read("Title"), description: read("MessageDes"), color: read("Color"), banner: read("Banner"), thumbnail: read("Thumbnail"), buttons: form.querySelector('[data-button-list="Buttons"]') ? readButtonRows(form.querySelector('[data-button-list="Buttons"]')) : [], sendDM: form.elements.namedItem("SendDM")?.checked, dmTitle: read("DMTitle"), dmDescription: read("DMMessage"), dmColor: read("DMColor"), dmBanner: read("DMBanner"), dmThumbnail: read("DMThumbnail") };
    if (key === "leaves") return { title: read("Title"), description: read("MessageDes"), color: read("Color"), banner: read("Banner"), thumbnail: read("Thumbnail") };
    if (key === "birthday") return { title: read("birthdayTitle"), description: read("birthdayDescription"), color: read("birthdayColor"), banner: read("birthdayBanner"), reminder: read("birthdayReminder") };
    if (key === "boosts") return { title: read("boostTitle"), description: read("boostDescription"), color: read("boostColor"), banner: read("boostImage"), thumbnail: read("boostThumbnail"), buttons: form.querySelector('[data-button-list="boostButtons"]') ? readButtonRows(form.querySelector('[data-button-list="boostButtons"]')) : [] };
    if (key === "weeklyDrop") return { description: read("description"), banner: read("image") };
    return { messageTitle: read("messageLevelTitle"), messageDescription: read("messageLevelDescription"), voiceTitle: read("voiceLevelTitle"), voiceDescription: read("voiceLevelDescription"), roleTitle: read("levelRoleTitle"), roleDescription: read("levelRoleDescription"), color: read("levelColor"), image: read("levelImage"), thumbnail: read("levelThumbnail") };
}

function renderPreview(key, data) {
    if (!["welcome", "leaves", "boosts", "birthday", "levelSettings", "weeklyDrop", "socialAlerts"].includes(key)) return "";
    const values = key === "socialAlerts"
        ? { title: data.title, description: data.messageTemplate, color: data.color, banner: data.image, avatarUrl: data.avatarUrl, displayName: data.displayName, platform: data.platform }
        : key === "welcome"
        ? { title: data.Title, description: data.MessageDes, color: data.Color, banner: data.Banner, thumbnail: data.Thumbnail, buttons: data.Buttons, sendDM: data.SendDM, dmTitle: data.DMTitle, dmDescription: data.DMMessage, dmColor: data.DMColor, dmBanner: data.DMBanner, dmThumbnail: data.DMThumbnail }
        : key === "leaves"
            ? { title: data.Title, description: data.MessageDes, color: data.Color, banner: data.Banner, thumbnail: data.Thumbnail }
            : key === "birthday"
                ? { title: data.birthdayTitle, description: data.birthdayDescription, color: data.birthdayColor, banner: data.birthdayBanner, reminder: data.birthdayReminder }
        : key === "boosts"
                ? { title: data.boostTitle, description: data.boostDescription, color: data.boostColor, banner: data.boostImage, thumbnail: data.boostThumbnail, buttons: boostButtonsFor(data) }
                : key === "weeklyDrop"
                    ? { description: data.description, banner: data.image }
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
        if (field.type === "boolean") {
            const toggle = form.querySelector(`[data-toggle-field="${CSS.escape(field.name)}"]`);
            if (toggle) {
                result[field.name] = toggle.dataset.enabled === "true";
                continue;
            }
        }
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
        if (["role-list", "channel-list"].includes(field.type) && field.maxItems) {
            const picker = form.querySelector(`[data-role-picker="${CSS.escape(field.name)}"]`);
            result[field.name] = [...(picker?.querySelectorAll("[data-role-option]:checked") || [])].map(option => option.value);
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
        } else if (field.type === "number") {
            const rawValue = element.value.trim();
            value = rawValue === "" && field.optional ? null : rawValue === "" ? "" : Number(rawValue);
        }
        else value = element.value;
        result[field.name] = value;
    }
    return result;
}

function makeNav(modules) {
    nav.replaceChildren();
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
    const appendPrincipalEntry = (label, key, onClick, searchTerms = "") => {
        const entry = document.createElement("div");
        entry.className = "nav-entry";
        entry.dataset.module = key;
        entry.dataset.group = "Principal";
        entry.dataset.special = "true";
        entry.dataset.search = `${label} ${searchTerms}`.trim();
        const button = document.createElement("button");
        button.type = "button";
        button.className = "nav-item";
        button.textContent = label;
        button.dataset.module = key;
        button.addEventListener("click", onClick);
        entry.append(button);
        nav.append(entry);
    };
    appendHeading("Principal");
    appendPrincipalEntry("Inicio", "__home", navigateToHome);
    appendPrincipalEntry("Auditoría", "__audit", () => renderAudit());
    appendPrincipalEntry("Comprobaciones", "__checks", () => renderChecks(modules), "diagnóstico permisos roles canales referencias integridad configuración");
    const pinnedEntries = all.filter(([key]) => favoriteModules.has(key));
    if (pinnedEntries.length) {
        appendHeading("Favoritos");
        pinnedEntries.forEach(([key, definition]) => appendEntry(key, definition, "Favoritos"));
    }
    for (const category of categoriesOrder) {
        const group = all.filter(([key, definition]) => definition.category === category && !favoriteModules.has(key));
        if (category === "Economía y XP") {
            const memberIndex = group.findIndex(([key]) => key === "memberEconomy");
            const economyIndex = group.findIndex(([key]) => key === "economy");
            if (memberIndex !== -1 && economyIndex !== -1) {
                const [memberEntry] = group.splice(memberIndex, 1);
                group.splice(group.findIndex(([key]) => key === "economy") + 1, 0, memberEntry);
            }
        }
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
    const searchResults = document.querySelector("#module-search-results");
    searchResults?.addEventListener("click", event => {
        const button = event.target.closest("[data-result-key]");
        if (!button) return;
        const key = button.dataset.resultKey;
        const fieldName = button.dataset.resultField;
        favoritesOnly = false;
        favoritesToggle.classList.remove("active");
        favoritesToggle.setAttribute("aria-pressed", "false");
        favoritesToggle.textContent = "☆ Favoritos";
        searchInput.value = "";
        applyModuleFilter();
        navigateToModule(key, modules);
        if (fieldName) {
            window.requestAnimationFrame(() => {
                const field = [...content.querySelectorAll("[data-setting-field]")].find(element => element.dataset.settingField === fieldName);
                if (!field) return;
                field.scrollIntoView({ behavior: "smooth", block: "center" });
                field.classList.add("search-result-highlight");
                window.setTimeout(() => field.classList.remove("search-result-highlight"), 2200);
                const control = field.querySelector("input, textarea, select, button");
                if (control) control.focus({ preventScroll: true });
            });
        }
    });
    document.addEventListener("click", event => {
        if (!event.target.closest(".nav-tools")) {
            const panel = document.querySelector("#module-search-results");
            if (panel) panel.hidden = true;
            document.querySelector("#module-search")?.setAttribute("aria-expanded", "false");
        }
    });
    searchInput.addEventListener("focus", () => renderModuleSearchResults(normalizeSearch(searchInput.value)));
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

function renderMemberEconomy(definition) {
    const updateButton = document.querySelector("#member-balance-update");
    updateButton.hidden = true;
    updateButton.disabled = true;
    content.innerHTML = `<article class="settings-card member-economy-card"><div class="card-heading"><div><div class="eyebrow">${escapeHtml(definition.category)}</div><h2>${escapeHtml(definition.title)}</h2></div></div><p class="card-description">${escapeHtml(definition.description)}</p><section class="member-search-panel"><button class="member-picker-trigger" type="button" id="member-picker-trigger" aria-haspopup="listbox" aria-expanded="false"><span id="member-picker-label">Busca un miembro…</span><span aria-hidden="true">⌄</span></button><div class="member-picker-menu" id="member-picker-menu" hidden><label class="member-picker-search"><span aria-hidden="true">⌕</span><input type="search" id="member-economy-search" autocomplete="off" placeholder="Buscar un miembro…" aria-label="Buscar un miembro"></label><div id="member-economy-results" class="member-search-results" role="listbox"></div></div></section><section id="member-economy-detail" class="member-economy-detail" hidden></section></article>`;
    const trigger = content.querySelector("#member-picker-trigger");
    const label = content.querySelector("#member-picker-label");
    const menu = content.querySelector("#member-picker-menu");
    const input = content.querySelector("#member-economy-search");
    const results = content.querySelector("#member-economy-results");
    const detail = content.querySelector("#member-economy-detail");
    let timer;
    let selectedMemberId = null;
    let savedBalance = null;
    const closePicker = () => {
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
    };
    trigger.addEventListener("click", () => {
        const open = menu.hidden;
        menu.hidden = !open;
        trigger.setAttribute("aria-expanded", String(open));
        if (open) {
            input.value = "";
            results.replaceChildren();
            requestAnimationFrame(() => input.focus());
        }
    });
    input.addEventListener("input", () => {
        clearTimeout(timer);
        const query = input.value.trim();
        if (query.length < 2) { results.replaceChildren(); return; }
        timer = setTimeout(async () => {
            try {
                const response = await api(`/api/guilds/${encodeURIComponent(guildId)}/members/search?q=${encodeURIComponent(query)}`);
                if (!input.isConnected || input.value.trim() !== query) return;
                results.innerHTML = response.members.length ? response.members.map(member => {
                    const name = member.nick || member.globalName || member.username;
                    const avatar = member.avatar ? `https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.png?size=64` : "";
                    return `<button class="member-search-result" type="button" role="option" aria-selected="false" data-member-id="${escapeHtml(member.id)}" data-member-name="${escapeHtml(name)}"><img src="${avatar}" alt="" onerror="this.hidden=true"><strong>${escapeHtml(name)}</strong></button>`;
                }).join("") : '<p class="empty-state">No encontré miembros.</p>';
            } catch (error) { results.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`; }
        }, 250);
    });
    input.addEventListener("keydown", event => { if (event.key === "Escape") closePicker(); });
    content.addEventListener("click", event => { if (!event.target.closest(".member-search-panel")) closePicker(); });
    results.addEventListener("click", async event => {
        const button = event.target.closest("[data-member-id]");
        if (!button) return;
        selectedMemberId = button.dataset.memberId;
        label.textContent = button.dataset.memberName;
        detail.hidden = false;
        detail.innerHTML = '<article class="loading-card">Cargando economía…</article>';
        closePicker();
        try {
            const response = await api(`/api/guilds/${encodeURIComponent(guildId)}/members/${encodeURIComponent(selectedMemberId)}/economy`);
            if (!detail.isConnected || selectedMemberId !== button.dataset.memberId) return;
            const { member, economy } = response;
            const name = member.nick || member.globalName || member.username;
            const wallet = Number(economy.wallet || 0), bank = Number(economy.bank || 0);
            const inventory = Array.isArray(economy.inventory) ? economy.inventory : [];
            const achievements = Array.isArray(response.achievements) ? response.achievements : [];
            const stats = [["Racha diaria", economy.dailyStreak], ["Apuestas ganadas", economy.gamblesWon], ["Apuestas perdidas", economy.gamblesLost], ["Racha de apuestas", economy.gambleStreak], ["Jackpots", economy.jackpots], ["Récord de ganancia", economy.biggestWin], ["Deuda", economy.debt], ["Préstamo activo", economy.loanTaken ? "Sí" : "No"], ["Donado al banco", economy.bankDonated], ["Victorias de dados", economy.diceWins], ["Derrotas de dados", economy.diceLosses], ["Potenciadores activos", Array.isArray(economy.activeBoosts) ? economy.activeBoosts.length : 0]]
                .filter(([, value]) => value != null).map(([label, value]) => `<div class="member-economy-stat"><span>${label}</span><strong>${typeof value === "number" ? value.toLocaleString("es-ES") : value}</strong></div>`).join("");
            label.textContent = name;
            savedBalance = { wallet, bank };
            updateButton.hidden = false;
            const renderBalance = (balance) => {
                const backpack = inventory.length
                    ? inventory.map(item => `<div class="member-backpack-item"><span class="member-backpack-emoji">${escapeHtml(item.emoji || (item.type === "role" ? "🎭" : "📦"))}</span><div class="member-backpack-copy"><strong>${escapeHtml(item.name || item.itemId || "Artículo")}</strong><small>${item.type === "role" ? "Rol comprado" : "Artículo comprado"} · ${Math.max(0, Number(item.quantity || 0)).toLocaleString("es-ES")} unidad(es)</small><small>Precio unitario: ${Math.max(0, Number(item.unitPrice || 0)).toLocaleString("es-ES")} monedas</small></div><span class="member-backpack-quantity">×${Math.max(0, Number(item.quantity || 0)).toLocaleString("es-ES")}</span></div>`).join("")
                    : '<p class="member-backpack-empty">Este miembro todavía no ha comprado artículos en la tienda.</p>';
                const unlockedAchievements = achievements.filter(item => item.unlockedAt).length;
                const achievementMarkup = achievements.length
                    ? `<div class="member-achievement-list">${achievements.slice(0, 8).map(item => `<div class="member-achievement-item"><span>${escapeHtml(item.emoji || "🏆")}</span><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description || "")}</small></div><b>${item.unlockedAt ? "Desbloqueado" : `${Math.min(Number(item.progress || 0), Number(item.goal || 1)).toLocaleString("es-ES")}/${Number(item.goal || 1).toLocaleString("es-ES")}`}</b></div>`).join("")}${achievements.length > 8 ? `<small>Y ${achievements.length - 8} logros más.</small>` : ""}</div>`
                    : '<p class="member-backpack-empty">Todavía no hay logros configurados para este servidor.</p>';
                detail.innerHTML = `<div class="member-economy-heading"><div><span class="eyebrow">Economía del miembro</span><h3>${escapeHtml(name)}</h3></div></div><div class="member-balance-grid"><label class="member-balance-field"><span>Cartera</span><input class="member-balance-input" name="wallet" type="number" min="0" max="99999999999" step="1" inputmode="numeric" value="${balance.wallet}"><small>Monedas disponibles en mano</small></label><label class="member-balance-field"><span>Banco</span><input class="member-balance-input" name="bank" type="number" min="0" max="99999999999" step="1" inputmode="numeric" value="${balance.bank}"><small>Monedas guardadas</small></label></div><div class="member-economy-stats">${stats}</div><article class="member-backpack"><div class="member-backpack-heading"><h3>Mochila</h3><span>${inventory.length} tipo(s) de compra</span></div>${backpack}</article><article class="member-backpack member-achievements"><div class="member-backpack-heading"><h3>Logros</h3><span>${unlockedAchievements}/${achievements.length} desbloqueados</span></div>${achievementMarkup}</article>`;
                detail.querySelectorAll(".member-balance-input").forEach(input => input.addEventListener("input", refreshSaveState));
                refreshSaveState();
            };
            renderBalance({ wallet, bank });
        } catch (error) { if (detail.isConnected) detail.innerHTML = `<article class="empty-state">${escapeHtml(error.message)}</article>`; }
    });
    function refreshSaveState() {
        const walletInput = detail.querySelector('[name="wallet"]');
        const bankInput = detail.querySelector('[name="bank"]');
        if (!walletInput || !bankInput || !savedBalance) { updateButton.disabled = true; return; }
        const wallet = Number(walletInput.value), bank = Number(bankInput.value);
        const valid = [walletInput, bankInput].every(input => input.value !== "" && input.validity.valid && Number.isSafeInteger(Number(input.value)));
        const changed = wallet !== savedBalance.wallet || bank !== savedBalance.bank;
        updateButton.disabled = !valid || !changed;
    }
    updateButton.onclick = async () => {
        const walletInput = detail.querySelector('[name="wallet"]');
        const bankInput = detail.querySelector('[name="bank"]');
        if (!selectedMemberId || !walletInput || !bankInput || updateButton.disabled) return;
        updateButton.disabled = true;
        updateButton.textContent = "Actualizando…";
        try {
            const response = await api(`/api/guilds/${encodeURIComponent(guildId)}/members/${encodeURIComponent(selectedMemberId)}/economy`, {
                method: "PUT",
                body: JSON.stringify({ wallet: Number(walletInput.value), bank: Number(bankInput.value) })
            });
            savedBalance = { wallet: Number(response.economy.wallet), bank: Number(response.economy.bank) };
            walletInput.value = savedBalance.wallet;
            bankInput.value = savedBalance.bank;
            refreshSaveState();
            showNotice("Balance actualizado.");
        } catch (error) {
            updateButton.disabled = false;
            showNotice(error.message, true);
        } finally {
            updateButton.textContent = "Actualizar balance";
        }
    };
}

function renderModule(key, modules) {
    const memberBalanceButton = document.querySelector("#member-balance-update");
    if (memberBalanceButton && key !== "memberEconomy") {
        memberBalanceButton.hidden = true;
        memberBalanceButton.disabled = true;
    }
    currentModule = key;
    nav.querySelectorAll(".nav-item").forEach(button => {
        const active = button.dataset.module === key;
        button.classList.toggle("active", active);
        if (active) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
    });
    const isMemberEconomy = key === "memberEconomy";
    const isList = !isMemberEconomy && Boolean(modules.lists[key]);
    const definition = isMemberEconomy
        ? (modules.configurations[key] || { title: "Miembros", category: "Economía y XP", description: "Busca a un miembro por su nombre visible o usuario para consultar su economía." })
        : isList ? modules.lists[key] : modules.configurations[key];
    document.querySelector("#page-title").textContent = definition.title;
    if (isList) return renderList(key, definition);

    const data = configState.configurations[key] || { configured: false };
    if (key === "specialChannels") return renderSpecialChannels(definition, data);
    if (isMemberEconomy) return renderMemberEconomy(definition);
    const formFields = definition.fields.map(field => {
        if (field.type === "section") return renderField(field);
        let value = getNested(data, field.name);
        if (key === "autoroles" && field.name === "enabled" && value == null) value = true;
        if (key === "voiceConnection" && field.name === "enabled" && value == null) value = Boolean(data.channelId);
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
        const markup = renderField(field, value);
        return markup.replace(/^(<[a-z][a-z0-9-]*\b)/i, `$1 data-setting-field="${escapeHtml(field.name)}"`);
    }).join("");
    const description = definition.description || "Los cambios se guardan en la configuración del servidor y los canales y roles existentes se conservan.";
    const communityLayout = ["autoroles", "welcome", "leaves", "birthday", "boosts", "confessions", "suggestions"].includes(key) ? ` community-${key}-grid` : "";
    const alignedToggleLayout = ["logs", "reports", "antiScam", "antiInvites", "purge", "voiceConnection", "inviteTracker"].includes(key) ? " aligned-toggle-grid" : "";
    const moduleLayout = key === "levelSettings" ? " levels-settings-grid" : key === "economy" ? " economy-settings-grid" : key === "weeklyDrop" ? " weekly-drop-grid" : key === "tempvoice" ? " tempvoice-settings-grid" : "";
    content.innerHTML = `<article class="settings-card"><div class="card-heading"><div><div class="eyebrow">${escapeHtml(definition.category)}</div><h2>${escapeHtml(definition.title)}</h2></div><span class="status-pill ${data.configured ? "configured" : "unconfigured"}">${data.configured ? "Configurado" : "Sin configurar"}</span></div><p class="card-description">${escapeHtml(description)}</p>${renderPreview(key, data)}<form id="settings-form" class="fields-grid${key === "prestige" ? " prestige-settings-grid" : ""}${communityLayout}${alignedToggleLayout}${moduleLayout}">${formFields}<div class="form-actions"><button class="primary-button" type="submit">Guardar cambios</button><span class="unsaved-indicator" hidden>● Cambios sin guardar</span><span class="save-feedback" role="status" aria-live="polite"></span></div></form></article>${key === "polls" ? '<div id="poll-admin"><div class="loading-card">Cargando encuestas…</div></div>' : ""}`;
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
    settingsForm.querySelectorAll("[data-toggle-field]").forEach(toggle => {
        toggle.addEventListener("click", () => {
            const enabled = toggle.dataset.enabled !== "true";
            toggle.dataset.enabled = String(enabled);
            toggle.setAttribute("aria-pressed", String(enabled));
            toggle.classList.toggle("is-active", enabled);
            toggle.textContent = enabled ? "ACTIVO" : "DESACTIVADO";
            settingsForm.dispatchEvent(new Event("change", { bubbles: true }));
        });
    });
    wireMultiSelectLimits(settingsForm);
    wireRolePickers(settingsForm);
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
                ? (payload.enabled ? "Conexión activada. El bot se conectará al canal en unos segundos." : "Conexión desactivada. El bot se desconectará aunque el canal siga seleccionado.")
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
        const form = `<article class="settings-card poll-create-card"><div class="card-heading"><div><div class="eyebrow">PUBLICACIÓN EN DISCORD</div><h2>${editingPoll ? "Editar encuesta" : "Crear encuesta"}</h2></div>${editingPoll ? '<button class="quiet-button" type="button" data-poll-cancel>Cancelar</button>' : ""}</div><p class="card-description">${editingPoll ? `Se actualizará el mensaje en #<span>${escapeHtml(channelName(editingPoll.channelId))}</span>.` : `Se publicará en el canal guardado arriba: #<span>${escapeHtml(channelName(result.configuredChannelId || ""))}</span>.`} La duración se cuenta desde que guardes.</p><form id="poll-form" class="fields-grid"><label class="field poll-full-field"><span>Pregunta</span><input name="question" type="text" maxlength="256" required value="${escapeHtml(editingPoll?.question || "")}" placeholder="¿Qué te gustaría preguntarle al servidor?"></label><label class="field poll-full-field"><span>Opciones <small>(una por línea, entre 2 y 4)</small></span><textarea name="options" rows="4" required placeholder="Opción 1&#10;Opción 2">${escapeHtml(editingPoll?.options.map(option => option.text).join("\n") || "")}</textarea></label><label class="field"><span>Duración (minutos, máximo 7 días)</span><input name="duration" type="number" min="1" max="10080" required value="${editingPoll ? Math.max(1, Math.ceil((new Date(editingPoll.endAt).getTime() - Date.now()) / 60000)) : 60}"></label><div class="poll-form-note">${editingPoll ? "Si cambias las opciones, los votos existentes se reiniciarán para que los resultados no queden asociados a opciones distintas." : "Los miembros podrán cambiar su voto hasta que termine la encuesta."}</div><div class="form-actions poll-full-field"><button class="primary-button" type="submit">${editingPoll ? "Guardar encuesta" : "Publicar encuesta"}</button><span class="save-feedback" role="status" aria-live="polite"></span></div></form>${renderPreviewMarkup("polls", { question: editingPoll?.question || "", options: editingPoll?.options?.map(option => option.text) || [], duration: editingPoll ? Math.max(1, Math.ceil((new Date(editingPoll.endAt).getTime() - Date.now()) / 60000)) : 60 })}</article>`;
        const rows = polls.map(poll => {
            const votes = poll.options.reduce((sum, option) => sum + option.voteCount, 0);
            const status = poll.ended ? "Finalizada" : "Activa";
            const options = poll.options.map((option, index) => `<li><span>${index + 1}️⃣ <span>${escapeHtml(option.text)}</span></span><strong>${option.voteCount}</strong></li>`).join("");
            return `<article class="poll-row"><div class="poll-row-main"><div class="poll-row-top"><span class="status-pill ${poll.ended ? "unconfigured" : "configured"}">${status}</span><span class="poll-channel">#<span>${escapeHtml(channelName(poll.channelId))}</span></span><span class="poll-votes">${votes} ${votes === 1 ? "voto" : "votos"}</span></div><h3>${escapeHtml(poll.question)}</h3><ul>${options}</ul><small>${poll.endAt ? `${poll.ended ? "Terminó" : "Termina"} ${new Date(poll.endAt).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })}` : "Sin fecha de término"}</small></div><div class="record-actions">${poll.url ? `<a class="quiet-button" href="${escapeHtml(poll.url)}" target="_blank" rel="noopener noreferrer">Ver en Discord ↗</a>` : ""}${poll.ended ? "" : `<button class="quiet-button" type="button" data-poll-edit="${escapeHtml(poll._id)}">Editar</button>`}<button class="quiet-button danger-text" type="button" data-poll-delete="${escapeHtml(poll._id)}">Eliminar</button></div></article>`;
        }).join("");
        container.innerHTML = `${form}<article class="settings-card poll-list-card"><div class="card-heading"><div><div class="eyebrow">GESTIÓN</div><h2>Encuestas creadas</h2></div><button class="quiet-button" type="button" data-poll-refresh>Actualizar</button></div><div class="poll-stats"><div><span>Activas en el canal configurado</span><strong>${activePolls}</strong></div><div><span>Registradas en ese canal</span><strong>${registeredPolls}</strong></div><div><span>Votos acumulados</span><strong>${totalVotes}</strong></div></div><p class="card-description">Los contadores de arriba corresponden al canal configurado, como en <code>/poll list</code>. La lista incluye todas las encuestas del servidor y sus estados.</p><div class="poll-list">${rows || '<p class="empty-state">Todavía no hay encuestas registradas.</p>'}</div></article>`;

        const pollForm = container.querySelector("#poll-form");
        const updatePollLivePreview = () => {
            const preview = container.querySelector(".poll-live-preview");
            if (!preview) return;
            const options = pollForm.elements.options.value.split(/\r?\n/).map(option => option.trim()).filter(Boolean);
            preview.outerHTML = renderPreviewMarkup("polls", {
                question: pollForm.elements.question.value,
                options,
                duration: pollForm.elements.duration.value
            });
        };
        pollForm.addEventListener("input", updatePollLivePreview);
        pollForm.addEventListener("change", updatePollLivePreview);
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
                const response = await api(`/api/guilds/${encodeURIComponent(guildId)}/polls${editingPoll ? `/${encodeURIComponent(editingPoll._id)}` : ""}`, {
                    method: editingPoll ? "PUT" : "POST", body: payload
                });
                const discordUrl = response?.url || (editingPoll?.channelId && editingPoll?.messageId ? `https://discord.com/channels/${guildId}/${editingPoll.channelId}/${editingPoll.messageId}` : editingPoll?.url || null);
                let successMessage;
                if (discordUrl) {
                    successMessage = editingPoll ? "Encuesta actualizada en Discord." : "Encuesta publicada en Discord.";
                    showNotice(successMessage);
                } else {
                    successMessage = editingPoll
                        ? "Discord confirmó la actualización, pero no se recibió un enlace al mensaje."
                        : "La solicitud terminó sin devolver un enlace al mensaje. Actualiza la lista y comprueba el canal configurado.";
                    showNotice(successMessage, true);
                }
                await renderPollAdmin();
                const refreshedFeedback = content.querySelector("#poll-form .save-feedback");
                if (refreshedFeedback) {
                    refreshedFeedback.innerHTML = discordUrl
                        ? `Enlace al mensaje: <a href="${escapeHtml(discordUrl)}" target="_blank" rel="noopener noreferrer">Abrir encuesta en Discord</a>`
                        : escapeHtml(successMessage);
                }
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
    if (key === "storeItems") return `${record.emoji || "📦"} ${record.name || record.itemId} · ${Number(record.price || 0).toLocaleString("es")} monedas`;
    if (key === "achievements") return `${record.emoji || "🏆"} ${record.name || record.achievementId} · ${record.goal || 0} ${record.metric || ""}`;
    if (key === "bankDonorRoles") return `${roleName} · bonificación desde ${Number(record.requiredAmount || 0).toLocaleString("es")}`;
    if (key === "birthdayMembers") return record.discordName || (record.userId ? `Cargando nombre… · ${record.day}/${record.month}` : "Miembro sin ID de Discord");
    if (key === "socialAlerts") return `${record.platform || "Kick"} · ${record.slug || "Canal sin nombre"}${record.enabled === false ? " · desactivada" : ""}`;
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

function wireMultiSelectLimits(form) {
    form?.querySelectorAll("select[data-max-selected]").forEach(select => {
        select.addEventListener("change", () => {
            const limit = Number(select.dataset.maxSelected) || 0;
            const selected = [...select.selectedOptions];
            if (limit && selected.length > limit) {
                const mostRecent = selected.find(option => option.value === select.value) || selected.at(-1);
                if (mostRecent) mostRecent.selected = false;
                showNotice(`Puedes seleccionar hasta ${limit} elementos.`, true);
            }
        });
    });
}

function renderSpecialChannels(definition, data) {
    const channels = Array.isArray(data.channels) ? data.channels : [];
    const contentTypes = [
        ["text", "Texto"], ["images", "Imágenes"], ["videos", "Vídeos"], ["files", "Archivos"],
        ["stickers", "Stickers"], ["links", "Enlaces"], ["commands", "Comandos"]
    ];
    const channelOptions = optionsFor({ type: "channel", channelTypes: [0] });
    const roleOptions = optionsFor({ type: "role" });
    const renderRows = () => channels.map((rule, index) => {
        const name = channelOptions.find(item => item.id === rule.channelId)?.name || "Elige un canal";
        const selectedRoles = Array.isArray(rule.immuneRoles) ? rule.immuneRoles : [];
        return `<section class="setup-row special-channel-row" data-special-row="${index}">
            <div class="setup-row-heading"><strong>Canal ${index + 1}${rule.channelId ? ` · #${escapeHtml(name)}` : ""}</strong><button class="quiet-button danger-text" type="button" data-special-remove="${index}">Quitar</button></div>
            <label class="field"><span>Canal</span><select data-special-channel required><option value="">Elige un canal</option>${channelOptions.map(item => `<option value="${escapeHtml(item.id)}" ${item.id === rule.channelId ? "selected" : ""}>#${escapeHtml(item.name)}</option>`).join("")}</select></label>
            <div class="field"><span>Contenido permitido</span><small>Si el mensaje incluye algún tipo desactivado, se eliminará. Si desactivas Texto, también se eliminarán los mensajes de texto sin adjuntos.</small><div class="special-content-grid">${contentTypes.map(([key, label]) => `<label class="field checkbox-field"><span><strong>${label}</strong></span><input type="checkbox" data-special-type="${key}" ${key === "text" ? rule.text !== false ? "checked" : "" : rule[key] ? "checked" : ""}></label>`).join("")}</div></div>
            <label class="field"><span>Canal de registros <em>(opcional)</em></span><select data-special-log-channel><option value="">No registrar eliminaciones</option>${channelOptions.map(item => `<option value="${escapeHtml(item.id)}" ${item.id === rule.logChannelId ? "selected" : ""}>#${escapeHtml(item.name)}</option>`).join("")}</select><small>El bot enviará ahí el usuario, canal, contenido eliminado y la regla incumplida.</small></label>
            <div class="field role-picker-field" data-role-picker="special-immune-${index}" data-max-selected="25"><span>Roles inmunes</span><details class="role-picker"><summary class="role-picker-trigger"><span data-role-summary>${selectedRoles.length ? `${selectedRoles.length} de 25 roles seleccionados` : "Selecciona hasta 25 roles"}</span><span class="role-picker-chevron" aria-hidden="true">⌄</span></summary><div class="role-picker-menu"><input type="search" class="role-picker-search" placeholder="Buscar roles…" aria-label="Buscar roles"><div class="role-picker-options" role="group" aria-label="Roles inmunes">${roleOptions.map(role => `<label class="role-picker-option" data-role-name="${escapeHtml(normalizeSearch(role.name))}"><input type="checkbox" value="${escapeHtml(role.id)}" data-role-option ${selectedRoles.includes(role.id) ? "checked" : ""}><span>@</span><span>${escapeHtml(role.name)}</span></label>`).join("")}</div></div></details><small>Hasta 25 roles. El dueño, administradores y miembros con permiso para gestionar mensajes también quedan exentos.</small></div>
        </section>`;
    }).join("");

    content.innerHTML = `<article class="settings-card"><div class="card-heading"><div><div class="eyebrow">${escapeHtml(definition.category)}</div><h2>${escapeHtml(definition.title)}</h2></div><span class="status-pill ${data.configured ? "configured" : "unconfigured"}">${data.configured ? "Configurado" : "Sin configurar"}</span></div><p class="card-description">${escapeHtml(definition.description)}</p><form id="special-channels-form" class="fields-grid"><div class="field special-channel-editor"><span>Canales restringidos</span><small>Configura hasta 25 canales. Cada regla se aplica solo al canal seleccionado.</small><div class="setup-rows" data-special-rows>${renderRows() || '<p class="setup-empty">Todavía no hay canales configurados.</p>'}</div><div class="special-channel-add"><select data-special-new-channel aria-label="Selecciona un canal"><option value="">Elige un canal</option>${channelOptions.filter(item => !channels.some(rule => rule.channelId === item.id)).map(item => `<option value="${escapeHtml(item.id)}">#${escapeHtml(item.name)}</option>`).join("")}</select><button class="quiet-button" type="button" data-special-add ${channels.length >= 25 ? "disabled" : ""}>＋ Añadir canal</button></div></div><div class="form-actions"><button class="primary-button" type="submit">Guardar cambios</button><span class="save-feedback" role="status" aria-live="polite"></span></div></form></article>`;

    const form = content.querySelector("#special-channels-form");
    const redraw = () => renderSpecialChannels(definition, { ...data, channels });
    form.querySelector("[data-special-add]").addEventListener("click", () => {
        const channelId = form.querySelector("[data-special-new-channel]").value;
        if (!channelId || channels.length >= 25 || channels.some(rule => rule.channelId === channelId)) return;
        channels.push({ channelId, text: true, images: false, videos: false, files: false, stickers: false, links: false, commands: false, immuneRoles: [], logChannelId: null });
        redraw();
    });
    form.addEventListener("click", event => {
        const remove = event.target.closest("[data-special-remove]");
        if (!remove) return;
        channels.splice(Number(remove.dataset.specialRemove), 1);
        redraw();
    });
    form.addEventListener("change", event => {
        const row = event.target.closest("[data-special-row]");
        if (!row) return;
        const rule = channels[Number(row.dataset.specialRow)];
        if (event.target.matches("[data-special-channel]")) rule.channelId = event.target.value;
        else if (event.target.matches("[data-special-type]")) rule[event.target.dataset.specialType] = event.target.checked;
        else if (event.target.matches("[data-special-log-channel]")) rule.logChannelId = event.target.value || null;
        else if (event.target.matches("[data-role-option]")) {
            queueMicrotask(() => { rule.immuneRoles = [...row.querySelectorAll("[data-role-option]:checked")].map(option => option.value); });
        }
    });
    wireRolePickers(form);
    form.addEventListener("submit", async event => {
        event.preventDefault();
        const button = form.querySelector("button[type=submit]");
        const feedback = form.querySelector(".save-feedback");
        if (channels.some(rule => !rule.channelId) || new Set(channels.map(rule => rule.channelId)).size !== channels.length) {
            feedback.textContent = "Selecciona un canal diferente en cada regla.";
            feedback.className = "save-feedback error";
            return;
        }
        button.disabled = true;
        button.textContent = "Guardando…";
        try {
            const result = await api(`/api/guilds/${encodeURIComponent(guildId)}/config/specialChannels`, { method: "PUT", body: JSON.stringify({ channels }) });
            configState.configurations.specialChannels = { ...result.configuration, configured: true };
            showNotice("Configuración guardada.");
            if (currentModule === "specialChannels") renderSpecialChannels(definition, configState.configurations.specialChannels);
        } catch (error) {
            showNotice(error.message, true);
            feedback.textContent = error.message;
            feedback.className = "save-feedback error";
            button.disabled = false;
            button.textContent = "Guardar cambios";
        }
    });
}

function wireRolePickers(form) {
    form?.querySelectorAll("[data-role-picker]").forEach(picker => {
        const max = Number(picker.dataset.maxSelected) || 5;
        const summary = picker.querySelector("[data-role-summary]");
        const checkboxes = [...picker.querySelectorAll("[data-role-option]")];
        const search = picker.querySelector(".role-picker-search");
        const updateSummary = () => {
            const count = checkboxes.filter(option => option.checked).length;
            const itemLabel = picker.dataset.itemLabel || "roles";
            summary.textContent = count ? `${count} de ${max} ${itemLabel} seleccionados` : `Selecciona hasta ${max} ${itemLabel}`;
        };
        checkboxes.forEach(checkbox => checkbox.addEventListener("change", () => {
            if (checkbox.checked && checkboxes.filter(option => option.checked).length > max) {
                checkbox.checked = false;
                showNotice(`Puedes seleccionar hasta ${max} ${picker.dataset.itemLabel || "elementos"}.`, true);
            }
            updateSummary();
        }));
        search?.addEventListener("input", () => {
            const query = normalizeSearch(search.value);
            picker.querySelectorAll(".role-picker-option").forEach(option => {
                option.hidden = Boolean(query) && !option.dataset.roleName.includes(query);
            });
        });
    });
}

function wireKickChannelPickers(form) {
    form?.querySelectorAll("[data-kick-channel-picker], [data-social-channel-picker]").forEach(picker => {
        const socialPicker = picker.hasAttribute("data-social-channel-picker");
        const queryInput = picker.querySelector("[data-kick-channel-query]");
        const slugInput = picker.querySelector('input[type="hidden"]');
        const selected = picker.querySelector("[data-kick-channel-selected]");
        const results = picker.querySelector("[data-kick-channel-results]");
        const status = picker.querySelector("[data-kick-channel-status]");
        const label = picker.querySelector("[data-channel-label]");
        const platformSelect = socialPicker ? form.querySelector('select[name="platform"]') : null;
        let searchTimer = 0;
        let requestId = 0;

        const setStatus = message => { status.textContent = message; };
        const isManualPlatform = () => socialPicker && ["TikTok", "Twitch", "YouTube"].includes(platformSelect?.value);
        const updateManualValue = () => {
            const platform = platformSelect.value;
            const platformName = platform;
            let username = queryInput.value.trim();
            if (platform === "YouTube") {
                try {
                    if (/^https?:\/\//i.test(username)) username = new URL(username).pathname.split("/").filter(Boolean)[0] || "";
                } catch { /* preserve invalid input so the user can correct it */ }
            }
            username = username.replace(/^@+/, "");
            slugInput.value = username;
            results.hidden = true;
            queryInput.setAttribute("aria-expanded", "false");
            selected.replaceChildren();
            if (username) {
                const description = document.createElement("span");
                description.textContent = platform === "YouTube" ? `Canal seleccionado: @${username} · youtube.com/@${username}` : `Usuario seleccionado: @${username} · ${platform === "TikTok" ? `tiktok.com/@${username}` : `twitch.tv/${username}`}`;
                selected.append(description);
                selected.hidden = false;
                setStatus("");
            } else {
                selected.hidden = true;
                setStatus(platform === "YouTube" ? "Escribe el @handle o la URL youtube.com/@handle del canal." : `Escribe el usuario de ${platformName}, con o sin @.`);
            }
            slugInput.dispatchEvent(new Event("input", { bubbles: true }));
            slugInput.dispatchEvent(new Event("change", { bubbles: true }));
        };
        const syncPlatform = () => {
            if (!socialPicker) return;
            const platform = platformSelect.value;
            const manual = ["TikTok", "Twitch", "YouTube"].includes(platform);
            label.textContent = platform === "TikTok" ? "Usuario de TikTok" : platform === "Twitch" ? "Usuario de Twitch" : platform === "YouTube" ? "Canal de YouTube" : "Canal de Kick";
            queryInput.placeholder = platform === "YouTube" ? "@handle o URL del canal de YouTube" : manual ? `Escribe el usuario de ${platform}` : "Buscar un canal de Kick";
            queryInput.setAttribute("aria-label", label.textContent);
            if (manual) updateManualValue();
            else {
                slugInput.value = "";
                selected.hidden = true;
                if (queryInput.value.trim().length >= 3) searchChannels(queryInput.value);
                else setStatus("Busca el canal y selecciónalo en los resultados.");
            }
        };
        const selectChannel = channel => {
            slugInput.value = channel.slug;
            queryInput.value = channel.username;
            selected.replaceChildren();
            if (channel.avatarUrl) {
                const avatar = document.createElement("img");
                avatar.src = channel.avatarUrl;
                avatar.alt = "";
                avatar.loading = "lazy";
                selected.append(avatar);
            } else {
                const icon = document.createElement("span");
                icon.className = "kick-channel-fallback";
                icon.textContent = "K";
                selected.append(icon);
            }
            const description = document.createElement("span");
            description.textContent = `Canal seleccionado: @${channel.username} · kick.com/${channel.slug}${channel.isLive ? " · En directo" : ""}`;
            selected.append(description);
            selected.hidden = false;
            results.hidden = true;
            queryInput.setAttribute("aria-expanded", "false");
            setStatus("");
            slugInput.dispatchEvent(new Event("input", { bubbles: true }));
            slugInput.dispatchEvent(new Event("change", { bubbles: true }));
        };

        const searchChannels = async (term, selectExact = false) => {
            const currentRequest = ++requestId;
            const trimmed = term.trim();
            if (trimmed.length < 3) {
                results.replaceChildren();
                results.hidden = true;
                queryInput.setAttribute("aria-expanded", "false");
                setStatus(trimmed ? "Escribe al menos 3 caracteres para buscar." : "");
                return;
            }
            results.replaceChildren();
            results.hidden = false;
            queryInput.setAttribute("aria-expanded", "true");
            setStatus("Buscando canales de Kick…");
            try {
                const response = await api(`/api/kick/channels/search?q=${encodeURIComponent(trimmed)}`);
                if (currentRequest !== requestId || !picker.isConnected) return;
                const channels = response.channels || [];
                if (selectExact) {
                    const normalized = trimmed.replace(/^@/, "").toLocaleLowerCase("en");
                    const exact = channels.filter(channel => channel.slug.toLocaleLowerCase("en") === normalized || channel.username.toLocaleLowerCase("en") === normalized);
                    if (exact.length === 1) {
                        selectChannel(exact[0]);
                        return;
                    }
                }
                if (!channels.length) {
                    results.hidden = true;
                    queryInput.setAttribute("aria-expanded", "false");
                    setStatus("No encontré canales que coincidan. Prueba con otra parte del nombre.");
                    return;
                }
                for (const channel of channels) {
                    const option = document.createElement("button");
                    option.type = "button";
                    option.className = "kick-channel-option";
                    option.setAttribute("role", "option");
                    if (channel.avatarUrl) {
                        const avatar = document.createElement("img");
                        avatar.src = channel.avatarUrl;
                        avatar.alt = "";
                        avatar.loading = "lazy";
                        option.append(avatar);
                    } else {
                        const icon = document.createElement("span");
                        icon.className = "kick-channel-fallback";
                        icon.textContent = "K";
                        option.append(icon);
                    }
                    const names = document.createElement("span");
                    names.className = "kick-channel-option-names";
                    const username = document.createElement("strong");
                    username.textContent = channel.username;
                    const slug = document.createElement("small");
                    slug.textContent = `kick.com/${channel.slug}${channel.isLive ? " · En directo" : ""}`;
                    names.append(username, slug);
                    option.append(names);
                    option.addEventListener("click", () => selectChannel(channel));
                    results.append(option);
                }
                setStatus(`${channels.length} coincidencia(s). Selecciona el canal correcto.`);
            } catch (error) {
                if (currentRequest !== requestId || !picker.isConnected) return;
                results.hidden = true;
                queryInput.setAttribute("aria-expanded", "false");
                setStatus(error.message);
            }
        };

        queryInput.addEventListener("input", () => {
            if (isManualPlatform()) { updateManualValue(); return; }
            slugInput.value = "";
            selected.hidden = true;
            slugInput.dispatchEvent(new Event("input", { bubbles: true }));
            window.clearTimeout(searchTimer);
            searchTimer = window.setTimeout(() => searchChannels(queryInput.value), 300);
        });
        queryInput.addEventListener("focus", () => {
            if (isManualPlatform()) return;
            if (queryInput.value.trim().length >= 3 && !slugInput.value) searchChannels(queryInput.value);
        });
        platformSelect?.addEventListener("change", syncPlatform);
        form.addEventListener("click", event => {
            if (!picker.contains(event.target)) {
                results.hidden = true;
                queryInput.setAttribute("aria-expanded", "false");
            }
        });
        if (socialPicker && isManualPlatform()) updateManualValue();
        else if (queryInput.value.trim().length >= 3 && slugInput.value) searchChannels(queryInput.value, true);
    });
}

function renderList(key, definition, editItem = null) {
    const records = configState.lists[key] || [];
    const editing = Boolean(editItem);
    const listLayout = key === "socialAlerts" ? " social-alerts-grid" : key === "quests" ? " missions-grid" : "";
    const form = `<form id="list-form" class="fields-grid${listLayout}">${definition.fields.map(field => renderField(field, getNested(editItem, field.name), `${key}-`).replace(/^(<[a-z][a-z0-9-]*\b)/i, `$1 data-setting-field="${escapeHtml(field.name)}"`)).join("")}<div class="form-actions"><button class="primary-button" type="submit">${editing ? "Guardar elemento" : "Añadir elemento"}</button>${editing ? '<button class="quiet-button" id="cancel-edit" type="button">Cancelar</button>' : ""}<span class="unsaved-indicator" hidden>● Cambios sin guardar</span><span class="save-feedback" role="status" aria-live="polite"></span></div></form>`;
    const rows = records.map(record => {
        const label = getRecordLabel(key, record, definition);
        return `<div class="record-row" data-record-id="${escapeHtml(record._id)}" data-search="${escapeHtml(getRecordSearchText(key, record, definition))}"><div class="record-title">${escapeHtml(label)}</div><div class="record-actions"><button type="button" class="quiet-button" data-edit="${escapeHtml(record._id)}">Editar</button><button type="button" class="quiet-button danger-text" data-delete="${escapeHtml(record._id)}">Eliminar</button></div></div>`;
    }).join("");
    const search = records.length > 3 ? `<div class="list-toolbar"><span>${records.length} elementos</span><label class="record-search"><span class="sr-only">Buscar en ${escapeHtml(definition.title)}</span><input type="search" id="record-search" placeholder="Buscar en la lista…" autocomplete="off"></label></div>` : "";
    const alertPreview = key === "socialAlerts" ? renderPreviewMarkup(key, {
        title: editItem?.title || definition.fields.find(field => field.name === "title")?.default || "",
        description: editItem?.messageTemplate || definition.fields.find(field => field.name === "messageTemplate")?.default || "",
        color: editItem?.color || "",
        banner: editItem?.image || "",
        avatarUrl: editItem?.avatarUrl || "",
        displayName: editItem?.displayName || "",
        platform: editItem?.platform || "Kick"
    }) : "";
    content.innerHTML = `<article class="settings-card"><div class="card-heading"><div><div class="eyebrow">${escapeHtml(definition.category)}</div><h2>${escapeHtml(definition.title)}</h2></div></div>${definition.description ? `<p class="card-description">${escapeHtml(definition.description)}</p>` : ""}${alertPreview}${search}<div class="records-list">${rows || '<p class="empty-state">Todavía no hay elementos configurados.</p>'}<p id="list-no-results" class="empty-state" hidden>No hay elementos que coincidan con la búsqueda.</p></div><div class="form-divider"></div><h3>${editing ? "Editar elemento" : "Añadir elemento"}</h3>${form}</article>`;

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
    wireMultiSelectLimits(listForm);
    wireRolePickers(listForm);
    wireKickChannelPickers(listForm);
    setupTemplateComposers(listForm);
    if (key === "socialAlerts") {
        updatePreview(key, listForm);
        listForm.addEventListener("input", () => updatePreview(key, listForm));
        listForm.addEventListener("change", () => updatePreview(key, listForm));
    }
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


function getAssistantFindings() {
    const findings = [];
    const add = (title, detail, key = "") => {
        const severity = /ajuste obligatorio pendiente|referencia de canal no disponible|referencia de rol no disponible|rol no asignable/i.test(title)
            ? "Prioridad alta"
            : /permisos de canal por revisar|tipo de canal incompatible/i.test(title)
                ? "Revisión recomendada"
                : "Advertencia";
        findings.push({ title, detail, key, severity });
    };
    try {
        const missing = findMissingRequiredSettings(currentModules);
        for (const item of missing.slice(0, 8)) add("Ajuste obligatorio pendiente", `${item.title}: falta completar “${item.field}”.`, item.key);
        const mismatches = findChannelTypeMismatches(currentModules);
        for (const item of mismatches.slice(0, 8)) add("Tipo de canal incompatible", `${item.title}: el canal #${item.channelName} no coincide con el tipo esperado para “${item.field}”.`, item.key);
        const channels = findUnavailableChannelReferences(currentModules);
        for (const item of channels.slice(0, 8)) add("Referencia de canal no disponible", `${item.title}: hay un canal guardado que ya no aparece entre los canales actuales.`, item.key);
        const roles = findUnavailableRoleReferences(currentModules);
        for (const item of roles.slice(0, 8)) add("Referencia de rol no disponible", `${item.title}: hay un rol guardado que no aparece entre los roles actuales.`, item.key);
        const unassignable = findConfiguredUnassignableRoles(currentModules);
        for (const item of (unassignable || []).slice(0, 8)) add("Rol no asignable", `${item.title}: “${item.roleName}” no se puede asignar porque ${item.reason.toLocaleLowerCase("es")}.`, item.key);
        if (resources.channelPermissions) {
            const permissions = findConfiguredChannelPermissionIssues(currentModules);
            for (const item of permissions.slice(0, 8)) add("Permisos de canal por revisar", `${item.title}: en #${item.channelName} faltan permisos básicos: ${item.missing.join(", ")}.`, item.key);
        } else {
            add("Permisos no verificados", "No se pudieron comprobar todos los permisos efectivos del bot. Revisa los canales configurados directamente en Discord.");
        }
    } catch (error) {
        console.warn("No pude calcular todos los diagnósticos del asistente:", error);
    }
    return findings;
}

function getAssistantModuleStatus() {
    const entries = [...Object.entries(currentModules?.configurations || {}), ...Object.entries(currentModules?.lists || {})];
    const configured = entries.filter(([key]) => currentModules.lists?.[key]
        ? (configState.lists?.[key] || []).length > 0
        : Boolean(configState.configurations?.[key]?.configured)).length;
    return { total: entries.length, configured, pending: Math.max(0, entries.length - configured) };
}

function findAssistantModule(query) {
    const normalized = normalizeSearch(query);
    if (!normalized) return null;
    const entries = [...Object.entries(currentModules?.configurations || {}), ...Object.entries(currentModules?.lists || {})];
    const stopWords = new Set(["como", "que", "para", "por", "donde", "quiero", "puedo", "hacer", "usar", "utilizar", "configurar", "configuro", "configuracion", "ayuda", "modulo", "modulos", "el", "la", "los", "las", "un", "una", "de", "del", "en", "mi", "mis", "me", "se", "y"]);
    const words = value => normalizeSearch(value).split(/[^a-z0-9]+/).filter(word => word.length > 2 && !stopWords.has(word));
    const queryWords = new Set(words(normalized));
    const aliases = [
        { terms: ["bienvenida", "bienvenidas", "welcome", "saludo", "saludos"], match: /bienven|welcome|saludo/i },
        { terms: ["autorol", "autoroles", "rol automatico", "roles automaticos"], match: /autorol|auto.?role|rol automatic/i },
        { terms: ["auditoria", "logs", "registro", "registros", "moderacion"], match: /auditor|log|registro|moderaci/i },
        { terms: ["comprobaciones", "diagnostico", "diagnosticos", "revision", "revisiones"], match: /comprob|diagnostic|revision|check/i },
        { terms: ["ticket", "tickets", "soporte", "support"], match: /ticket|soporte|support/i },
        { terms: ["verificacion", "captcha", "validacion"], match: /verific|captcha|validaci/i },
        { terms: ["anuncio", "anuncios", "anuncios automaticos"], match: /anuncio|announcement/i },
        { terms: ["sugerencia", "sugerencias"], match: /sugerenc/i }
    ];
    const ranked = entries.map(([key, definition]) => {
        const title = normalizeSearch(definition.title || key);
        const keyText = normalizeSearch(key.replace(/([A-Z])/g, " $1"));
        const searchText = normalizeSearch(`${keyText} ${title} ${definition.category || ""} ${definition.description || ""}`);
        const moduleWords = words(`${keyText} ${title}`);
        let score = 99;
        if (title === normalized || keyText === normalized) score = 0;
        else if (title.includes(normalized) || normalized.includes(title) || keyText.includes(normalized)) score = 1;
        else {
            const overlap = moduleWords.filter(word => queryWords.has(word)).length;
            if (overlap) score = 5 - Math.min(overlap, 3);
            const matchingAlias = aliases.find(alias => alias.terms.some(term => queryWords.has(term)) && alias.match.test(searchText));
            if (matchingAlias) score = Math.min(score, 2);
        }
        return { key, definition, score, searchText };
    }).filter(item => item.score < 5).sort((a, b) => a.score - b.score);
    if (!ranked.length || (ranked.length > 1 && ranked[0].score === ranked[1].score && ranked[0].score > 1)) return null;
    return ranked[0];
}

function getAssistantModuleGuidance(definition) {
    const fields = (definition.fields || []).filter(field => field.type !== "section");
    const usefulFields = fields.filter(field => field.label || field.help).slice(0, 4);
    const fieldGuidance = usefulFields.map(field => {
        const label = field.label || field.name;
        return field.help ? `“${label}”: ${field.help}` : `“${label}”`;
    });
    const description = String(definition.description || "").trim();
    const parts = [];
    if (description) parts.push(description);
    if (fieldGuidance.length) parts.push(`En este módulo, revisa estos ajustes: ${fieldGuidance.join("; ")}.`);
    parts.push("Guarda los cambios y comprueba el resultado en Discord. Si algún campo depende de permisos, canales o roles, verifica también que el bot tenga acceso.");
    return parts.join(" ");
}

function getAssistantFieldGuidance(question, definition) {
    const query = normalizeSearch(question);
    const fields = (definition.fields || []).filter(field => field.type !== "section" && field.name);
    const stopWords = new Set(["como", "que", "para", "por", "donde", "quiero", "puedo", "hacer", "usar", "utilizar", "configurar", "configuro", "configuracion", "ayuda", "modulo", "modulos", "campo", "opcion", "opciones", "significa", "sirve", "hace", "explica", "explicame", "el", "la", "los", "las", "un", "una", "de", "del", "en", "mi", "mis", "me", "se", "y", "es"]);
    const words = value => normalizeSearch(value).split(/[^a-z0-9]+/).filter(word => word.length > 2 && !stopWords.has(word));
    const queryWords = new Set(words(query));
    const ranked = fields.map(field => {
        const label = field.label || field.name;
        const searchable = normalizeSearch(`${label} ${field.name} ${field.help || ""}`);
        const fieldWords = words(`${label} ${field.name}`);
        const overlap = fieldWords.filter(word => queryWords.has(word)).length;
        const score = query.includes(normalizeSearch(label)) || query.includes(normalizeSearch(field.name)) ? 0
            : overlap ? 3 - Math.min(overlap, 2)
            : 99;
        return { field, label, score, searchable };
    }).filter(item => item.score < 99).sort((a, b) => a.score - b.score);
    if (!ranked.length || (ranked.length > 1 && ranked[0].score === ranked[1].score && ranked[0].score > 0)) return "";
    const { field, label } = ranked[0];
    const typeLabels = {
        text: "texto", textarea: "texto largo", boolean: "interruptor de activación",
        channel: "canal de Discord", "channel-list": "lista de canales", voice: "canal de voz",
        category: "categoría de Discord", role: "rol de Discord", "role-list": "lista de roles",
        number: "número", select: "selector de opciones", "multi-select": "selector de varias opciones"
    };
    const details = [];
    if (field.help) details.push(String(field.help).trim());
    else details.push(`Este ajuste se introduce como ${typeLabels[field.type] || "un valor de configuración"}.`);
    if (field.optional) details.push("Es opcional.");
    else if (field.default === undefined && !["boolean", "section"].includes(field.type)) details.push("No aparece marcado como opcional, así que revisa si tu configuración necesita completarlo.");
    if (field.default !== undefined) details.push(`Valor predeterminado: ${String(field.default)}.`);
    if (Array.isArray(field.options) && field.options.length) {
        const options = field.options.map(option => typeof option === "object" ? option.label || option.name || option.value : option).filter(Boolean);
        if (options.length) details.push(`Opciones disponibles: ${options.join(", ")}.`);
    }
    return `Sobre “${label}”: ${details.join(" ")}`;
}

function assistantReply(question) {
    const q = normalizeSearch(question);
    const status = getAssistantModuleStatus();
    const findings = getAssistantFindings();
    const matched = findAssistantModule(q);
    const moduleQuestion = Boolean(matched && matched.score <= 2);
    if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|saludos)\b/.test(q)) {
        return { text: `¡Hola! Estoy conectado a la configuración cargada de ${activeGuild?.name || "este servidor"}. Puedes preguntarme por el estado, los problemas detectados o un módulo específico.` };
    }
    if (!moduleQuestion && /\b(estado|resumen|como esta|situacion|configuracion general|progreso)\b/.test(q)) {
        const percent = status.total ? Math.round(status.configured / status.total * 100) : 0;
        const summary = findings.length
            ? ` También he encontrado ${findings.length} comprobaciones que conviene revisar.`
            : " No he detectado problemas en las comprobaciones disponibles.";
        return { text: `En ${activeGuild?.name || "este servidor"}, ${status.configured} de ${status.total} módulos aparecen configurados (${percent}%). Quedan ${status.pending} pendientes.${summary}` };
    }
    if (!moduleQuestion && /\b(problema|problemas|error|errores|diagnostico|diagnosticos|comprobacion|comprobaciones|fallo|fallos|revisar|que esta mal|que debo corregir|que necesita revision)\b/.test(q)) {
        if (!findings.length) return { text: "No aparecen incidencias en las comprobaciones que puedo realizar con los datos cargados. Esto no garantiza que todos los sistemas funcionen en tiempo real; también conviene probar sus acciones en Discord." };
        const list = findings.slice(0, 5).map((item, index) => `${index + 1}. [${item.severity || "Revisión"}] ${item.title}: ${item.detail}`).join("\n");
        const firstAction = findings.find(item => item.key);
        return { text: `He encontrado ${findings.length} comprobaciones para revisar:\n${list}${findings.length > 5 ? "\nHay más resultados; abre Comprobaciones para ver el resumen completo." : ""}`, actionKey: firstAction?.key, actionLabel: firstAction ? "Abrir el primer módulo afectado" : "" };
    }
    if (!moduleQuestion && /\b(recomienda|recomendacion|recomendaciones|que configuro|por donde empiezo|primero|siguiente paso|que me aconsejas|que deberia hacer)\b/.test(q)) {
        if (findings.length) {
            const priority = [
                /ajuste obligatorio pendiente/i,
                /referencia de (canal|rol) no disponible/i,
                /rol no asignable/i,
                /permisos de canal por revisar/i,
                /tipo de canal incompatible/i,
                /permisos no verificados/i
            ];
            const rank = item => {
                const index = priority.findIndex(pattern => pattern.test(item.title));
                return index < 0 ? priority.length : index;
            };
            const prioritized = [...findings].sort((a, b) => rank(a) - rank(b));
            const recommendation = prioritized.find(item => item.key) || prioritized[0];
            const reason = /ajuste obligatorio/i.test(recommendation.title)
                ? "es un ajuste obligatorio y puede impedir que la función opere correctamente"
                : /referencia de (canal|rol) no disponible/i.test(recommendation.title)
                    ? "la configuración apunta a un canal o rol que ya no está disponible"
                    : /rol no asignable/i.test(recommendation.title)
                        ? "el bot no podrá asignar ese rol hasta corregir la causa"
                        : /permisos de canal/i.test(recommendation.title)
                            ? "los permisos faltantes pueden impedir que el bot funcione en ese canal"
                            : /tipo de canal/i.test(recommendation.title)
                                ? "el canal seleccionado no corresponde al tipo que necesita la función"
                                : "hay permisos que no se pudieron verificar automáticamente y conviene confirmar en Discord";
            const ordered = [recommendation, ...prioritized.filter(item => item !== recommendation)].slice(0, 3);
            const plan = ordered.map((item, index) => `${index + 1}. [${item.severity || "Revisión"}] ${item.title}: ${item.detail}`).join("\n");
            const moreText = findings.length > ordered.length
                ? `\nHay ${findings.length - ordered.length} comprobación(es) adicional(es); puedes consultarlas en Comprobaciones.`
                : "";
            return { text: `Te propongo este orden de trabajo:\n${plan}\n\nEmpieza por el punto 1 porque ${reason}. Después resuelve los siguientes puntos y vuelve a Comprobaciones para verificar los resultados.${moreText}`, actionKey: recommendation.key || "__checks", actionLabel: recommendation.key ? "Abrir primera prioridad" : "Abrir Comprobaciones" };
        }
        const entries = [...Object.entries(currentModules.configurations || {}), ...Object.entries(currentModules.lists || {})];
        const pending = entries
            .filter(([key]) => currentModules.lists?.[key]
                ? !(configState.lists?.[key] || []).length
                : !configState.configurations?.[key]?.configured)
            .map(([key, definition]) => ({
                key,
                definition,
                requiredCount: (definition.fields || []).filter(field => field.type !== "section" && (field.required === true || field.validation?.required === true)).length
            }))
            .sort((a, b) => b.requiredCount - a.requiredCount)[0];
        if (pending) {
            const requiredText = pending.requiredCount
                ? ` Tiene ${pending.requiredCount} ajuste(s) marcado(s) como obligatorio(s), por lo que es un buen punto de partida.`
                : " Es un buen punto de partida para completar la cobertura de funciones del servidor.";
            return { text: `No encuentro incidencias en las comprobaciones disponibles. Te recomiendo configurar primero “${pending.definition.title}”, que todavía aparece pendiente.${requiredText} Cuando termines, vuelve a Comprobaciones para validar el resultado.`, actionKey: pending.key, actionLabel: "Abrir módulo pendiente" };
        }
        return { text: "Los módulos disponibles aparecen configurados y no he detectado incidencias en las comprobaciones disponibles. Te recomiendo probar en Discord los flujos principales y revisar Comprobaciones después de cambiar permisos o canales." };
    }
    if (!moduleQuestion && /\b(ayuda|que puedes hacer|funciones|como funciona|bryvex)\b/.test(q)) {
        return { text: "Puedo resumir el estado de la configuración, mostrar incidencias detectables (campos obligatorios, canales, roles y permisos), explicar por qué conviene revisar algo y abrir el módulo relacionado. No ejecuto cambios ni puedo confirmar eventos en vivo que no estén disponibles en la dashboard." };
    }
    if (!moduleQuestion && /\b(seguridad|seguro|proteger|proteccion|ataque|ataques|raid|spam|scam|estafa|malicioso|malware|vulnerabilidad|antifraude|phishing|suplantacion|invasion)\b/.test(q)) {
        const entries = [...Object.entries(currentModules?.configurations || {}), ...Object.entries(currentModules?.lists || {})];
        const securityTerms = /anti.?scam|anti.?raid|anti.?spam|seguridad|moderacion|proteccion|verificacion|logs|registro|captcha|automod|filtro|bloqueo|autoroles|permisos/i;
        const securityModules = entries.map(([key, definition]) => ({
            key,
            title: definition.title || key,
            description: definition.description || "",
            searchText: `${key} ${definition.title || ""} ${definition.category || ""} ${definition.description || ""}`
        })).filter(item => securityTerms.test(item.searchText)).slice(0, 6);
        const securityFindings = findings.filter(item => /scam|spam|raid|seguridad|permiso|canal|rol|moderacion|bloqueo/i.test(`${item.title} ${item.detail}`)).slice(0, 3);
        const moduleList = securityModules.length
            ? `Módulos relacionados que están disponibles en este panel: ${securityModules.map(item => item.title).join(", ")}.`
            : "No he identificado módulos de seguridad por su nombre o descripción; no voy a asumir que una función existe si no aparece en el panel.";
        const findingsText = securityFindings.length
            ? ` Incidencias que conviene revisar: ${securityFindings.map(item => item.detail).join(" ")}`
            : " Las comprobaciones cargadas no han señalado una incidencia específica de seguridad; eso no garantiza que el servidor esté protegido frente a todos los ataques.";
        const guidance = "Prioriza activar y configurar las protecciones anti-spam/anti-raid/anti-scam que existan, limita quién puede administrar el servidor y asignar roles, revisa los permisos y canales de registro, y prueba las medidas en Discord. No compartas tokens ni credenciales.";
        const preferred = securityModules.find(item => /anti.?scam|anti.?raid|anti.?spam|moderacion|verificacion|captcha|automod/i.test(item.searchText)) || securityModules[0];
        return {
            text: `Para mejorar la seguridad de ${activeGuild?.name || "tu servidor"}: ${guidance} ${moduleList}${findingsText}`,
            actionKey: preferred?.key || "__checks",
            actionLabel: preferred ? `Abrir ${preferred.title}` : "Abrir Comprobaciones"
        };
    }
    if (matched) {
        const isConfigured = currentModules.lists?.[matched.key]
            ? (configState.lists?.[matched.key] || []).length > 0
            : Boolean(configState.configurations?.[matched.key]?.configured);
        const related = findings.filter(item => item.key === matched.key);
        const stateText = currentModules.lists?.[matched.key]
            ? `${(configState.lists?.[matched.key] || []).length} elementos guardados`
            : isConfigured ? "aparece configurado" : "todavía aparece pendiente de configuración";
        const issueText = related.length ? ` Además, detecté ${related.length} comprobación(es) relacionada(s): ${related[0].detail}` : " No detecté incidencias específicas en las comprobaciones disponibles para este módulo.";
        const asksHowTo = /\b(como|configurar|configuro|usar|uso|activar|activo|crear|funciona|ayuda|explica|explicame|para que sirve)\b/.test(q);
        const asksForHelp = /\b(error|errores|problema|problemas|falla|fallo|arreglar|solucionar|por que|porque)\b/.test(q);
        let guidance = "";
        if (asksForHelp) {
            const moduleFindings = related.slice(0, 3);
            guidance = moduleFindings.length
                ? ` Las comprobaciones relacionadas indican: ${moduleFindings.map(item => item.detail).join(" ")} Corrige esos puntos y vuelve a comprobar el módulo.`
                : " No se ha detectado una incidencia específica en este módulo. Comprueba que esté activado si corresponde, revisa sus canales, roles y permisos, guarda los cambios y prueba la función directamente en Discord.";
            if (!isConfigured) guidance += " Este módulo aparece pendiente de configuración; empieza por completar sus ajustes.";
        } else if (asksHowTo) {
            const fieldGuidance = getAssistantFieldGuidance(q, matched.definition);
            guidance = fieldGuidance ? ` ${fieldGuidance}` : ` ${getAssistantModuleGuidance(matched.definition)}`;
        }
        return { text: `“${matched.definition.title}” ${stateText}.${guidance}${asksForHelp ? "" : issueText}`, actionKey: matched.key, actionLabel: "Abrir este módulo" };
    }
    if (/\b(canal|canales|rol|roles|permiso|permisos)\b/.test(q)) {
        const matching = findings.filter(item => /canal|rol|permiso/i.test(item.title + " " + item.detail));
        if (matching.length) return { text: matching.slice(0, 4).map(item => `• ${item.title}: ${item.detail}`).join("\n"), actionKey: matching.find(item => item.key)?.key || "__checks", actionLabel: "Revisar configuración" };
        return { text: "No he encontrado incidencias concretas de canales, roles o permisos en los datos disponibles. Puedes abrir Comprobaciones para consultar los resultados actuales; los permisos pueden cambiar directamente en Discord." , actionKey: "__checks", actionLabel: "Abrir Comprobaciones" };
    }
    return {
        text: "No puedo responder esa consulta directamente con la información que tengo disponible. Ve a Support y abre un ticket; el equipo podrá ayudarte.",
        actionUrl: "/support",
        actionLabel: "Ir a Support y abrir un ticket"
    };
}

function addAssistantMessage(text, role = "bot", actionKey = "", actionLabel = "", actionUrl = "") {
    const messages = document.querySelector("#assistant-messages");
    if (!messages) return;
    const article = document.createElement("article");
    article.className = `assistant-message ${role === "user" ? "assistant-message-user" : "assistant-message-bot"}`;
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    article.append(paragraph);
    if (actionUrl && actionLabel) {
        const link = document.createElement("a");
        link.className = "assistant-open-module";
        link.textContent = actionLabel;
        link.href = actionUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        article.append(link);
    } else if (actionKey && actionLabel) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "assistant-open-module";
        button.textContent = actionLabel;
        button.addEventListener("click", () => {
            if (actionKey === "__checks") renderChecks(currentModules);
            else navigateToModule(actionKey, currentModules);
            document.querySelector("#assistant-panel").hidden = true;
            document.querySelector("#assistant-launcher").setAttribute("aria-expanded", "false");
        });
        article.append(button);
    }
    messages.append(article);
    messages.scrollTop = messages.scrollHeight;
}

function setupAssistant() {
    const launcher = document.querySelector("#assistant-launcher");
    const panel = document.querySelector("#assistant-panel");
    const close = document.querySelector("#assistant-close");
    const form = document.querySelector("#assistant-form");
    const input = document.querySelector("#assistant-input");
    if (!launcher || !panel || !form || !input) return;
    const toggle = open => {
        panel.hidden = !open;
        launcher.setAttribute("aria-expanded", String(open));
        if (open) input.focus();
    };
    launcher.addEventListener("click", () => toggle(panel.hidden));
    close?.addEventListener("click", () => toggle(false));
    document.querySelectorAll("[data-assistant-prompt]").forEach(button => button.addEventListener("click", () => {
        input.value = button.dataset.assistantPrompt || "";
        form.requestSubmit();
    }));
    form.addEventListener("submit", event => {
        event.preventDefault();
        const question = input.value.trim();
        if (!question || !configState || !currentModules) return;
        addAssistantMessage(question, "user");
        input.value = "";
        const answer = assistantReply(question);
        addAssistantMessage(answer.text, "bot", answer.actionKey || "", answer.actionLabel || "", answer.actionUrl || "");
    });
    launcher.hidden = false;
    document.querySelector("#assistant-context-label").textContent = `Servidor: ${activeGuild?.name || "activo"}`;
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
        setupAssistant();
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
