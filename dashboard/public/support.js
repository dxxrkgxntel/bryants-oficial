const $ = selector => document.querySelector(selector);
let csrfToken = "";
let activeTicketId = null;
let currentUser = null;

async function supportApi(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body) headers["Content-Type"] = "application/json";
    if (!["GET", "HEAD"].includes((options.method || "GET").toUpperCase())) headers["x-csrf-token"] = csrfToken;
    const response = await fetch(url, { ...options, headers, credentials: "same-origin", cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "No se pudo completar la solicitud.");
    return result;
}
function notice(message) { const node=$("#support-notice"); node.textContent=message; node.hidden=false; }
function escapeText(value) { return String(value ?? ""); }
function renderTickets(tickets) {
    const list=$("#support-ticket-list"); list.replaceChildren();
    if (!tickets.length) { const empty=document.createElement("p"); empty.className="support-muted"; empty.textContent="Todavía no has creado tickets."; list.append(empty); return; }
    for (const ticket of tickets) {
        const button=document.createElement("button"); button.type="button"; button.className="support-ticket-item"; button.setAttribute("aria-current",String(ticket.id===activeTicketId));
        const title=document.createElement("strong"); title.textContent=`#${ticket.ticketNumber} · ${ticket.subject}`;
        const status=document.createElement("span"); status.className=`support-status ${ticket.status}`; status.textContent=ticket.status==="open"?"Abierto":"Cerrado";
        const meta=document.createElement("small"); meta.textContent=`${ticket.category==="bot"?"Bryvex Bot":"Página web"} · ${new Date(ticket.updatedAt).toLocaleString()}`;
        title.append(" ",status); button.append(title,meta); button.addEventListener("click",()=>openTicket(ticket.id)); list.append(button);
    }
}
async function loadTickets() {
    const result=await supportApi("/api/support/tickets"); renderTickets(result.tickets);
}
async function openTicket(id) {
    const result=await supportApi(`/api/support/tickets/${encodeURIComponent(id)}`);
    activeTicketId=result.ticket.id;
    $("#support-conversation-card").hidden=false;
    $("#support-ticket-number").textContent=`TICKET #${result.ticket.ticketNumber}`;
    $("#support-ticket-subject").textContent=result.ticket.subject;
    $("#support-ticket-meta").textContent=`${result.ticket.category==="bot"?"Bryvex Bot":"Página web"} · ${result.ticket.status==="open"?"Abierto":"Cerrado"}`;
    $("#support-close").hidden=result.ticket.status!=="open";
    const messages=$("#support-messages"); messages.replaceChildren();
    for (const message of result.ticket.messages) {
        const item=document.createElement("article"); item.className=`support-message ${message.source==="web"&&message.authorId!==currentUser.id?"staff":""}`;
        const head=document.createElement("div"); head.className="support-message-head";
        const author=document.createElement("strong"); author.textContent=message.authorName;
        const time=document.createElement("time"); time.textContent=new Date(message.createdAt).toLocaleString();
        const body=document.createElement("p"); body.textContent=message.content;
        head.append(author,time); item.append(head,body); messages.append(item);
    }
    $("#support-reply-form").hidden=result.ticket.status!=="open";
    messages.scrollTop=messages.scrollHeight;
    await loadTickets();
}
async function init() {
    try {
        const session=await supportApi("/api/me");
        if (!session.user) { $("#support-login-card").hidden=false; $("#support-app").hidden=true; return; }
        currentUser=session.user; csrfToken=session.csrfToken || "";
        $("#support-login-card").hidden=true; $("#support-app").hidden=false; $("#support-login").hidden=true; $("#support-logout").hidden=false;
        await loadTickets();
    } catch(error) { notice(error.message); }
}
$("#support-create-form").addEventListener("submit",async event=>{
    event.preventDefault();
    const button=event.currentTarget.querySelector("button[type=submit]"); button.disabled=true;
    try {
        const result=await supportApi("/api/support/tickets",{method:"POST",body:JSON.stringify({category:$("#support-category").value,subject:$("#support-subject").value,message:$("#support-message").value})});
        $("#support-subject").value=""; $("#support-message").value="";
        notice(`Ticket #${result.ticket.ticketNumber} creado correctamente.`);
        await loadTickets(); await openTicket(result.ticket.id);
    } catch(error) { notice(error.message); } finally { button.disabled=false; }
});
$("#support-reply-form").addEventListener("submit",async event=>{
    event.preventDefault(); if(!activeTicketId)return;
    const button=event.currentTarget.querySelector("button[type=submit]");button.disabled=true;
    try { await supportApi(`/api/support/tickets/${encodeURIComponent(activeTicketId)}/messages`,{method:"POST",body:JSON.stringify({content:$("#support-reply").value})}); $("#support-reply").value=""; await openTicket(activeTicketId); }
    catch(error){notice(error.message);}finally{button.disabled=false;}
});
$("#support-close").addEventListener("click",async()=>{
    if(!activeTicketId||!confirm("¿Quieres cerrar este ticket?"))return;
    try{await supportApi(`/api/support/tickets/${encodeURIComponent(activeTicketId)}/close`,{method:"POST",body:"{}"});await openTicket(activeTicketId);notice("Ticket cerrado.");}
    catch(error){notice(error.message);}
});
$("#support-refresh").addEventListener("click",()=>loadTickets().catch(error=>notice(error.message)));
$("#support-logout").addEventListener("click",async()=>{
    try{await supportApi("/auth/logout",{method:"POST",body:"{}"});window.location.reload();}
    catch(error){notice(error.message);}
});
init();
\nwindow.setInterval(() => {\n    if (document.hidden || !currentUser) return;\n    loadTickets().catch(() => {});\n    if (activeTicketId && !$("#support-reply-form").hidden) openTicket(activeTicketId).catch(() => {});\n}, 15000);\n