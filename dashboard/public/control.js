(() => {
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const date = value => value ? new Date(value).toLocaleString("es-DO",{dateStyle:"medium",timeStyle:"short"}) : "—";
let data = {guilds:[],logins:[]};
function renderGuilds(query="") {
 const rows = data.guilds.filter(item => (item.name+" "+item.guildId).toLowerCase().includes(query.toLowerCase()));
 $("#guild-rows").innerHTML = rows.length ? rows.map(item => {
  const avatar = item.icon ? '<img src="'+esc(item.icon)+'" alt="">' : '<span class="avatar-fallback">'+esc((item.name||"??").slice(0,2).toUpperCase())+'</span>';
  return '<tr><td><div class="identity">'+avatar+'<strong>'+esc(item.name)+'</strong></div></td><td>'+esc(item.guildId)+'</td><td>'+date(item.firstSeenAt)+'</td><td>'+date(item.lastSeenAt)+'</td><td><span class="pill '+(item.isPresent?"ok":"off")+'">'+(item.isPresent?"En el servidor":"Ya salió")+'</span></td></tr>';
 }).join("") : '<tr><td colspan="5" class="empty">No hay servidores que coincidan.</td></tr>';
}
function renderLogins(query="") {
 const rows = data.logins.filter(item => ((item.globalName||"")+" "+(item.username||"")+" "+item.userId).toLowerCase().includes(query.toLowerCase()));
 $("#login-rows").innerHTML = rows.length ? rows.map(item => {
  const avatar = item.avatar ? '<img src="https://cdn.discordapp.com/avatars/'+encodeURIComponent(item.userId)+'/'+encodeURIComponent(item.avatar)+'.png?size=64" alt="">' : '<span class="avatar-fallback">'+esc((item.username||"?").slice(0,1).toUpperCase())+'</span>';
  return '<tr><td><div class="identity">'+avatar+'<span><strong>'+esc(item.globalName||item.username||"Usuario")+'</strong><small>@'+esc(item.username)+'</small></span></div></td><td>'+esc(item.userId)+'</td><td>'+date(item.firstLoginAt)+'</td><td>'+date(item.lastLoginAt)+'</td><td>'+Number(item.loginCount||0)+'</td><td><span class="pill '+(item.hasActiveSession?"ok":"off")+'">'+(item.hasActiveSession?"Activa":"No detectada")+'</span></td></tr>';
 }).join("") : '<tr><td colspan="6" class="empty">Todavía no hay inicios de sesión registrados.</td></tr>';
}
async function load() {
 try {
  const response = await fetch("/api/owner/control/summary",{credentials:"same-origin",cache:"no-store"});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error||"No se pudo cargar el control.");
  data = result;
  $("#present-count").textContent = result.summary.presentGuilds;
  $("#total-count").textContent = result.summary.totalGuilds;
  $("#users-count").textContent = result.summary.uniqueDashboardUsers;
  $("#logins-count").textContent = result.summary.totalLogins;
  $("#sessions-count").textContent = result.summary.activeSessions;
  renderGuilds($("#guild-search").value);
  renderLogins($("#login-search").value);
 } catch(error) { $("#notice").textContent = error.message; }
}
$("#guild-search").addEventListener("input",event=>renderGuilds(event.target.value));
$("#login-search").addEventListener("input",event=>renderLogins(event.target.value));
load();
})();
