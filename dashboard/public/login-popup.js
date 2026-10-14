(() => {
    const supportedLocales = new Set(["en", "es", "de", "pt", "fr", "pl", "tr", "ru", "it", "nl"]);
    const popupFeatures = () => {
        const width = 520;
        const height = 720;
        const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
        const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
        return `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
    };

    document.querySelectorAll('a[href="/auth/login"]').forEach(link => {
        link.addEventListener("click", event => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            const url = new URL(link.href, window.location.origin);
            url.searchParams.set("popup", "1");
            const locale = (window.dashboardI18n?.locale || document.documentElement.lang || "es").toLowerCase().split("-")[0];
            url.searchParams.set("locale", supportedLocales.has(locale) ? locale : "es");
            const popup = window.open(url.toString(), "bryants-discord-login", popupFeatures());
            if (!popup) window.location.assign(url.toString());
            else popup.focus();
        });
    });

    const completeLogin = () => window.refreshDashboardAfterLogin?.();
    window.addEventListener("message", event => {
        if (event.origin !== window.location.origin || event.data?.type !== "bryants-discord-login-complete") return;
        completeLogin();
    });
    window.addEventListener("storage", event => {
        if (event.key === "bryants-discord-login-complete") completeLogin();
    });
    if ("BroadcastChannel" in window) {
        const loginChannel = new BroadcastChannel("bryants-discord-login");
        loginChannel.addEventListener("message", event => {
            if (event.data?.type === "bryants-discord-login-complete") completeLogin();
        });
    }
})();
