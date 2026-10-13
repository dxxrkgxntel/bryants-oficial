const {
    ChannelType,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");
const ServerStatsConfig = require("../../Models/ServerStatsConfig");
const { updateServerStats } = require("../../Functions/serverStats");

function normalizeInvite(value) {
    const input = String(value || "").trim();
    const match = input.match(/^(?:(?:https?:\/\/)?(?:discord\.gg|\.gg)\/)?([a-z0-9-]+)\/?$/i);
    return match ? `.gg/${match[1]}` : null;
}

module.exports = {
    async execute(interaction) {
        const guild = interaction.guild;
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "❌ Solo los administradores pueden configurar las estadísticas del servidor.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const existing = await ServerStatsConfig.findOne({ guildId: guild.id });
        const suppliedInvite = interaction.options.getString("invitacion");
        const inviteLink = normalizeInvite(suppliedInvite || existing?.inviteLink || guild.vanityURLCode);
        if (!inviteLink) {
            return interaction.editReply("❌ Indica tu enlace personalizado, por ejemplo `bryantfamily` o `.gg/bryantfamily`.");
        }

        const botMember = guild.members.me;
        if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.editReply("❌ Necesito el permiso `Administrar canales` para crear y actualizar los contadores.");
        }

        let category = existing?.categoryId
            ? guild.channels.cache.get(existing.categoryId) || await guild.channels.fetch(existing.categoryId).catch(() => null)
            : null;
        let createdCategory = false;
        let configurationSaved = false;
        const createdChannels = [];

        try {
            if (category?.type !== ChannelType.GuildCategory) category = null;
            if (!category) {
                category = await guild.channels.create({
                    name: "「💀」FAMILY",
                    type: ChannelType.GuildCategory
                });
                createdCategory = true;
            }

            const everyoneId = guild.roles.everyone.id;
            const createCounter = async (channelId, name) => {
                let channel = channelId
                    ? guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null)
                    : null;
                if (channel?.type !== ChannelType.GuildVoice) channel = null;

                if (!channel) {
                    channel = await guild.channels.create({
                        name,
                        type: ChannelType.GuildVoice,
                        parent: category.id,
                        permissionOverwrites: [{
                            id: everyoneId,
                            allow: [PermissionFlagsBits.ViewChannel],
                            deny: [PermissionFlagsBits.Connect]
                        }]
                    });
                    createdChannels.push(channel);
                } else if (channel.parentId !== category.id) {
                    await channel.setParent(category.id, { lockPermissions: false });
                }

                return channel;
            };

            const membersChannel = await createCounter(
                existing?.membersChannelId,
                `「👥」𝗠𝗶𝗲𝗺𝗯𝗿𝗼𝘀: ${guild.memberCount}`
            );
            const inviteChannel = await createCounter(
                existing?.inviteChannelId,
                `「🔗」${inviteLink}`
            );

            await ServerStatsConfig.findOneAndUpdate(
                { guildId: guild.id },
                {
                    $set: {
                        categoryId: category.id,
                        membersChannelId: membersChannel.id,
                        inviteChannelId: inviteChannel.id,
                        inviteLink,
                        updatedBy: interaction.user.id
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            configurationSaved = true;

            await updateServerStats(guild);
            return interaction.editReply(
                `✅ Estadísticas configuradas en ${category}: ${membersChannel} y ${inviteChannel}.`
            );
        } catch (error) {
            console.error("[Server Stats Setup] Error al configurar estadísticas:", error);
            if (!configurationSaved) {
                for (const channel of createdChannels) {
                    await channel.delete("Falló la configuración de estadísticas").catch(() => {});
                }
                if (createdCategory) await category.delete("Falló la configuración de estadísticas").catch(() => {});
            }
            return interaction.editReply("❌ No pude crear o actualizar la categoría y los canales de estadísticas.");
        }
    }
};
