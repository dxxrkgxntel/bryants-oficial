const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require("discord.js");
const Giveaway = require("../../Models/Giveaway");
const GiveawayConfig = require("../../Models/GiveawayConfig");
const { buildGiveawayMessage } = require("../../Functions/giveawayMessage");
const { finishGiveaway, editGiveawayMessage } = require("../../Functions/giveawayDraw");

async function getChannel(guild, channelId) {
    return guild.channels.cache.get(channelId) || guild.channels.fetch(channelId).catch(() => null);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("giveaway")
        .setDescription("Gestiona sorteos de Bryvex Bot")
        .addSubcommand(sub => sub.setName("setup").setDescription("Configura el canal de sorteos")
            .addChannelOption(option => option.setName("channel").setDescription("Canal donde se publicarán los sorteos").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true)))
        .addSubcommand(sub => sub.setName("create").setDescription("Crea un sorteo")
            .addStringOption(option => option.setName("prize").setDescription("Premio del sorteo").setMaxLength(200).setRequired(true))
            .addIntegerOption(option => option.setName("duration").setDescription("Duración en minutos (máximo 30 días)").setMinValue(1).setMaxValue(43200).setRequired(true))
            .addIntegerOption(option => option.setName("winners").setDescription("Cantidad de ganadores").setMinValue(1).setMaxValue(20).setRequired(true))
            .addStringOption(option => option.setName("description").setDescription("Detalles adicionales").setMaxLength(1000)))
        .addSubcommand(sub => sub.setName("end").setDescription("Finaliza un sorteo y elige ganadores")
            .addStringOption(option => option.setName("id").setDescription("ID del sorteo").setRequired(true)))
        .addSubcommand(sub => sub.setName("reroll").setDescription("Vuelve a sortear ganadores excluyendo los anteriores")
            .addStringOption(option => option.setName("id").setDescription("ID del sorteo").setRequired(true)))
        .addSubcommand(sub => sub.setName("list").setDescription("Consulta los sorteos activos")),
    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const canManage = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) || interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages);
        if (sub !== "list" && !canManage) return interaction.reply({ content: "Necesitas permiso para gestionar el servidor o administrar mensajes.", flags: MessageFlags.Ephemeral });

        if (sub === "setup") {
            const channel = interaction.options.getChannel("channel");
            const permissions = channel.permissionsFor(interaction.guild.members.me);
            if (!permissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
                return interaction.reply({ content: "No tengo permisos para publicar embeds en ese canal.", flags: MessageFlags.Ephemeral });
            }
            await GiveawayConfig.findOneAndUpdate({ guildId: interaction.guildId }, { $set: { channelId: channel.id, configuredAt: new Date() } }, { upsert: true, new: true, setDefaultsOnInsert: true });
            return interaction.reply({ content: `Canal de giveaways configurado: ${channel}.`, flags: MessageFlags.Ephemeral });
        }

        if (sub === "create") {
            const config = await GiveawayConfig.findOne({ guildId: interaction.guildId }).lean();
            if (!config?.channelId) return interaction.reply({ content: "Primero configura el canal con `/giveaway setup`.", flags: MessageFlags.Ephemeral });
            const channel = await getChannel(interaction.guild, config.channelId);
            if (!channel?.isTextBased()) return interaction.reply({ content: "El canal configurado ya no existe. Ejecuta `/giveaway setup`.", flags: MessageFlags.Ephemeral });
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const prize = interaction.options.getString("prize", true).trim();
            const duration = interaction.options.getInteger("duration", true);
            const winnerCount = interaction.options.getInteger("winners", true);
            const description = interaction.options.getString("description") || "";
            const giveaway = new Giveaway({ guildId: interaction.guildId, channelId: channel.id, creatorId: interaction.user.id, prize, description, winnerCount, endAt: new Date(Date.now() + duration * 60_000) });
            try {
                const message = await channel.send(buildGiveawayMessage(giveaway));
                giveaway.messageId = message.id;
                await giveaway.save();
                return interaction.editReply(`Giveaway publicado: ${message.url}\nID: \`${giveaway.id}\``);
            } catch (error) {
                console.error("[Giveaway] Error creando sorteo:", error);
                return interaction.editReply("No pude publicar o guardar el giveaway. Comprueba los permisos del canal.");
            }
        }

        if (sub === "list") {
            const active = await Giveaway.find({ guildId: interaction.guildId, status: "active" }).sort({ endAt: 1 }).limit(15).lean();
            if (!active.length) return interaction.reply({ content: "No hay giveaways activos.", flags: MessageFlags.Ephemeral });
            return interaction.reply({ content: active.map(item => `• **${item.prize}** · ${item.entrants?.length || 0} participantes · ID: \`${item._id}\` · termina <t:${Math.floor(new Date(item.endAt).getTime()/1000)}:R>`).join("\n"), flags: MessageFlags.Ephemeral });
        }

        const id = interaction.options.getString("id", true);
        const giveaway = await Giveaway.findOne({ _id: id, guildId: interaction.guildId });
        if (!giveaway) return interaction.reply({ content: "No encontré ese giveaway en este servidor.", flags: MessageFlags.Ephemeral });
        if (sub === "end") {
            const result = await finishGiveaway(client, giveaway.id, interaction.user.id, { force: true });
            if (!result.ok) return interaction.reply({ content: "El giveaway ya no está activo o está finalizándose.", flags: MessageFlags.Ephemeral });
            return interaction.reply({ content: result.winnerIds.length ? `Sorteo finalizado. Ganador(es): ${result.winnerIds.map(userId => `<@${userId}>`).join(", ")}` : "Sorteo finalizado sin participantes.", allowedMentions: { users: result.winnerIds }, flags: MessageFlags.Ephemeral });
        }
        if (sub === "reroll") {
            if (giveaway.status !== "ended") return interaction.reply({ content: "Solo puedes volver a sortear un giveaway finalizado.", flags: MessageFlags.Ephemeral });
            const previous = new Set(giveaway.winnerIds || []);
            const pool = [...new Set(giveaway.entrants || [])].filter(userId => !previous.has(userId));
            if (!pool.length) return interaction.reply({ content: "No quedan participantes elegibles que no hayan ganado antes.", flags: MessageFlags.Ephemeral });
            const selected = [];
            while (pool.length && selected.length < giveaway.winnerCount) selected.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
            await Giveaway.updateOne({ _id: giveaway._id, status: "ended" }, { $addToSet: { winnerIds: { $each: selected } } });
            const updated = await Giveaway.findById(giveaway._id);
            await editGiveawayMessage(client, updated, true).catch(() => {});
            const channel = await getChannel(interaction.guild, giveaway.channelId);
            await channel?.send({ content: `🔁 Nuevo sorteo de **${giveaway.prize}**: ${selected.map(userId => `<@${userId}>`).join(", ")}`, allowedMentions: { users: selected } });
            return interaction.reply({ content: `Nuevo(s) ganador(es): ${selected.map(userId => `<@${userId}>`).join(", ")}`, allowedMentions: { users: selected }, flags: MessageFlags.Ephemeral });
        }
    }
};
