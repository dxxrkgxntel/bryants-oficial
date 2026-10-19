(function () {
    const icon = document.getElementById("preview-server-icon");
    if (!icon) return;

    async function refreshPreviewServerIcon() {
        try {
            const response = await fetch("/api/preview-server-icon", { cache: "no-store" });
            if (!response.ok) return;
            const data = await response.json();
            if (typeof data.iconUrl === "string" && data.iconUrl) {
                if (icon.src !== data.iconUrl) icon.src = data.iconUrl;
            }
        } catch {
            // Keep the purple fallback icon if Discord cannot be reached.
        }
    }

    refreshPreviewServerIcon();
    window.setInterval(refreshPreviewServerIcon, 5 * 60_000);
})();
