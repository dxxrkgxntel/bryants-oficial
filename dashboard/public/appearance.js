(() => {
    window.applyDashboardAppearance = ({ backgroundBlur = 0, hasCustomBackground = false } = {}) => {
        const root = document.documentElement;
        const blur = Math.max(0, Math.min(20, Number(backgroundBlur) || 0));
        root.style.setProperty("--dashboard-background-blur", `${blur}px`);
        if (hasCustomBackground) {
            root.style.setProperty("--dashboard-background-image", `url("/api/account/background-image?v=${Date.now()}")`);
        } else {
            root.style.removeProperty("--dashboard-background-image");
        }
    };
    fetch("/api/account/appearance", { credentials: "same-origin", cache: "no-store" })
        .then(response => response.ok ? response.json() : null)
        .then(settings => { if (settings) window.applyDashboardAppearance(settings); })
        .catch(() => {});
})();
