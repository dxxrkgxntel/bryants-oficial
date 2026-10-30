const $ = selector => document.querySelector(selector);
let csrfToken = "";
let activeTicketId = null;
let activeTicketLastMessageId = null;
let currentUser = null;
let ticketsLoadPromise = null;
let supportPollRunning = false;

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
function renderTickets(tickets) {
    const list=$("#support-ticket-list"); list.replaceChildren();
    if (!tickets.length) { const empty=document.createElement("p"); empty.className="support-muted"; empty.textContent="Todavía no has creado tickets."; list.append(empty); return; }
    for (const ticket of tickets) {
        const button=document.createElement("button"); button.type="button"; button.className="support-ticket-item"; button.setAttribute("aria-current",String(ticket.id===activeTicketId));
        const title=document.createElement("strong"); title.textContent=`#${ticket.ticketNumber} · ${ticket.subject}`;
        const status=document.createElement("span"); status.className=`support-status ${ticket.status}`; status.textContent=ticket.status==="open"?"Abierto":"Cerrado";
        const meta=document.createElement("small"); meta.textContent=`Bryvex Support · ${ticket.category==="bot"?"Bryvex Bot":"Página web de Bryvex Bot"} · ${new Date(ticket.updatedAt).toLocaleString()}`;
        title.append(" ",status); button.append(title,meta); button.addEventListener("click",()=>openTicket(ticket.id)); list.append(button);
    }
}
async function loadTickets() {
    if (ticketsLoadPromise) return ticketsLoadPromise;
    ticketsLoadPromise = (async () => {
        const result = await supportApi("/api/support/tickets");
        renderTickets(result.tickets);
        return result.tickets;
    })();
    try { await ticketsLoadPromise; } finally { ticketsLoadPromise = null; }
}

function appendSupportMessage(message, ticketUserId) {
    const messages = $("#support-messages");
    const item = document.createElement("article");
    item.className = `support-message ${message.authorId !== ticketUserId ? "staff" : ""}`;
    item.dataset.messageId = message.id;
    const head = document.createElement("div"); head.className = "support-message-head";
    const author = document.createElement("strong"); author.textContent = message.authorName;
    const time = document.createElement("time"); time.textContent = new Date(message.createdAt).toLocaleString();
    const body = document.createElement("p"); body.textContent = message.content;
    head.append(author, time); item.append(head, body); messages.append(item);
}

function updateActiveTicketHeader(ticket) {
    $("#support-ticket-number").textContent = `TICKET #${ticket.ticketNumber}`;
    $("#support-ticket-subject").textContent = ticket.subject;
    $("#support-ticket-meta").textContent = `Bryvex Support · ${ticket.category === "bot" ? "Bryvex Bot" : "Página web de Bryvex Bot"} · ${ticket.status === "open" ? "Abierto" : "Cerrado"}`;
    $("#support-close").hidden = ticket.status !== "open";
    $("#support-reply-form").hidden = ticket.status !== "open";
}

async function openTicket(id, refreshList = true) {
    const result = await supportApi(`/api/support/tickets/${encodeURIComponent(id)}`);
    activeTicketId = result.ticket.id;
    $("#support-conversation-card").hidden = false;
    updateActiveTicketHeader(result.ticket);
    const messages = $("#support-messages"); messages.replaceChildren();
    for (const message of result.ticket.messages) appendSupportMessage(message, result.ticket.userId);
    activeTicketLastMessageId = result.ticket.messages.at(-1)?.id || null;
    messages.scrollTop = messages.scrollHeight;
    if (refreshList) await loadTickets();
}

async function refreshActiveTicket() {
    if (!activeTicketId || $("#support-reply-form").hidden) return;
    const ticketId = activeTicketId;
    const after = activeTicketLastMessageId ? `?after=${encodeURIComponent(activeTicketLastMessageId)}` : "";
    const result = await supportApi(`/api/support/tickets/${encodeURIComponent(ticketId)}${after}`);
    if (activeTicketId !== ticketId) return;
    const ticket = result.ticket;
    updateActiveTicketHeader(ticket);
    if (ticket.messages.length) {
        const messages = $("#support-messages");
        const wasNearBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 80;
        for (const message of ticket.messages) appendSupportMessage(message, ticket.userId);
        activeTicketLastMessageId = ticket.messages.at(-1)?.id || activeTicketLastMessageId;
        if (wasNearBottom) messages.scrollTop = messages.scrollHeight;
        await loadTickets();
    }
}
async function init() {
    try {
        const session=await supportApi("/api/me");
        if (!session.user) { $("#support-login-card").hidden=false; $("#support-app").hidden=true; return; }
        currentUser=session.user; csrfToken=session.csrfToken || "";
        $("#support-login-card").hidden=true; $("#support-app").hidden=false; $("#support-login").hidden=true; $("#support-logout").hidden=false;
        const tickets = await loadTickets();
        const requestedTicket = new URLSearchParams(window.location.search).get("ticket");
        if (/^[a-f\d]{24}$/i.test(requestedTicket || "") && tickets.some(ticket => ticket.id === requestedTicket)) {
            await openTicket(requestedTicket, false);
        }
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

window.setInterval(async () => {
    if (document.hidden || !currentUser || !activeTicketId || supportPollRunning) return;
    supportPollRunning = true;
    try { await refreshActiveTicket(); }
    catch { /* Los mensajes nuevos se volverán a consultar en el siguiente ciclo. */ }
    finally { supportPollRunning = false; }
}, 5000);

window.setInterval(() => {
    if (!document.hidden && currentUser) loadTickets().catch(() => {});
}, 30000);
