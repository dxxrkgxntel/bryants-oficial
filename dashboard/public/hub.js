(() => {
  const root = document.querySelector("[data-public-status]");
  if (!root) return;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const labels = {web:"Dashboard web",database:"Base de datos",discord:"API de Discord"};
  const render = data => {
    root.innerHTML = (data.components || []).map(component => {
      const state = component.status === "operational" ? "ok" : component.status === "degraded" ? "warn" : "bad";
      const label = component.status === "operational" ? "Operativo" : component.status === "degraded" ? "Degradado" : "No disponible";
      return `<div class="hub-status-row"><div><strong>${esc(labels[component.id] || component.name)}</strong><small>${esc(component.description)}</small></div><span class="hub-pill ${state}">${label}</span></div>`;
    }).join("");
    const meta = document.querySelector("[data-status-meta]");
    if (meta) meta.textContent = `Última comprobación: ${new Date(data.checkedAt).toLocaleString("es-DO")} · Uptime del dashboard: ${formatDuration(data.uptimeSeconds)}`;
    const summary = document.querySelector("[data-status-summary]");
    if (summary) {
      const allOk = (data.components || []).every(item => item.status === "operational");
      summary.textContent = allOk ? "Todos los componentes comprobados responden correctamente." : "Se detectó al menos un componente que necesita revisión.";
      summary.className = "hub-callout " + (allOk ? "" : "hub-status-degraded");
    }
  };
  const formatDuration = seconds => {
    const value = Math.max(0, Number(seconds) || 0);
    const days = Math.floor(value / 86400), hours = Math.floor(value % 86400 / 3600), minutes = Math.floor(value % 3600 / 60);
    return [days ? days + " d" : "", hours ? hours + " h" : "", minutes + " min"].filter(Boolean).join(" ");
  };
  const load = async () => {
    const refresh = document.querySelector("[data-status-refresh]");
    if (refresh) refresh.disabled = true;
    try {
      const response = await fetch("/api/public/status", {headers:{"Accept":"application/json"}, cache:"no-store"});
      if (!response.ok) throw new Error("No se pudo consultar el estado.");
      render(await response.json());
    } catch {
      root.innerHTML = '<div class="hub-empty">No fue posible consultar el estado en este momento. Inténtalo de nuevo en unos segundos.</div>';
      const meta = document.querySelector("[data-status-meta]");
      if (meta) meta.textContent = "Comprobación no disponible.";
    } finally {
      if (refresh) refresh.disabled = false;
    }
  };
  document.querySelector("[data-status-refresh]")?.addEventListener("click", load);
  load();
  window.setInterval(load, 60000);
})();