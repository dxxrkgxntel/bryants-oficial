const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { AttachmentBuilder, MessageFlags } = require("discord.js");

function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x + width, y + height - r, r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

function hexColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : "#0000FF";
}

function drawPill(ctx, x, y, width, height, fill, label, textColor = "#FFFFFF", font = "700 18px sans-serif") {
    ctx.fillStyle = fill;
    roundedRect(ctx, x, y, width, height, height / 2);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + width / 2, y + height / 2 + 1, width - 24);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
}

function fitText(ctx, text, maxWidth, initialSize, weight = 800, family = "sans-serif") {
    let size = initialSize;
    while (size > 24) {
        ctx.font = weight + " " + size + "px " + family;
        if (ctx.measureText(text).width <= maxWidth) break;
        size -= 2;
    }
    return size;
}

async function sendTrophyCard(channel, { user, achievement, points, rarity, level, settings, message }) {
    const W = 1200, H = 630;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const accent = hexColor(settings?.cardColor);
    const backgroundUrl = settings?.cardBackgroundUrl;

    // Dark, premium base with electric-blue ambient lighting.
    const base = ctx.createLinearGradient(0, 0, W, H);
    base.addColorStop(0, "#070B18");
    base.addColorStop(0.52, "#111936");
    base.addColorStop(1, "#080D1D");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);

    if (backgroundUrl && /^https:\/\//i.test(backgroundUrl)) {
        try {
            const background = await loadImage(backgroundUrl);
            const scale = Math.max(W / background.width, H / background.height);
            const bw = background.width * scale, bh = background.height * scale;
            ctx.save();
            ctx.globalAlpha = 0.22;
            ctx.drawImage(background, (W - bw) / 2, (H - bh) / 2, bw, bh);
            ctx.restore();
        } catch (error) {
            console.warn("[Achievements] No se pudo cargar el fondo de la tarjeta:", error.message);
        }
    }

    // Atmospheric glows.
    for (const glow of [
        { x: 1050, y: 110, radius: 310, color: accent, alpha: 0.25 },
        { x: 210, y: 600, radius: 260, color: "#583CFF", alpha: 0.15 }
    ]) {
        const g = ctx.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, glow.radius);
        g.addColorStop(0, glow.color + (glow.alpha > 0.2 ? "55" : "2B"));
        g.addColorStop(1, glow.color + "00");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }

    // Thin frame and accent rail.
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    roundedRect(ctx, 20, 20, W - 40, H - 40, 30);
    ctx.stroke();
    const rail = ctx.createLinearGradient(0, 50, 0, H - 50);
    rail.addColorStop(0, accent);
    rail.addColorStop(1, "#8172FF");
    ctx.fillStyle = rail;
    roundedRect(ctx, 20, 54, 6, H - 108, 3);
    ctx.fill();

    // Subtle technical grid on the right.
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.strokeStyle = "#A9B8FF";
    ctx.lineWidth = 1;
    for (let x = 790; x < 1160; x += 34) {
        ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, 600); ctx.stroke();
    }
    for (let y = 48; y < 610; y += 34) {
        ctx.beginPath(); ctx.moveTo(780, y); ctx.lineTo(1160, y); ctx.stroke();
    }
    ctx.restore();

    // Brand/title label.
    ctx.fillStyle = accent;
    roundedRect(ctx, 66, 62, 8, 34, 4);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 19px sans-serif";
    ctx.letterSpacing = "3px";
    ctx.fillText(String(settings?.cardTitle || "TROFEO DESBLOQUEADO").toUpperCase().slice(0, 54), 92, 85, 620);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = "#8390B8";
    ctx.font = "500 13px sans-serif";
    ctx.fillText("BRYVEX  /  ACHIEVEMENT UNLOCKED", 68, 125);

    // Trophy medallion icon drawn with vector paths (emoji/font independent).
    const medX = 105, medY = 210;
    const medGrad = ctx.createLinearGradient(medX - 40, medY - 40, medX + 40, medY + 40);
    medGrad.addColorStop(0, accent);
    medGrad.addColorStop(1, "#7165FF");
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath(); ctx.arc(medX, medY, 44, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.20)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(medX, medY, 44, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = medGrad;
    // Cup
    roundedRect(ctx, medX - 18, medY - 20, 36, 27, 5); ctx.fill();
    ctx.fillRect(medX - 13, medY + 6, 26, 5);
    ctx.fillRect(medX - 4, medY + 11, 8, 10);
    roundedRect(ctx, medX - 16, medY + 20, 32, 5, 2); ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(medX - 18, medY - 8, 10, Math.PI * 0.45, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(medX + 18, medY - 8, 10, -Math.PI * 0.5, Math.PI * 0.55); ctx.stroke();

    // Main achievement title.
    const name = String(achievement.name || "Nuevo trofeo").slice(0, 80);
    const titleSize = fitText(ctx, name, 640, 54, 800);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "800 " + titleSize + "px sans-serif";
    ctx.fillText(name, 68, 300, 650);

    const description = String(achievement.description || "Has desbloqueado un nuevo trofeo.").replace(/\s+/g, " ").slice(0, 115);
    ctx.fillStyle = "#B8C2E0";
    ctx.font = "400 21px sans-serif";
    const words = description.split(" ");
    let line = "", lineY = 342, lines = 0;
    for (const word of words) {
        const next = line ? line + " " + word : word;
        if (ctx.measureText(next).width > 650 && line) {
            ctx.fillText(line, 70, lineY);
            lineY += 29; lines++; line = word;
            if (lines >= 2) break;
        } else line = next;
    }
    if (line && lines < 3) ctx.fillText(line, 70, lineY);

    // Rarity and level chips.
    const rarityText = String(rarity || "COMÚN").toUpperCase().slice(0, 18);
    const rarityWidth = Math.max(125, Math.min(220, ctx.measureText(rarityText).width + 42));
    drawPill(ctx, 68, 415, rarityWidth, 42, "rgba(255,255,255,0.09)", rarityText, "#E0E7FF", "700 15px sans-serif");
    drawPill(ctx, 80 + rarityWidth, 415, 132, 42, "rgba(255,255,255,0.06)", "NIVEL " + Number(level || 1), "#B9C5E9", "700 15px sans-serif");

    // Bottom member identity.
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(68, 493, 625, 1);
    ctx.fillStyle = "#7F8BB1";
    ctx.font = "600 12px sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText("DESBLOQUEADO POR", 70, 523);
    ctx.letterSpacing = "0px";
    const displayName = String(user.globalName || user.username || "Miembro").slice(0, 48);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 23px sans-serif";
    ctx.fillText(displayName, 70, 557, 530);
    ctx.fillStyle = "#8E9ABD";
    ctx.font = "400 14px sans-serif";
    ctx.fillText("Tu progreso. Tu historia.", 70, 581);

    // Hero avatar ring and points panel.
    const avatarX = 1000, avatarY = 260, avatarR = 86;
    const ring = ctx.createLinearGradient(avatarX - avatarR, avatarY - avatarR, avatarX + avatarR, avatarY + avatarR);
    ring.addColorStop(0, accent);
    ring.addColorStop(1, "#A69BFF");
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 30;
    ctx.strokeStyle = ring;
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(avatarX, avatarY, avatarR + 2, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#111936";
    ctx.beginPath(); ctx.arc(avatarX, avatarY, avatarR - 3, 0, Math.PI * 2); ctx.fill();
    try {
        const avatar = await loadImage(user.displayAvatarURL({ extension: "png", size: 256 }));
        ctx.save();
        ctx.beginPath(); ctx.arc(avatarX, avatarY, avatarR - 8, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(avatar, avatarX - avatarR + 8, avatarY - avatarR + 8, (avatarR - 8) * 2, (avatarR - 8) * 2);
        ctx.restore();
    } catch (error) {
        console.warn("[Achievements] No se pudo cargar el avatar para la tarjeta:", error.message);
        ctx.fillStyle = "#26335D";
        ctx.beginPath(); ctx.arc(avatarX, avatarY, avatarR - 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#FFFFFF"; ctx.font = "700 46px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(displayName.slice(0, 1).toUpperCase(), avatarX, avatarY + 16);
        ctx.textAlign = "left";
    }

    // Points badge sits across the avatar base.
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 18;
    const pointsGrad = ctx.createLinearGradient(850, 365, 1110, 420);
    pointsGrad.addColorStop(0, accent);
    pointsGrad.addColorStop(1, "#6557F5");
    ctx.fillStyle = pointsGrad;
    roundedRect(ctx, 850, 365, 300, 62, 18);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "800 29px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("+" + Number(points || 0), 1000, 395);
    ctx.font = "700 12px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillText("PUNTOS", 1000, 412);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    // A small accent sparkle and footer label.
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.moveTo(1125, 100); ctx.lineTo(1132, 117); ctx.lineTo(1149, 124); ctx.lineTo(1132, 131); ctx.lineTo(1125, 148); ctx.lineTo(1118, 131); ctx.lineTo(1101, 124); ctx.lineTo(1118, 117); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#647096";
    ctx.font = "600 11px sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText("BRYVEX BOT", 965, 555);
    ctx.letterSpacing = "0px";

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
