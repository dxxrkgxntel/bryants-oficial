const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require("discord.js");
const math = require("mathjs");
const ms = require("ms");
const translate = require("translate-google");
const ISO6391 = require("iso-639-1");
const kissData = require("../../Models/kissSchema");

const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const responses8ball = ["Sí","No","Tal vez","No estoy seguro","Es posible","Probablemente no","Absolutamente","Definitivamente no","Espera y verás","No cuentes con ello","Muy probable","Poco probable","No tengo idea","Sí, definitivamente","No, de ninguna manera","Es complicado","Podría ser","No lo sé","No estoy convencido","Por supuesto","Por ningún motivo","Sin duda","Ni en un millón de años","Claro que sí","No puedo predecir eso","Lo dudo mucho","Espero que sí","Mejor pregúntame más tarde","Mejor no te digo","No me hagas decidir","Estoy indeciso"];
const jokes = ["¿Por qué la gallina cruzó la carretera? Para llegar al otro lado.","¿Por qué los pingüinos no pueden volar? Porque no tienen suficiente dinero para comprar un boleto de avión.","¿Por qué los gatos odian el agua? Porque no pueden atrapar peces mientras están mojados.","¿Por qué los programadores prefieren el café frío? Porque no les gusta el Java caliente.","¿Por qué los músicos tienen problemas para abrir su coche? Porque siempre pierden las llaves del 'do-re-mi'.","¿Por qué los leones siempre pierden en el póquer? Porque siempre les sacan las garras.","¿Por qué los astronautas son tan buenos contando chistes? Porque tienen un gran sentido del humor universal.","¿Por qué los perros no pueden bailar? Porque tienen dos patas izquierdas.","¿Por qué el mar es azul? Porque los peces no saben cantar.","¿Por qué las abejas hacen zumbido? Porque no saben cantar.","¿Por qué las ardillas son tan buenas para guardar nueces? Porque tienen bóvedas de seguridad en sus árboles.","¿Por qué los científicos nunca se aburren? Porque siempre tienen soluciones.","¿Por qué los elefantes nunca olvidan? Porque tienen buena memoria.","¿Por qué los fontaneros siempre están en forma? Porque siempre están en el trabajo de tuberías.","¿Por qué los koalas son tan buenos escalando árboles? Porque tienen garras afiladas.","¿Por qué los actores son tan buenos en juegos de palabras? Porque siempre están en busca de su línea.","¿Por qué los caracoles siempre ganan en carreras? Porque llevan su propia casa en la espalda.","¿Por qué los gusanos son tan buenos en ajedrez? Porque saben cómo moverse en el tablero.","¿Por qué los magos siempre son tan buenos en adivinar cosas? Porque tienen una bola de cristal.","¿Por qué los peluqueros son tan buenos en juegos de palabras? Porque siempre están en busca de un buen corte.","¿Por qué los tomates se sonrojan? Porque ven la ensalada desnuda."];
const kissLinks = ["https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif","https://media.giphy.com/media/MQVpBqASxSlFu/giphy.gif","https://media.giphy.com/media/WynnqxhdFEPYY/giphy.gif","https://media.giphy.com/media/11rWoZNpAKw8w/giphy.gif","https://media.giphy.com/media/wOtkVwroA6yzK/giphy.gif"];

async function run8ball(interaction) {
    const question = interaction.options.getString("pregunta");
    const answer = responses8ball[Math.floor(Math.random() * responses8ball.length)];

    return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [{
            type: 17,
            accent_color: 0x8A2BE2,
            components: [
                { type: 12, items: [{ media: { url: "https://i.imgur.com/t5JfY5Z.png" } }] },
                { type: 10, content: "## 🎱 BF 8Ball\n### ❓ Pregunta\n" + question },
                { type: 14, divider: true, spacing: 1 },
                { type: 10, content: "### 🔮 Respuesta\n**" + answer + "**\n\n👤 Preguntado por <@" + interaction.user.id + ">" }
            ]
        }]
    });
}

