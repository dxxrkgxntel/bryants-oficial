const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { AttachmentBuilder, MessageFlags } = require("discord.js");

function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
}

function hexColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : "#0000FF";
}

async function sendTrophyCard(channel, { user, achievement, points, rarity, level, settings, message }) {
    const canvas = createCanvas(1200, 630);
    const ctx = canvas.getContext("2d");
    const accent = hexColor(settings?.cardColor);
    const backgroundUrl = settings?.cardBackgroundUrl;
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, "#090b18");
    gradient.addColorStop(1, "#171b35");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 630);

    if (backgroundUrl && /^https:\/\//i.test(backgroundUrl)) {
        try {
            const background = await loadImage(backgroundUrl);
            ctx.save();
            ctx.globalAlpha = 0.24;
            const scale = Math.max(1200 / background.width, 630 / background.height);
            const width = background.width * scale;
            const height = background.height * scale;
            ctx.drawImage(background, (1200 - width) / 2, (630 - height) / 2, width, height);
            ctx.restore();
        } catch (error) {
            console.warn("[Achievements] No se pudo cargar el fondo de la tarjeta:", error.message);
        }
    }

    ctx.fillStyle = accent;
    roundedRect(ctx, 0, 0, 18, 630, 9);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.055)";
    roundedRect(ctx, 54, 48, 1092, 534, 34);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    roundedRect(ctx, 54, 48, 1092, 534, 34);
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.font = "700 25px sans-serif";
    ctx.letterSpacing = "5px";
    ctx.fillText(String(settings?.cardTitle || "TROFEO DESBLOQUEADO").toUpperCase().slice(0, 70), 100, 125);
    ctx.letterSpacing = "0px";

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 57px sans-serif";
    const name = String(achievement.name || "Trofeo").slice(0, 34);
    ctx.fillText(name, 100, 235, 880);

    ctx.fillStyle = "#c8cde0";
    ctx.font = "400 29px sans-serif";
    const description = String(achievement.description || "¡Has desbloqueado un nuevo trofeo!").slice(0, 100);
    ctx.fillText(description, 100, 292, 980);

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    roundedRect(ctx, 100, 350, 260, 72, 18);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 25px sans-serif";
    ctx.fillText(String(rarity || "COMMON").toUpperCase(), 125, 395);

    ctx.fillStyle = accent;
    roundedRect(ctx, 380, 350, 260, 72, 18);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 28px sans-serif";
    ctx.fillText("+" + Number(points || 0) + " PUNTOS", 405, 395);

    ctx.fillStyle = "#aab1ca";
    ctx.font = "500 22px sans-serif";
    ctx.fillText("NIVEL " + Number(level || 1), 100, 485);
    const displayName = String(user.globalName || user.username || "Miembro").slice(0, 45);
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 24px sans-serif";
    ctx.fillText(displayName, 100, 530, 850);

    try {
        const avatarUrl = user.displayAvatarURL({ extension: "png", size: 256 });
        const avatar = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(1040, 490, 54, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 986, 436, 108, 108);
        ctx.restore();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(1040, 490, 56, 0, Math.PI * 2);
        ctx.stroke();
    } catch (error) {
        console.warn("[Achievements] No se pudo cargar el avatar para la tarjeta:", error.message);
    }

    const attachment = new AttachmentBuilder(await canvas.encode("png"), { name: "trofeo-desbloqueado.png" });
    await channel.send({ content: message || undefined, files: [attachment], allowedMentions: { parse: [], users: [user.id] } });
}

async function sendTrophyComponents(channel, { user, achievement, points, rarity, level, settings, message }) {
    const color = parseInt(hexColor(settings?.cardColor).slice(1), 16);
    const content = [
        "## 🏆 " + String(settings?.cardTitle || "TROFEO DESBLOQUEADO"),
        "### " + String(achievement.emoji || "🏆") + " " + String(achievement.name || "Trofeo"),
        String(achievement.description || "¡Has desbloqueado un nuevo trofeo!"),
        "",
        "**Miembro:** <@" + user.id + ">",
        "**Rareza:** " + String(rarity || "common").toUpperCase() + "  ·  **Nivel:** " + Number(level || 1),
        "**Puntos obtenidos:** +" + Number(points || 0),
        "",
        String(message || "")
    ].filter(Boolean).join("\n");
    await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [{
            type: 17,
            accent_color: color,
            components: [{ type: 10, content }]
        }],
        allowedMentions: { parse: [], users: [user.id] }
    });
}

module.exports = { sendTrophyCard, sendTrophyComponents };
