const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags
} = require("discord.js");

const errReply =
require("../../Functions/interactionErrorReply");

const correReply =
require("../../Functions/interactionReply");

const ms =
require("ms");

const MODERATION_BANNER = "https://i.imgur.com/w7iUuCq.png";

function moderationPanel(title, text, color = 0x8A2BE2) {
    return new ContainerBuilder()
        .setAccentColor(color)
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(MODERATION_BANNER)
            )
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## " + title)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(text)
        );
}

function moderationReply(interaction, title, text, color = 0x8A2BE2) {
    return interaction.editReply({
        components: [moderationPanel(title, text, color)],
        flags: MessageFlags.IsComponentsV2
    });
}

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("moderation")

            .setDescription(
                "Sistema de moderación"
            )

            //////////////////////////////////////////////////
            // BAN
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("ban")

                    .setDescription(
                        "Banear usuario"
                    )

                    .addUserOption(option =>

                        option

                            .setName("usuario")

                            .setDescription(
                                "Usuario"
                            )

                            .setRequired(true)

                    )

                    .addStringOption(option =>

                        option

                            .setName("razon")

                            .setDescription(
                                "Razón"
                            )

                    )

            )

            //////////////////////////////////////////////////
            // UNBAN
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("unban")

                    .setDescription(
                        "Desbanear usuario"
                    )

                    .addStringOption(option =>

                        option

                            .setName("usuario")

                            .setDescription(
                                "ID usuario"
                            )

                            .setRequired(true)

                    )

            )

            //////////////////////////////////////////////////
            // KICK
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("kick")

                    .setDescription(
                        "Expulsar usuario"
                    )

                    .addUserOption(option =>

                        option

                            .setName("usuario")

                            .setDescription(
                                "Usuario"
                            )

                            .setRequired(true)

                    )

                    .addStringOption(option =>

                        option

                            .setName("razon")

                            .setDescription(
                                "Razón"
                            )

                    )

            )

            //////////////////////////////////////////////////
            // WARN
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("warn")

                    .setDescription(
                        "Advertir usuario"
                    )

                    .addUserOption(option =>

                        option

                            .setName("usuario")

                            .setDescription(
                                "Usuario"
                            )

                            .setRequired(true)

                    )

                    .addStringOption(option =>

                        option

                            .setName("razon")

                            .setDescription(
                                "Razón"
                            )

                    )

            )

            //////////////////////////////////////////////////
            // MUTE
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("mute")

                    .setDescription(
                        "Mutear usuario"
                    )

                    .addUserOption(option =>

                        option

                            .setName("user")

                            .setDescription(
                                "Usuario"
                            )

                            .setRequired(true)

                    )

                    .addStringOption(option =>

                        option

                            .setName("time")

                            .setDescription(
                                "Tiempo"
                            )

                            .setRequired(true)

                    )

                    .addStringOption(option =>

                        option

                            .setName("description")

                            .setDescription(
                                "Razón"
                            )

                    )

            )

            //////////////////////////////////////////////////
            // UNMUTE
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("unmute")

                    .setDescription(
                        "Desmutear usuario"
                    )

                    .addUserOption(option =>

                        option

                            .setName("user")

                            .setDescription(
                                "Usuario"
                            )

                            .setRequired(true)

                    )

            )

            //////////////////////////////////////////////////
            // PURGE
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("purge")

                    .setDescription(
                        "Eliminar mensajes"
                    )

                    .addIntegerOption(option =>

                        option

                            .setName("amount")

                            .setDescription(
                                "Cantidad"
                            )

                            .setMinValue(1)

                            .setMaxValue(100)

                    )

                    .addUserOption(option =>

                        option

                            .setName("user")

                            .setDescription(
                                "Usuario"
                            )

                    )

                    .addBooleanOption(option =>

                        option

                            .setName("bots")

                            .setDescription(
                                "Solo bots"
                            )

                    )

                    .addBooleanOption(option =>

                        option

                            .setName("all")

                            .setDescription(
                                "Eliminar todo"
                            )

                    )

            )

            //////////////////////////////////////////////////

            .setDefaultMemberPermissions(

                PermissionFlagsBits.ModerateMembers

            ),

    //////////////////////////////////////////////////
    // EXECUTE
    //////////////////////////////////////////////////

    async execute(interaction) {

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const subcommand =
        interaction.options.getSubcommand();

        //////////////////////////////////////////////////
        // BAN
        //////////////////////////////////////////////////

        if (subcommand === "ban") {

            const user = interaction.options.getMember("usuario");
            const reason = interaction.options.getString("razon") || "No especificada";

            if (!user) return moderationReply(interaction, "❌ Usuario inválido", "No pude encontrar a ese miembro en el servidor.", 0xFF0000);
            if (user.id === interaction.user.id) return moderationReply(interaction, "⚠️ Acción inválida", "No puedes banearte a ti mismo.", 0xFFD700);
            if (!user.bannable) return moderationReply(interaction, "⛔ No puedo banearlo", "Revisa la jerarquía de roles y los permisos del bot.", 0xFF0000);

            await user.ban({ reason });
            return moderationReply(interaction, "🔨 Usuario baneado", "**Usuario:** " + user + "\n**Moderador:** " + interaction.user + "\n**Razón:** " + reason, 0x8A2BE2);
        }

        //////////////////////////////////////////////////
        // UNBAN
        //////////////////////////////////////////////////

        if (subcommand === "unban") {
            const userId = interaction.options.getString("usuario").trim();
            if (!/^\\d{17,20}$/.test(userId)) return moderationReply(interaction, "❌ ID inválido", "Introduce un ID de usuario válido.", 0xFF0000);
            try {
                await interaction.guild.members.unban(userId);
                return moderationReply(interaction, "✅ Usuario desbaneado", "**ID:** " + userId + "\n**Moderador:** " + interaction.user, 0x00FF99);
            } catch {
                return moderationReply(interaction, "❌ No se pudo desbanear", "El usuario no está baneado o el bot no tiene permisos suficientes.", 0xFF0000);
            }
        }

        //////////////////////////////////////////////////
        // KICK
        //////////////////////////////////////////////////

        if (subcommand === "kick") {
            const user = interaction.options.getMember("usuario");
            const reason = interaction.options.getString("razon") || "No especificada";
            if (!user) return moderationReply(interaction, "❌ Usuario inválido", "No pude encontrar a ese miembro en el servidor.", 0xFF0000);
            if (user.id === interaction.user.id) return moderationReply(interaction, "⚠️ Acción inválida", "No puedes expulsarte a ti mismo.", 0xFFD700);
            if (!user.kickable) return moderationReply(interaction, "⛔ No puedo expulsarlo", "Revisa la jerarquía de roles y los permisos del bot.", 0xFF0000);
            await user.kick(reason);
            return moderationReply(interaction, "👢 Usuario expulsado", "**Usuario:** " + user + "\n**Moderador:** " + interaction.user + "\n**Razón:** " + reason, 0x8A2BE2);
        }

        //////////////////////////////////////////////////
        // WARN
        //////////////////////////////////////////////////

        if (subcommand === "warn") {
            const user = interaction.options.getUser("usuario");
            const reason = interaction.options.getString("razon") || "No especificada";
            if (user.id === interaction.user.id) return moderationReply(interaction, "⚠️ Acción inválida", "No puedes advertirte a ti mismo.", 0xFFD700);
            return moderationReply(interaction, "⚠️ Usuario advertido", "**Usuario:** " + user + "\n**Moderador:** " + interaction.user + "\n**Razón:** " + reason, 0xFFD700);
        }

        //////////////////////////////////////////////////
        // MUTE
        //////////////////////////////////////////////////

        if (subcommand === "mute") {
            const user = interaction.options.getMember("user");
            const rawTime = interaction.options.getString("time");
            const time = ms(rawTime);
            const reason = interaction.options.getString("description") || "No especificada";
            if (!user) return moderationReply(interaction, "❌ Usuario inválido", "No pude encontrar a ese miembro.", 0xFF0000);
            if (!time || time < 1000 || time > 2419200000) return moderationReply(interaction, "❌ Tiempo inválido", "Usa un tiempo válido entre **1 segundo y 28 días**. Ejemplo: `10m`, `2h`, `7d`.", 0xFF0000);
            if (user.id === interaction.user.id) return moderationReply(interaction, "⚠️ Acción inválida", "No puedes silenciarte a ti mismo.", 0xFFD700);
            if (!user.moderatable) return moderationReply(interaction, "⛔ No puedo silenciarlo", "Revisa la jerarquía de roles y los permisos del bot.", 0xFF0000);
            await user.timeout(time, reason);
            return moderationReply(interaction, "🔇 Usuario silenciado", "**Usuario:** " + user + "\n**Moderador:** " + interaction.user + "\n**Tiempo:** " + rawTime + "\n**Razón:** " + reason, 0x8A2BE2);
        }

        //////////////////////////////////////////////////
        // UNMUTE
        //////////////////////////////////////////////////

        if (subcommand === "unmute") {
            const user = interaction.options.getMember("user");
            if (!user) return moderationReply(interaction, "❌ Usuario inválido", "No pude encontrar a ese miembro.", 0xFF0000);
            if (!user.moderatable) return moderationReply(interaction, "⛔ No puedo modificarlo", "Revisa la jerarquía de roles y los permisos del bot.", 0xFF0000);
            await user.timeout(null);
            return moderationReply(interaction, "🔊 Usuario desmuteado", "**Usuario:** " + user + "\n**Moderador:** " + interaction.user, 0x00FF99);
        }

        //////////////////////////////////////////////////
        // PURGE
        //////////////////////////////////////////////////

        if (subcommand === "purge") {
            const amount = interaction.options.getInteger("amount");
            const user = interaction.options.getUser("user");
            const bots = interaction.options.getBoolean("bots");
            const deleteAll = interaction.options.getBoolean("all");

            if (!interaction.channel || !interaction.channel.isTextBased()) return moderationReply(interaction, "❌ Canal inválido", "Este comando necesita un canal de texto.", 0xFF0000);

            try {
                if (deleteAll) {
                    let deleted = 0;
                    while (true) {
                        const fetched = await interaction.channel.messages.fetch({ limit: 100 });
                        const recent = fetched.filter(msg => Date.now() - msg.createdTimestamp < 1209600000);
                        if (!recent.size) break;
                        const result = await interaction.channel.bulkDelete(recent, true).catch(error => {
                            if (error && error.code === 10008) return null;
                            throw error;
                        });
                        if (result) deleted += result.size;
                        if (fetched.size < 100 || !result || result.size === 0) break;
                    }
                    return moderationReply(interaction, "🧹 Limpieza completada", "**" + deleted + " mensajes** eliminados.", 0x00FF99);
                }

                const fetched = await interaction.channel.messages.fetch({ limit: amount || 100 });
                let filtered = fetched;
                if (user) filtered = filtered.filter(msg => msg.author.id === user.id);
                if (bots) filtered = filtered.filter(msg => msg.author.bot);
                filtered = filtered.filter(msg => Date.now() - msg.createdTimestamp < 1209600000);
                if (!filtered.size) return moderationReply(interaction, "🧹 Sin mensajes", "No encontré mensajes recientes que coincidan con los filtros.", 0xFFD700);
                const deleted = await interaction.channel.bulkDelete(filtered, true).catch(error => {
                    if (error && error.code === 10008) return null;
                    throw error;
                });
                if (!deleted) return moderationReply(interaction, "⚠️ Mensajes modificados", "Algunos mensajes desaparecieron durante la limpieza. Ejecuta el comando nuevamente para continuar.", 0xFFD700);
                return moderationReply(interaction, "🧹 Limpieza completada", "**" + deleted.size + " mensajes** eliminados.", 0x00FF99);
            } catch (error) {
                console.error("[Moderation Purge]", error);
                return moderationReply(interaction, "❌ Error al limpiar", "No se pudo completar la limpieza. Revisa los permisos del bot e inténtalo nuevamente.", 0xFF0000);
            }
        }
    }

};