async function runBanana(interaction) {
    const user = interaction.options.getUser("usuario") || interaction.user;
    const banana = Math.floor(Math.random() * 22);

    return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [{
            type: 17,
            accent_color: 0x8A2BE2,
            components: [
                { type: 12, items: [{ media: { url: "https://i.imgur.com/t5JfY5Z.png" } }] },
                { type: 10, content: "## 🍌 BF Banana\n### 📏 Medición aleatoria\n\n👤 Usuario: <@" + user.id + ">\n🍌 Tamaño: **" + banana + " cm**" },
                { type: 14, divider: true, spacing: 1 },
                { type: 10, content: "🎲 **Resultado generado al azar por BF Activity**\n👤 Solicitado por <@" + interaction.user.id + ">" }
            ]
        }]
    });
}

async function runGay(interaction) {
    const user = interaction.options.getUser("usuario") || interaction.user;
    const pct = (Math.floor(Math.random() * 20) + 1) * 5;

    return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [{
            type: 17,
            accent_color: 0x8A2BE2,
            components: [
                { type: 12, items: [{ media: { url: "https://i.imgur.com/t5JfY5Z.png" } }] },
                { type: 10, content: "## 🏳️‍🌈 BF Gay Meter\n### 🎯 Porcentaje aleatorio\n\n👤 Usuario: <@" + user.id + ">\n🌈 Resultado: **" + pct + "% gay**" },
                { type: 14, divider: true, spacing: 1 },
                { type: 10, content: "🎲 **Resultado generado al azar por BF Activity**\n👤 Solicitado por <@" + interaction.user.id + ">" }
            ]
        }]
    });
}

async function runJoke(interaction) {
    const joke = jokes[Math.floor(Math.random() * jokes.length)];

    return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [{
            type: 17,
            accent_color: 0x8A2BE2,
            components: [
                { type: 12, items: [{ media: { url: "https://i.imgur.com/t5JfY5Z.png" } }] },
                { type: 10, content: "## 😂 BF Joke\n### 🎤 Chiste aleatorio\n\n" + joke },
                { type: 14, divider: true, spacing: 1 },
                { type: 10, content: "🎲 **Chiste seleccionado al azar por BF Activity**\n👤 Solicitado por <@" + interaction.user.id + ">" }
            ]
        }]
    });
}

async function runKiss(interaction) {
    const user = interaction.options.getUser("usuario");

    if (user.id === interaction.user.id) {
        return interaction.reply({
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            components: [{
                type: 17,
                accent_color: 0xED4245,
                components: [
                    { type: 12, items: [{ media: { url: "https://i.imgur.com/t5JfY5Z.png" } }] },
                    { type: 10, content: "## 💋 BF Kiss\n❌ No puedes besarte a ti mismo." }
                ]
            }]
        });
    }

    if (user.bot) {
        return interaction.reply({
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            components: [{
                type: 17,
                accent_color: 0xED4245,
                components: [
                    { type: 12, items: [{ media: { url: "https://i.imgur.com/t5JfY5Z.png" } }] },
                    { type: 10, content: "## 💋 BF Kiss\n🤖 Los bots no participan en el contador de besos." }
                ]
            }]
        });
    }

    await interaction.deferReply();

    let data = await kissData.findOne({
        guildId: interaction.guild.id,
        userId: user.id
    });

    if (!data) {
        data = new kissData({
            guildId: interaction.guild.id,
            userId: user.id,
            kissCount: 0
        });
    }

    data.kissCount += 1;
    await data.save();

    const gif = kissLinks[Math.floor(Math.random() * kissLinks.length)];

    return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [{
            type: 17,
            accent_color: 0x8A2BE2,
            components: [
                { type: 12, items: [{ media: { url: "https://i.imgur.com/t5JfY5Z.png" } }] },
                { type: 10, content: "## 💋 BF Kiss\n### ❤️ ¡Nuevo beso!\n\n<@" + interaction.user.id + "> acaba de besar a <@" + user.id + ">." },
                { type: 12, items: [{ media: { url: gif } }] },
                { type: 14, divider: true, spacing: 1 },
                { type: 10, content: "💞 <@" + user.id + "> ha recibido **" + data.kissCount.toLocaleString() + " beso" + (data.kissCount === 1 ? "" : "s") + "** en total." }
            ]
        }]
    });
}

