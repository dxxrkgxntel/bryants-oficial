const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");

const boostSchema = require("../../Models/boostSchema");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("boost-setup")
        .setDescription("Configura el sistema Booster")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(option => option.setName("booster").setDescription("Rol Booster").setRequired(true))
        .addRoleOption(option => option.setName("boostervip").setDescription("Rol Booster VIP").setRequired(true))
        .addRoleOption(option => option.setName("boosterlegend").setDescription("Rol Booster Legend").setRequired(true))
        .addChannelOption(option =>
            option.setName("canal")
                .setDescription("Canal donde se enviarán los avisos de Boost")
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("descripcion")
                .setDescription("Descripción del embed. Variables: {usuario}, {servidor}, {boosts}")
                .setMaxLength(4000)
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName("thumbnail")
                .setDescription("URL del thumbnail del embed")
                .setRequired(false)
        )
        .addStringOption(option =>\n            option.setName("banner")\n                .setDescription("URL del banner superior")\n                .setRequired(false)\n        ),

    async execute(interaction) {
        try {
            const boosterRole = interaction.options.getRole("booster");
            const boosterVipRole = interaction.options.getRole("boostervip");
            const boosterLegendRole = interaction.options.getRole("boosterlegend");
            const boostChannel = interaction.options.getChannel("canal");
            const boostDescription = interaction.options.getString("descripcion");
            const boostThumbnail = interaction.options.getString("thumbnail");
            const boostImage = interaction.options.getString("banner");

            const botMember = interaction.guild.members.me;
            const roles = [boosterRole, boosterVipRole, boosterLegendRole];

            for (const role of roles) {
                if (role.position >= botMember.roles.highest.position) {
                    return interaction.reply({
                        content: `❌ El rol ${role} está por encima de mi jerarquía.`,
                        flags: 64
                    });
                }
            }

            const isValidUrl = value => {
                if (!value) return true;
                try {
                    const url = new URL(value);
                    return url.protocol === "http:" || url.protocol === "https:";
                } catch {
                    return false;
                }
            };

            if (!isValidUrl(boostThumbnail) || !isValidUrl(boostImage)) {
                return interaction.reply({
                    content: "❌ `thumbnail` y `banner` deben ser URLs válidas que comiencen con http:// o https://.",
                    flags: 64
                });
            }

            const existing = await boostSchema.findOne({ guildId: interaction.guild.id });

            await boostSchema.findOneAndUpdate(
                { guildId: interaction.guild.id },
                {
                    boosterRole: boosterRole.id,
                    boosterVipRole: boosterVipRole.id,
                    boosterLegendRole: boosterLegendRole.id,
                    boostChannel: boostChannel.id,
                    boostDescription: boostDescription ?? existing?.boostDescription ?? "",
                    boostThumbnail: boostThumbnail ?? existing?.boostThumbnail ?? "",
                    boostImage: boostImage ?? existing?.boostImage ?? ""
                },
                { upsert: true, new: true }
            );

            const embed = new EmbedBuilder()
                .setColor("#8A2BE2")
                .setTitle("🚀 Sistema Booster Configurado")
                .setDescription(
                    `✅ Configuración guardada correctamente.\n\n` +
                    `💜 Booster: ${boosterRole}\n` +
                    `🚀 Booster VIP: ${boosterVipRole}\n` +
                    `👑 Booster Legend: ${boosterLegendRole}\n` +
                    `📢 Canal: ${boostChannel}\n\n` +
                    `📝 Descripción: ${boostDescription ? "Actualizada" : existing?.boostDescription ? "Se conserva la anterior" : "Predeterminada"}\n` +
                    `🖼️ Thumbnail: ${boostThumbnail ? "Actualizado" : existing?.boostThumbnail ? "Se conserva el anterior" : "Sin configurar"}\n` +
                    `🌄 Banner: ${boostImage ? "Actualizado" : existing?.boostImage ? "Se conserva el anterior" : "Sin configurar"}`
                )
                .setFooter({ text: `${interaction.guild.name} • Booster System` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: 64 });
        } catch (error) {
            console.log("❌ Error en boost-setup:", error);
            const payload = { content: "❌ Ocurrió un error al configurar el sistema Booster.", flags: 64 };
            if (interaction.replied || interaction.deferred) return interaction.followUp(payload);
            return interaction.reply(payload);
        }
    }
};
