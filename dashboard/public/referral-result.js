const messages = {
    credited: ["¡Referido confirmado!", "El bot se añadió correctamente a un servidor nuevo. Se acreditaron 1.000 monedas a quien compartió el enlace."],
    duplicate: ["Este referido ya se contó", "Cada usuario de Discord solo puede generar una recompensa de referido."],
    invalid: ["Enlace de invitación inválido", "No pude verificar este enlace. Pide uno nuevo desde la sección de recompensas."],
    unavailable: ["Invitaciones no disponibles", "El sistema de referidos aún no está configurado en el hosting."],
    "not-added": ["No se añadió el bot", "La recompensa se registra cuando aceptas añadir el bot a un servidor."],
    "not-new": ["El bot ya estaba en ese servidor", "Solo cuentan las instalaciones nuevas realizadas desde el enlace de referido."],
    self: ["No puedes referirte a ti mismo", "Invita a otra persona para obtener una recompensa."],
    error: ["No se pudo confirmar", "Ocurrió un problema al verificar la instalación. Vuelve a intentarlo desde el enlace de referido."]
};
const status = new URLSearchParams(window.location.search).get("status");
const [title, message] = messages[status] || messages.invalid;
document.querySelector("#referral-result-title").textContent = title;
document.querySelector("#referral-result-message").textContent = message;