async function runPpt(interaction) {
    const choices = ["piedra", "papel", "tijeras"];
    const bot = choices[Math.floor(Math.random() * choices.length)];
    const emojis = { piedra: "✊", papel: "✋", tijeras: "✌️" };

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("activity_ppt_piedra").setLabel("Piedra").setEmoji("✊").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("activity_ppt_papel").setLabel("Papel").setEmoji("✋").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("activity_ppt_tijeras").setLabel("Tijeras").setEmoji("✌️").setStyle(ButtonStyle.Secondary)
    );

    const response = await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        withResponse: true,
        components: [{
            type: 17,
            accent_color: 0x8A2BE2,
            components: [
                { type: 12, items: [{ media: { url: "https://i.imgur.com/t5JfY5Z.png" } }] },
                { type: 10, content: "## ✊ BF Piedra, Papel o Tijeras\n### 🎮 Elige tu jugada\n\n<@" + interaction.user.id + ">, tienes **10 segundos** para elegir." },
                { type: 14, divider: true, spacing: 1 },
                row.toJSON()
            ]
        }]
    });

    const msg = response.resource?.message || await interaction.fetchReply();
    const col = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: ms("10s"),
        filter: i => i.user.id === interaction.user.id && i.customId.startsWith("activity_ppt_")
    });

    col.on("collect", async i => {
        await i.deferUpdate();
        col.stop("played");

        const pick = i.customId.split("_")[2];
        let result = "🤝 **Empate**";
        let accent = 0xFEE75C;

        if (
            (pick === "piedra" && bot === "tijeras") ||
            (pick === "papel" && bot === "piedra") ||
            (pick === "tijeras" && bot === "papel")
        ) {
            result = "🎉 **¡Has ganado!**";
            accent = 0x57F287;
        } else if (pick !== bot) {
            result = "💥 **Has perdido.**";
            accent = 0xED4245;
        }

        await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [{
                type: 17,
                accent_color: accent,
                components: [
                    { type: 12, items: [{ media: { url: "https://i.imgur.com/t5JfY5Z.png" } }] },
                    { type: 10, content: "## ✊ Resultado — BF PPT\n" + result },
                    { type: 14, divider: true, spacing: 1 },
                    { type: 10, content: "### 👤 Tu jugada\n" + emojis[pick] + " **" + pick.toUpperCase() + "**\n\n### 🤖 BF Activity\n" + emojis[bot] + " **" + bot.toUpperCase() + "**" }
                ]
            }]
        });
    });

    col.on("end", async (_, reason) => {
        if (reason === "played") return;
        await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [{
                type: 17,
                accent_color: 0x8A2BE2,
                components: [
                    { type: 12, items: [{ media: { url: "https://i.imgur.com/t5JfY5Z.png" } }] },
                    { type: 10, content: "## ✊ BF Piedra, Papel o Tijeras\n⌛ **Se acabó el tiempo.** No elegiste ninguna jugada." }
                ]
            }]
        }).catch(() => {});
    });
}

