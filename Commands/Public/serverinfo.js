const {
    ChatInputCommandInteraction,
    EmbedBuilder,
    ChannelType,
    GuildVerificationLevel,
    GuildExplicitContentFilter,
    GuildNSFWLevel,
    SlashCommandBuilder
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
    .setName("server-info")
    .setDescription("Obtén información sobre el servidor."),


    async execute(interaction) {
        const { guild } = interaction;
        const {
            members,
            channels,
            emojis,
            roles,
            stickers
        } = guild;
        
        const sortedRoles  = roles.cache.map(role => role).slice(1, roles.cache.size).sort((a, b) => b.position - a.position);
        const userRoles    = sortedRoles.filter(role => !role.managed);
        const managedRoles = sortedRoles.filter(role => role.managed);
        const botCount     = members.cache.filter(member => member.user.bot).size;

        const maxDisplayRoles = (roles, maxFieldLength = 1024) => {
            let totalLength = 0;
            const result = [];

            for (const role of roles) {
                const roleString = `<@&${role.id}>`;

                if (roleString.length + totalLength > maxFieldLength)
                    break;

                totalLength += roleString.length + 1;
                result.push(roleString);
            }

            return result.length;
        }

        const splitPascal = (string, separator) => string.split(/(?=[A-Z])/).join(separator);
        const toPascalCase = (string, separator = false) => {
            const pascal = string.charAt(0).toUpperCase() + string.slice(1).toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase());
            return separator ? splitPascal(pascal, separator) : pascal;
        };

        const getChannelTypeSize = type => channels.cache.filter(channel => type.includes(channel.type)).size;
        
        const totalChannels = getChannelTypeSize([
            ChannelType.GuildText,
            ChannelType.GuildNews,
            ChannelType.GuildVoice,
            ChannelType.GuildStageVoice,
            ChannelType.GuildForum,
            ChannelType.GuildPublicThread,
            ChannelType.GuildPrivateThread,
            ChannelType.GuildNewsThread,
            ChannelType.GuildCategory
        ]);
        
        const embed = new EmbedBuilder()
                .setColor("#8A2BE2")
                .setTitle(`Información de ${guild.name}`)
                .setThumbnail(guild.iconURL({ size: 1024 }))
                .setImage(guild.bannerURL({ size: 1024 }))
                .addFields(
                    { name: "Description", value: `📝 ${guild.description || "None"}` },
                    {
                        name: "General",
                        value: [
                            `📜 **Creado:** <t:${parseInt(guild.createdTimestamp / 1000)}:R>`,
                            `💳 **ID:** ${guild.id}`,
                            `👑 **Dueño:** <@${guild.ownerId}>`,
                            `🌍 **Lenguaje:** ${new Intl.DisplayNames(["en"], { type: "language" }).of(guild.preferredLocale)}`,
                        ].join("\n")
                    },
                    { name: "Características", value: guild.features?.map(feature => `- ${toPascalCase(feature, " ")}`)?.join("\n") || "None", inline: true },
                    {
                        name: "Seguridad",
                        value: [
                            `👀 **Filtro explícito** ${splitPascal(GuildExplicitContentFilter[guild.explicitContentFilter], " ")}`,
                            `🔞 **Nivel NSFW** ${splitPascal(GuildNSFWLevel[guild.nsfwLevel], " ")}`,
                            `🔒 **Nivel de verificación** ${splitPascal(GuildVerificationLevel[guild.verificationLevel], " ")}`
                        ].join("\n"),
                        inline: true
                    },
                    {
                        name: `Miembros (${guild.memberCount})`,
                        value: [
                            `👨‍👩‍👧‍👦 **Usuarios:** ${guild.memberCount - botCount}`,
                            `🤖 **Bots:** ${botCount}`
                        ].join("\n"),
                        inline: true
                    },
                    { name: `Roles de usuarios: (${maxDisplayRoles(userRoles)} of ${userRoles.length})`, value: `${userRoles.slice(0, maxDisplayRoles(userRoles)).join(" ") || "None"}`},
                    { name: `Roles de Bot: (${maxDisplayRoles(managedRoles)} of ${managedRoles.length})`, value: `${managedRoles.slice(0, maxDisplayRoles(managedRoles)).join(" ") || "None"}`},
                    {
                        name: `Canales, hilos y categorías (${totalChannels})`,
                        value: [
                            `💬 **Canales de texto:** ${getChannelTypeSize([ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildNews])}`,
                            `🎙 **Canales de voz:** ${getChannelTypeSize([ChannelType.GuildVoice, ChannelType.GuildStageVoice])}`,
                            `🧵 **Hilos:** ${getChannelTypeSize([ChannelType.GuildPublicThread, ChannelType.GuildPrivateThread, ChannelType.GuildNewsThread])}`,
                            `📑 **Categorias:** ${getChannelTypeSize([ChannelType.GuildCategory])}`
                        ].join("\n"),
                        inline: true
                    },
                    {
                        name: `Emojis & Stickers (${emojis.cache.size + stickers.cache.size})`,
                        value: [
                            `📺 **Animados:** ${emojis.cache.filter(emoji => emoji.animated).size}`,
                            `🗿 **Estaticos:** ${emojis.cache.filter(emoji => !emoji.animated).size}`,
                            `🏷 **Stickers:** ${stickers.cache.size}`
                        ].join("\n"),
                        inline: true
                    },
                    { 
                        name: "Nitro",
                        value: [
                            `📈 **Nivel:** ${guild.premiumTier || "None"}`,
                            `💪🏻 **Boosts:** ${guild.premiumSubscriptionCount}`,
                            `💎 **Boosters:** ${guild.members.cache.filter(member => member.roles.premiumSubscriberRole).size}`,
                            `🏋🏻‍♀️ **Total Booster:** ${guild.members.cache.filter(member => member.premiumSince).size}`
                        ].join("\n"),
                        inline: true
                    }
                )

        interaction.reply({ embeds: [embed] });
    }
}
