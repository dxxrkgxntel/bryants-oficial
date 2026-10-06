const {

    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags

} = require("discord.js");

const WeeklyDrop =
require("../../Models/WeeklyDrop");

const Economy =
require("../../Models/EconomyUser");

const WEEKLYDROP_BANNER = "https://i.imgur.com/w7LzzI0.png";

function weeklyPanel(title, text, color = 0x8A2BE2) {
    return new ContainerBuilder()
        .setAccentColor(color)
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(WEEKLYDROP_BANNER)
            )
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("## " + title))
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

function weeklyPayload(title, text, color = 0x8A2BE2) {
    return {
        components: [weeklyPanel(title, text, color)],
        flags: MessageFlags.IsComponentsV2
    };
}

function weeklyReply(interaction, title, text, color = 0x8A2BE2) {
    return interaction.editReply(weeklyPayload(title, text, color));
}

module.exports = {

    data:
    new SlashCommandBuilder()

        .setName("weeklydrop")

        .setDescription(
            "Configura el sistema de drops semanales."
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        /*
        =========================
        SETUP
        =========================
        */

        .addSubcommand(sub =>
            sub

                .setName("setup")

                .setDescription(
                    "Configura el sistema."
                )

                .addChannelOption(option =>
                    option

                        .setName("canal")

                        .setDescription(
                            "Canal de logs."
                        )

                        .addChannelTypes(
                            ChannelType.GuildText
                        )

                        .setRequired(true)
                )

                .addIntegerOption(option =>
                    option

                        .setName("minimo")

                        .setDescription(
                            "Cantidad mínima."
                        )

                        .setRequired(true)
                        .setMinValue(1)
                )

                .addIntegerOption(option =>
                    option

                        .setName("maximo")

                        .setDescription(
                            "Cantidad máxima."
                        )

                        .setRequired(true)
                        .setMinValue(1)
                )
        )

        /*
        =========================
        ENABLE
        =========================
        */

        .addSubcommand(sub =>
            sub

                .setName("enable")

                .setDescription(
                    "Activa el sistema."
                )
        )

        /*
        =========================
        DISABLE
        =========================
        */

        .addSubcommand(sub =>
            sub

                .setName("disable")

                .setDescription(
                    "Desactiva el sistema."
                )
        )

        /*
        =========================
        INFO
        =========================
        */

        .addSubcommand(sub =>
            sub

                .setName("info")

                .setDescription(
                    "Muestra información del sistema."
                )
        )

        /*
        =========================
        FORCE
        =========================
        */

        .addSubcommand(sub =>
            sub

                .setName("force")

                .setDescription(
                    "Fuerza un drop semanal."
                )
        ),

    async execute(interaction) {

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const sub =
        interaction.options.getSubcommand();

        let data =
        await WeeklyDrop.findOne({

            guildId:
            interaction.guild.id

        });

        if (!data) {

            data =
            await WeeklyDrop.create({

                guildId:
                interaction.guild.id

            });

        }

        /*
        =========================
        SETUP
        =========================
        */

        if (sub === "setup") {
            const channel = interaction.options.getChannel("canal");
            const minimo = interaction.options.getInteger("minimo");
            const maximo = interaction.options.getInteger("maximo");

            if (minimo >= maximo) return weeklyReply(interaction, "⚠️ Configuración inválida", "El mínimo debe ser menor que el máximo.", 0xFFD700);

            data.logChannelId = channel.id;
            data.minAmount = minimo;
            data.maxAmount = maximo;
            data.nextDrop = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await data.save();

            return weeklyReply(
                interaction,
                "🪙 WeeklyDrop configurado",
                "**Canal de logs:** " + channel + "\n**Mínimo:** " + minimo.toLocaleString() + "\n**Máximo:** " + maximo.toLocaleString() + "\n**Primer drop:** <t:" + Math.floor(data.nextDrop.getTime() / 1000) + ":R>",
                0x00FF99
            );
        }

        /*
        =========================
        ENABLE
        =========================
        */

        if (sub === "enable") {
            if (data.enabled) return weeklyReply(interaction, "🪙 WeeklyDrop", "El sistema ya está activado.", 0xFFD700);
            data.enabled = true;
            if (!data.nextDrop) data.nextDrop = new Date(Date.now() + 604800000);
            await data.save();
            return weeklyReply(interaction, "✅ WeeklyDrop activado", "El sistema quedó activado.\n**Próximo drop:** <t:" + Math.floor(data.nextDrop.getTime() / 1000) + ":R>", 0x00FF99);
        }

        /*
        =========================
        DISABLE
        =========================
        */

        if (sub === "disable") {
            if (!data.enabled) return weeklyReply(interaction, "🪙 WeeklyDrop", "El sistema ya está desactivado.", 0xFFD700);
            data.enabled = false;
            await data.save();
            return weeklyReply(interaction, "⛔ WeeklyDrop desactivado", "El sistema de recompensas semanales quedó desactivado.", 0xFF5555);
        }

        /*
        =========================
        INFO
        =========================
        */

        if (sub === "info") {
            const channel = data.logChannelId ? interaction.guild.channels.cache.get(data.logChannelId) : null;
            let text = "**Estado:** " + (data.enabled ? "✅ Activado" : "❌ Desactivado");
            text += "\n**Mínimo:** " + Number(data.minAmount || 0).toLocaleString();
            text += "\n**Máximo:** " + Number(data.maxAmount || 0).toLocaleString();
            text += "\n**Canal de logs:** " + (channel ? channel.toString() : data.logChannelId ? "⚠️ Canal eliminado" : "No configurado");
            text += "\n**Último drop:** " + (data.lastDrop ? "<t:" + Math.floor(data.lastDrop.getTime() / 1000) + ":R>" : "Nunca");
            text += "\n**Próximo drop:** " + (data.nextDrop ? "<t:" + Math.floor(data.nextDrop.getTime() / 1000) + ":R>" : "No definido");
            return weeklyReply(interaction, "🪙 Información WeeklyDrop", text, 0x8A2BE2);
        }

        /*
        =========================
        FORCE
        =========================
        */

        if (sub === "force") {
            if (!data.enabled) return weeklyReply(interaction, "⛔ WeeklyDrop desactivado", "Activa el sistema antes de ejecutar un drop.", 0xFF5555);
            if (!Number.isFinite(data.minAmount) || !Number.isFinite(data.maxAmount) || data.minAmount < 1 || data.minAmount >= data.maxAmount) {
                return weeklyReply(interaction, "⚠️ Configuración inválida", "Ejecuta `/weeklydrop setup` antes de forzar un drop.", 0xFFD700);
            }
            await weeklyReply(interaction, "🪙 WeeklyDrop", "Ejecutando drop semanal...", 0x8A2BE2);
            try {
                const members = await interaction.guild.members.fetch();
                const humans = [...members.values()].filter(member => !member.user.bot);
                let totalDistributed = 0;
                const operations = humans.map(member => {
                    const amount = Math.floor(Math.random() * (data.maxAmount - data.minAmount + 1)) + data.minAmount;
                    totalDistributed += amount;
                    return {
                        updateOne: {
                            filter: { guildId: interaction.guild.id, userId: member.id },
                            update: { $inc: { wallet: amount }, $setOnInsert: { guildId: interaction.guild.id, userId: member.id } },
                            upsert: true
                        }
                    };
                });
                if (operations.length) await Economy.bulkWrite(operations, { ordered: false });
                data.lastDrop = new Date();
                data.nextDrop = new Date(Date.now() + 604800000);
                await data.save();
                const summary = "**Usuarios recompensados:** " + humans.length + "\n**Total distribuido:** " + totalDistributed.toLocaleString() + " coins\n**Rango:** " + data.minAmount.toLocaleString() + " - " + data.maxAmount.toLocaleString() + "\n**Próximo drop:** <t:" + Math.floor(data.nextDrop.getTime() / 1000) + ":R>";
                if (data.logChannelId) {
                    const channel = interaction.guild.channels.cache.get(data.logChannelId);
                    if (channel && channel.isTextBased()) {
                        await channel.send(weeklyPayload("🪙 Drop semanal ejecutado", summary, 0xFFD700)).catch(error => console.error("[WeeklyDrop Log]", error));
                    }
                }
                return weeklyReply(interaction, "✅ Drop semanal completado", summary, 0x00FF99);
            } catch (error) {
                console.error("[WeeklyDrop Force]", error);
                return weeklyReply(interaction, "❌ Error en WeeklyDrop", "No se pudo completar el drop. No se actualizará la fecha hasta que la operación termine correctamente.", 0xFF0000);
            }
        }
    }

};