(() => {
  const source = document.querySelector("#template-source");
  const destination = document.querySelector("#template-destination");
  const fileInput = document.querySelector("#template-file");
  const exportButton = document.querySelector("#template-export");
  const importButton = document.querySelector("#template-import");
  const message = document.querySelector("#template-message");
  const progress = document.querySelector("#template-progress");
  let csrfToken = "";
  let guilds = [];
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const api = async (url, options = {}) => {
    const response = await fetch(url,{credentials:"same-origin",cache:"no-store",...options,headers:{"Accept":"application/json",...(options.headers||{})}});
    const payload = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(payload.error || "No se pudo completar la solicitud.");
    return payload;
  };
  const say = value => { message.textContent = value; };
  const fillGuilds = () => {
    const options = '<option value="">Elige un servidor…</option>'+guilds.map(guild=>`<option value="${esc(guild.id)}">${esc(guild.name)}</option>`).join("");
    source.innerHTML = options;
    destination.innerHTML = options;
  };
  const readFile = async () => {
    const file = fileInput.files?.[0];
    if (!file) throw new Error("Selecciona un archivo JSON de plantilla.");
    if (file.size > 2 * 1024 * 1024) throw new Error("La plantilla supera el límite de 2 MB.");
    let data;
    try { data = JSON.parse(await file.text()); } catch { throw new Error("El archivo no contiene JSON válido."); }
    if (data?.format !== "bryvex-bot-config-template" || data?.version !== 1 || !data?.configurations || typeof data.configurations !== "object" || Array.isArray(data.configurations)) {
      throw new Error("El archivo no es una plantilla de configuración compatible de Bryvex Bot.");
    }
    return data;
  };
  const updateButtons = () => {
    exportButton.disabled = !csrfToken || !source.value;
    importButton.disabled = !csrfToken || !destination.value || !fileInput.files?.length;
  };
  const exportTemplate = async () => {
    exportButton.disabled = true;
    try {
      const data = await api("/api/guilds/"+encodeURIComponent(source.value)+"/config");
      const guild = guilds.find(item=>item.id===source.value);
      const template = {format:"bryvex-bot-config-template",version:1,exportedAt:new Date().toISOString(),sourceGuildName:guild?.name||"Servidor",configurations:data.configurations};
      const blob = new Blob([JSON.stringify(template,null,2)],{type:"application/json"});
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "bryvex-template-"+(guild?.name||"servidor").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9-_]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()+".json";
      document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      say("Copia descargada. Antes de importarla en otro servidor, revisa los IDs de canales y roles: la validación rechazará referencias que no pertenezcan al servidor de destino.");
    } catch (error) { say(error.message); }
    finally { updateButtons(); }
  };
  const importTemplate = async () => {
    importButton.disabled = true;
    progress.hidden = true;
    try {
      if (source.value && source.value === destination.value) {
        if (!confirm("Vas a aplicar una plantilla sobre el mismo servidor de origen. ¿Continuar?")) return;
      }
      const template = await readFile();
      const data = await api("/api/guilds/"+encodeURIComponent(destination.value)+"/config");
      const definitions = data.modules?.configurations || {};
      const keys = Object.keys(template.configurations).filter(key=>Object.prototype.hasOwnProperty.call(definitions,key));
      if (!keys.length) throw new Error("La plantilla no contiene módulos de configuración compatibles.");
      const skipped = Object.keys(template.configurations).filter(key=>!Object.prototype.hasOwnProperty.call(definitions,key));
      const preview = keys.slice(0,12).map(key=>definitions[key].title||key).join(", ");
      const warning = "Se aplicarán "+keys.length+" módulo(s) al servidor de destino.\n\nMódulos: "+preview+(keys.length>12?"…":"")+(skipped.length?"\n\nSe omitirán "+skipped.length+" módulo(s) desconocido(s).":"")+"\n\nLos ajustes actuales de esos módulos serán reemplazados. Las listas no se copian. Haz una copia de seguridad antes de continuar.\n\n¿Aplicar ahora?";
      if (!confirm(warning)) return;
      progress.hidden = false;
      const outcomes = [];
      for (const key of keys) {
        try {
          const values = template.configurations[key];
          if (!values || typeof values !== "object" || Array.isArray(values)) throw new Error("Formato de módulo inválido.");
          const response = await api("/api/guilds/"+encodeURIComponent(destination.value)+"/config/"+encodeURIComponent(key),{
            method:"PUT",
            headers:{"Content-Type":"application/json","X-CSRF-Token":csrfToken},
            body:JSON.stringify(values)
          });
          outcomes.push({key,title:definitions[key].title||key,ok:true,detail:"Guardado"});
        } catch (error) { outcomes.push({key,title:definitions[key].title||key,ok:false,detail:error.message}); }
        progress.innerHTML = outcomes.map(item=>`<div class="hub-status-row"><div><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></div><span class="hub-pill ${item.ok?"ok":"bad"}">${item.ok?"Aplicado":"Falló"}</span></div>`).join("");
      }
      const ok = outcomes.filter(item=>item.ok).length;
      say(`Importación terminada: ${ok} de ${outcomes.length} módulos aplicados correctamente. ${skipped.length ? skipped.length+" módulo(s) desconocido(s) se omitieron. " : ""}Revisa los módulos fallidos y abre Comprobaciones en el dashboard de Bryvex Bot.`);
    } catch (error) { say(error.message); }
    finally { updateButtons(); }
  };
  const init = async () => {
    try {
      const me = await api("/api/me");
      if (!me.user) { say("Inicia sesión con Discord para administrar plantillas."); source.innerHTML='<option value="">Necesitas iniciar sesión</option>';destination.innerHTML='<option value="">Necesitas iniciar sesión</option>';return; }
      csrfToken = me.csrfToken || "";
      const data = await api("/api/guilds");
      guilds = data.guilds || [];
      if (!guilds.length) { say("No encontré servidores disponibles. Necesitas permisos administrativos y tener Bryvex Bot instalado.");source.innerHTML='<option value="">Sin servidores disponibles</option>';destination.innerHTML='<option value="">Sin servidores disponibles</option>';return; }
      fillGuilds();
      say("Elige un servidor de origen para exportar una copia o un servidor de destino para importar una plantilla. Las validaciones del dashboard siguen activas.");
    } catch (error) { say(error.message); }
  };
  source.addEventListener("change",updateButtons);
  destination.addEventListener("change",updateButtons);
  fileInput.addEventListener("change",updateButtons);
  exportButton.addEventListener("click",exportTemplate);
  importButton.addEventListener("click",importTemplate);
  init();
})();