async function runCalculator(interaction) {
    const prefix = "activity_calc";
    const mk = (label, id, style = ButtonStyle.Secondary) =>
        new ButtonBuilder().setLabel(label).setCustomId(prefix + "_" + id).setStyle(style);

    const rows = [
        new ActionRowBuilder().addComponents(mk("Limpiar","clear",ButtonStyle.Danger),mk("(","("),mk(")",")"),mk("⌫","backspace")),
        new ActionRowBuilder().addComponents(mk("1","1"),mk("2","2"),mk("3","3"),mk("÷","/")),
        new ActionRowBuilder().addComponents(mk("4","4"),mk("5","5"),mk("6","6"),mk("×","*")),
        new ActionRowBuilder().addComponents(mk("7","7"),mk("8","8"),mk("9","9"),mk("−","-")),
        new ActionRowBuilder().addComponents(mk("0","0"),mk(".","."),mk("=","=",ButtonStyle.Success),mk("+","+"))
    ];

    const calculatorPanel = (display, status = "Introduce una operación usando los botones.") => ({
        flags: MessageFlags.IsComponentsV2,
        components: [{
            type: 17,
            accent_color: 0x8A2BE2,
            components: [
                { type: 12, items: [{ media: { url: "https://i.imgur.com/t5JfY5Z.png" } }] },
                { type: 10, content: "## 🧮 BF Calculator\n### 🖥️ Pantalla\n```\n" + (display || "0") + "\n```\n" + status },
                { type: 14, divider: true, spacing: 1 },
                ...rows.map(row => row.toJSON())
            ]
        }]
    });

    const response = await interaction.reply({ ...calculatorPanel("0"), withResponse: true });
    const msg = response.resource?.message || await interaction.fetchReply();
    let data = "";

    const col = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.user.id === interaction.user.id && i.customId.startsWith(prefix + "_"),
        time: 600000
    });

    col.on("collect", async i => {
        await i.deferUpdate();
        const value = i.customId.slice((prefix + "_").length);
        let status = "Introduce una operación usando los botones.";

        if (value === "=") {
            if (!data.trim()) {
                status = "⚠️ Introduce una operación antes de calcular.";
            } else {
                try {
                    const clean = data.replace(/[^0-9+*/(). -]/g, "");
                    const result = math.evaluate(clean);
                    if (typeof result !== "number" || !Number.isFinite(result)) throw new Error("Resultado inválido");
                    data = String(result);
                    status = "✅ Resultado calculado.";
                } catch {
                    status = "❌ Operación inválida.";
                }
            }
        } else if (value === "clear") {
            data = "";
            status = "🧹 Pantalla limpiada.";
        } else if (value === "backspace") {
            data = data.slice(0, -1);
        } else {
            if (data.length >= 100) {
                status = "⚠️ Has alcanzado el límite de 100 caracteres.";
            } else {
                data += value;
            }
        }

        await interaction.editReply(calculatorPanel(data || "0", status));
    });

    col.on("end", async () => {
        await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [{
                type: 17,
                accent_color: 0x8A2BE2,
                components: [
                    { type: 12, items: [{ media: { url: "https://i.imgur.com/t5JfY5Z.png" } }] },
                    { type: 10, content: "## 🧮 BF Calculator\n### 🖥️ Pantalla\n```\n" + (data || "0") + "\n```\n⌛ **La calculadora se cerró por inactividad.**" }
                ]
            }]
        }).catch(() => {});
    });
}

async function runShitpost(interaction) {
    await interaction.deferReply();

    const panel = (text, imageUrl = null, accent = 0x8A2BE2) => {
        const components = [
            { type: 12, items: [{ media: { url: "https://i.imgur.com/t5JfY5Z.png" } }] },
            { type: 10, content: text }
        ];
        if (imageUrl) {
            components.push(
                { type: 14, divider: true, spacing: 1 },
                { type: 12, items: [{ media: { url: imageUrl } }] }
            );
        }
        return {
            flags: MessageFlags.IsComponentsV2,
            components: [{ type: 17, accent_color: accent, components }]
        };
    };

    try {
        const response = await fetch("https://www.reddit.com/r/ShitpostESP/random/.json", {
            headers: { "User-Agent": "BryantsOficialBot/1.0" }
        });

        if (!response.ok) {
            return interaction.editReply(panel(
                "## 😂 BF Shitpost\n❌ Reddit no respondió correctamente. Inténtalo nuevamente.",
                null,
                0xED4245
            ));
        }

        const data = await response.json();
        const post = data?.[0]?.data?.children?.[0]?.data;

        if (!post) {
            return interaction.editReply(panel(
                "## 😂 BF Shitpost\n❌ No pude obtener un shitpost en este momento.",
                null,
                0xED4245
            ));
        }

        const imageUrl = post.url_overridden_by_dest || post.url;
        const validImage = typeof imageUrl === "string" &&
            /\.(?:png|jpe?g|gif|webp)(?:\?.*)?$/i.test(imageUrl);

        if (!validImage) {
            return interaction.editReply(panel(
                "## 😂 BF Shitpost\n⚠️ El shitpost aleatorio no contenía una imagen compatible. Ejecuta el comando otra vez."
            ));
        }

        const title = post.title ? String(post.title).slice(0, 500) : "Shitpost aleatorio";

        return interaction.editReply(panel(
            "## 😂 BF Shitpost\n### " + title + "\n\n👍 **" + (post.ups || 0).toLocaleString() + "** votos · 💬 **" + (post.num_comments || 0).toLocaleString() + "** comentarios\n👤 Solicitado por <@" + interaction.user.id + ">",
            imageUrl
        ));
    } catch (error) {
        console.error("Error en /activity shitpost:", error);
        return interaction.editReply(panel(
            "## 😂 BF Shitpost\n❌ Ocurrió un error al obtener contenido de Reddit.",
            null,
            0xED4245
        ));
    }
}

