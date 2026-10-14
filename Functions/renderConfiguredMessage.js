function renderConfiguredMessage(template, values = {}) {
    if (typeof template !== "string" || !template.trim()) return "";
    return template.replace(/\{([a-zA-Z]+)\}/g, (token, key) =>
        Object.prototype.hasOwnProperty.call(values, key) ? String(values[key] ?? "") : token
    ).trim();
}

function parseConfiguredColor(value) {
    if (typeof value !== "string" || !/^#[\da-f]{6}$/i.test(value)) return null;
    return Number.parseInt(value.slice(1), 16);
}

module.exports = { renderConfiguredMessage, parseConfiguredColor };
