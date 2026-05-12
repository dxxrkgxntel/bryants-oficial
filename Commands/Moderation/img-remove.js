const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const ImageConfig = require("../../Models/ImageConfig");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("img-remove")
        .setDescription("Quitar canal permitido para imagenes")
        .addChannelOption(option =>
            option.setName("canal")
                .setDescription("Canal")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {

        const channel = interaction.options.getChannel("canal");

        const config = await ImageConfig.findOne({
            guildId: interaction.guild.id
        });

        if (!config) {
            return interaction.reply({
                content: "❌ No hay configuración",
                flags: 64
            });
        }

        if(!config.allowedChannels.includes(channel.id)){
            return interaction.reply({
                content: "❌ Ese canal no está configurado.",
                flags: 64
            });
        }

        config.allowedChannels = config.allowedChannels.filter(id => id !== channel.id);
        await config.save();

        const embed = new EmbedBuilder()
            .setColor("#8A2BE2")
            .setDescription(`❌ Canal eliminado: ${channel}`);

        interaction.reply({ embeds: [embed] });
    }
};