async function runTranslate(interaction) {
    await interaction.deferReply();

    const input = interaction.options.getString("texto").trim();
    const languageInput = interaction.options.getString("idioma").trim().toLowerCase();

    const panel = (body, accent = 0x8A2BE2) => ({
        flags: MessageFlags.IsComponentsV2,
        components: [{
            type: 17,
            accent_color: accent,
            components: [
                { type: 12, items: [{ media: { url: "https://i.imgur.com/t5JfY5Z.png" } }] },
                { type: 10, content: body }
            ]
        }]
    });

    if (!input) {
        return interaction.editReply(panel(
            "## 🌐 BF Translate\n❌ Debes escribir un texto para traducir.",
            0xED4245
        ));
    }

    if (!ISO6391.validate(languageInput)) {
        return interaction.editReply(panel(
            "## 🌐 BF Translate\n❌ **Código de idioma inválido:** `" + languageInput + "`\n\nUsa un código ISO 639-1, por ejemplo: `es`, `en`, `fr`, `pt`, `de` o `it`.",
            0xED4245
        ));
    }

    try {
        const result = await translate(input, { to: languageInput });
        const languageName = ISO6391.getName(languageInput) || languageInput.toUpperCase();
        const original = input.length > 1500 ? input.slice(0, 1497) + "..." : input;
        const translatedRaw = String(result);
        const translated = translatedRaw.length > 1500 ? translatedRaw.slice(0, 1497) + "..." : translatedRaw;

        return interaction.editReply(panel(
            "## 🌐 BF Translate\n### 🎯 Idioma de destino\n**" + languageName + "** (`" + languageInput + "`)\n\n### 📝 Texto original\n>>> " + original + "\n\n### 🌍 Traducción\n>>> " + translated + "\n\n👤 Solicitado por <@" + interaction.user.id + ">"
        ));
    } catch (error) {
        console.error("Error en /activity translate:", error);
        return interaction.editReply(panel(
            "## 🌐 BF Translate\n❌ No pude traducir el texto en este momento. Comprueba el idioma e inténtalo nuevamente.",
            0xED4245
        ));
    }
}

module.exports={
    data:new SlashCommandBuilder().setName("activity").setDescription("Actividades y comandos de entretenimiento")
        .addSubcommand(s=>s.setName("8ball").setDescription("Haz una pregunta a la bola 8").addStringOption(o=>o.setName("pregunta").setDescription("Pregunta").setRequired(true)))
        .addSubcommand(s=>s.setName("banana").setDescription("Mide tu banana o la de otro usuario").addUserOption(o=>o.setName("usuario").setDescription("Usuario").setRequired(false)))
        .addSubcommand(s=>s.setName("calculator").setDescription("Calculadora interactiva"))
        .addSubcommand(s=>s.setName("gay").setDescription("Genera un porcentaje aleatorio").addUserOption(o=>o.setName("usuario").setDescription("Usuario").setRequired(false)))
        .addSubcommand(s=>s.setName("joke").setDescription("Cuenta un chiste aleatorio"))
        .addSubcommand(s=>s.setName("kiss").setDescription("Besa a un usuario").addUserOption(o=>o.setName("usuario").setDescription("Usuario").setRequired(true)))
        .addSubcommand(s=>s.setName("ppt").setDescription("Juega piedra, papel o tijeras"))
        .addSubcommand(s=>s.setName("shitpost").setDescription("Obtén un shitpost aleatorio"))
        .addSubcommand(s=>s.setName("translate").setDescription("Traduce un texto").addStringOption(o=>o.setName("texto").setDescription("Texto a traducir").setRequired(true)).addStringOption(o=>o.setName("idioma").setDescription("Código del idioma destino, ej. es, en, fr").setRequired(true))),
    async execute(interaction){
        const sub=interaction.options.getSubcommand();
        const handlers={"8ball":run8ball,banana:runBanana,calculator:runCalculator,gay:runGay,joke:runJoke,kiss:runKiss,ppt:runPpt,shitpost:runShitpost,translate:runTranslate};
        return handlers[sub](interaction);
    }
};
