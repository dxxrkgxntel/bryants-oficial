const { MessageFlags, PermissionFlagsBits } = require("discord.js");

const DEFAULT_ACCENT_COLOR = 0x8A2BE2;

function separator() {
    return { type: 14, divider: true, spacing: 1 };
}

function textDisplay(content) {
    return { type: 10, content };
}

function isHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

module.exports = {
    async execute(interaction) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "❌ Solo administradores pueden usar este comando.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const { options } = interaction;
        const colorInput = options.getString("color")?.trim();
        const title = options.getString("title")?.trim();
        const titleURL = options.getString("url")?.trim();
        const author = options.getString("author")?.trim();
        const description = options.getString("description")
            ?.replace(/\\n|\/n/gi, "\n")
            ?.replace(/```/g, "'''")
            ?.trim();
        const thumbnail = options.getAttachment("thumbnail");
        const image = options.getAttachment("image");
        const timestamp = options.getString("timestamp");
        const footer = options.getString("footer")?.trim();

        if (!title && !description && !thumbnail && !image && !footer && !author) {
            return interaction.editReply("❌ Debes agregar contenido al Components V2.");
        }

        if (title && title.length > 256) {
            return interaction.editReply("❌ El título no puede superar 256 caracteres.");
        }

        if (description && description.length > 4000) {
            return interaction.editReply("❌ La descripción no puede superar 4000 caracteres en Components V2.");
        }

        if (footer && footer.length > 2048) {
            return interaction.editReply("❌ El footer no puede superar 2048 caracteres.");
        }

        if (author && author.length > 256) {
            return interaction.editReply("❌ El autor no puede superar 256 caracteres.");
        }

        if (colorInput && !/^#?[\da-f]{6}$/i.test(colorInput)) {
            return interaction.editReply("❌ El color debe ser hexadecimal de 6 caracteres, por ejemplo `#FF0000`.");
        }

        if (titleURL && !isHttpUrl(titleURL)) {
            return interaction.editReply("❌ La URL del título debe comenzar con `http://` o `https://`.");
        }

        const accentColor = colorInput
            ? Number.parseInt(colorInput.replace(/^#/, ""), 16)
            : DEFAULT_ACCENT_COLOR;
        const contentComponents = [];
        const headerComponents = [];

        if (image) {
            contentComponents.push({ type: 12, items: [{ media: { url: image.url } }] });
        }

        if (author) headerComponents.push(textDisplay(`**${author}**`));
        if (title) {
            const titleContent = titleURL ? `[${title}](${titleURL})` : title;
            headerComponents.push(textDisplay(`## ${titleContent}`));
        }

        if (headerComponents.length && contentComponents.length) {
            contentComponents.push(separator());
        }

        if (thumbnail && headerComponents.length) {
            contentComponents.push({
                type: 9,
                components: headerComponents,
                accessory: { type: 11, media: { url: thumbnail.url } }
            });
        } else {
            contentComponents.push(...headerComponents);
        }

        if (description) {
            if (contentComponents.length) contentComponents.push(separator());
            if (thumbnail && !headerComponents.length) {
                contentComponents.push({
                    type: 9,
                    components: [textDisplay(description)],
                    accessory: { type: 11, media: { url: thumbnail.url } }
                });
            } else {
                contentComponents.push(textDisplay(description));
            }
        } else if (thumbnail && !headerComponents.length) {
            if (contentComponents.length) contentComponents.push(separator());
            contentComponents.push({ type: 12, items: [{ media: { url: thumbnail.url } }] });
        }

        if (footer || timestamp === "si") {
            if (contentComponents.length) contentComponents.push(separator());
            const footerLines = [];
            if (footer) footerLines.push(footer);
            if (timestamp === "si") footerLines.push(`<t:${Math.floor(Date.now() / 1000)}:F>`);
            contentComponents.push(textDisplay(footerLines.join("\n")));
        }

        if (contentComponents.length === 0) {
            return interaction.editReply("❌ No hay contenido que se pueda mostrar.");
        }

        const botMember = interaction.guild?.members?.me;
        if (!botMember || !interaction.channel?.permissionsFor(botMember)?.has(PermissionFlagsBits.SendMessages)) {
            return interaction.editReply("❌ No tengo permisos para enviar mensajes aquí.");
        }

        try {
            await interaction.channel.send({
                flags: MessageFlags.IsComponentsV2,
                components: [{
                    type: 17,
                    accent_color: accentColor,
                    components: contentComponents
                }],
                allowedMentions: { parse: [] }
            });

            return interaction.editReply("✅ Se envió correctamente el mensaje Components V2.");
        } catch (error) {
            console.error("Error al enviar el Components V2 de /public embed:", error);
            return interaction.editReply("❌ Ocurrió un error al enviar el Components V2.");
        }
    }
};
