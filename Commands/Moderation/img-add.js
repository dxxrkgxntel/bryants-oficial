const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const ImageConfig = require("../../Models/ImageConfig");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("img-add")
        .setDescription("Permitir imágenes en un canal")
        .addChannelOption(option =>
            option.setName("canal")
                .setDescription("Canal")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {

        const channel = interaction.options.getChannel("canal");

        let config = await ImageConfig.findOne({
            guildId: interaction.guild.id
        });

        if (!config) {
            config = new ImageConfig({
                guildId: interaction.guild.id,
                allowedChannels: []
            });
        }

        if (config.allowedChannels.includes(channel.id)) {
            return interaction.reply({
                content: "⚠️ Ese canal ya está permitido",
                flags: 64
            });
        }

        config.allowedChannels.push(channel.id);
        await config.save();

        const embed = new EmbedBuilder()
            .setColor("#8A2BE2")
            .setDescription(`✅ Imágenes permitidas en ${channel}`);

        interaction.reply({ embeds: [embed] });
    }
};