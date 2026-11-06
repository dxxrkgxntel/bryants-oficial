const fs = require("node:fs");
const card = fs.readFileSync(require("node:path").join(__dirname, "../Functions/trophyCard.js"), "utf8");
const checks = [
    ["normaliza variantes tipográficas Unicode", card.includes('.normalize("NFKC")')],
    ["limpia caracteres invisibles de formato", card.includes("\\u200B") && card.includes("\\uFEFF")],
    ["registra la fuente Sora incluida en el repositorio", card.includes('Assets/Fonts/Sora-Bold.ttf') && card.includes("GlobalFonts.registerFromPath")],
    ["mantiene fuentes de respaldo del sistema", card.includes('"Noto Sans"') && card.includes('"DejaVu Sans"') && card.includes("sans-serif")],
    ["aplica la fuente compatible al título del logro y al nombre", card.includes("fitText(ctx, name, 640, 54, 800)") && card.includes('ctx.font = "700 23px " + CARD_FONT')],
    ["traduce el encabezado de la tarjeta al español", card.includes("BRYVEX  /  LOGRO DESBLOQUEADO") && !card.includes("ACHIEVEMENT UNLOCKED")]
];
const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log((ok ? "PASS " : "FAIL ") + label);
if (failed.length) process.exitCode = 1;
