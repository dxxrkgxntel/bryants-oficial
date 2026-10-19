(() => {
  const select = document.querySelector("#leaderboard-guild");
  const refresh = document.querySelector("#leaderboard-refresh");
  const type = document.querySelector("#leaderboard-type");
  const message = document.querySelector("#leaderboard-message");
  const results = document.querySelector("#leaderboard-results");
  const meta = document.querySelector("#leaderboard-meta");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const money = value => new Intl.NumberFormat("es-DO",{maximumFractionDigits:0}).format(Number(value)||0);
  let csrfToken = "";
  const api = async (url, options = {}) => {
    const response = await fetch(url,{credentials:"same-origin",cache:"no-store",...options,headers:{"Accept":"application/json",...(options.headers||{})}});
    const payload = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(payload.error || "No se pudo completar la solicitud.");
    return payload;
  };
  const showMessage = text => { message.hidden = false; message.textContent = text; results.hidden = true; };
  const loadLeaderboard = async () => {
    const guildId = select.value;
    if (!guildId) { showMessage("Selecciona un servidor para consultar su clasificación."); return; }
    refresh.disabled = true;
    showMessage("Cargando clasificación…");
    try {
      const selectedType = type.value || "economy";
      const data = await api("/api/guilds/"+encodeURIComponent(guildId)+"/leaderboards/"+selectedType);
      if (!data.leaderboard?.length) { showMessage("Todavía no hay balances registrados para este servidor."); meta.textContent = ""; return; }
      results.innerHTML = data.leaderboard.map(item => selectedType === "economy" ? `<div class="hub-status-row"><div><strong><span style="color:#d8aaff;display:inline-block;min-width:38px">#${item.rank}</span> ${esc(item.name)}</strong><small>Cartera: ${money(item.wallet)} · Banco: ${money(item.bank)}</small></div><span class="hub-pill ok">${money(item.total)} monedas</span></div>` : `<div class="hub-status-row"><div><strong><span style="color:#d8aaff;display:inline-block;min-width:38px">#${item.rank}</span> ${esc(item.name)}</strong><small>Nivel ${money(item.level)} · Prestigio ${money(item.prestige)}</small></div><span class="hub-pill ok">${money(item.xp)} XP</span></div>`).join("");
      message.hidden = true;
      results.hidden = false;
      meta.textContent = "Actualizado: "+new Date(data.updatedAt).toLocaleString("es-DO")+". Se muestran hasta 10 miembros.";
    } catch (error) { showMessage(error.message); }
    finally { refresh.disabled = false; }
  };
  const init = async () => {
    try {
      const me = await api("/api/me");
      if (!me.user) { showMessage("Inicia sesión con Discord para ver las clasificaciones de tus servidores."); select.innerHTML = '<option value="">Necesitas iniciar sesión</option>'; return; }
      csrfToken = me.csrfToken || "";
      const data = await api("/api/guilds");
      const guilds = data.guilds || [];
      if (!guilds.length) { showMessage("No encontré servidores disponibles. Comprueba que tengas permisos administrativos y que Bryvex Bot esté instalado."); select.innerHTML = '<option value="">Sin servidores disponibles</option>'; return; }
      select.innerHTML = '<option value="">Elige un servidor…</option>'+guilds.map(guild=>`<option value="${esc(guild.id)}">${esc(guild.name)}</option>`).join("");
      showMessage("Elige un servidor para cargar su clasificación de economía.");
      refresh.disabled = false;
    } catch (error) { showMessage(error.message); }
  };
  select.addEventListener("change",loadLeaderboard);
  type.addEventListener("change",loadLeaderboard);
  refresh.addEventListener("click",loadLeaderboard);
  init();
})();