const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const ImageConfig = require("../../Models/ImageConfig");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("img-list")
        .setDescription("Ver canales de imagenes permitidos")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {

        const config = await ImageConfig.findOne({
            guildId: interaction.guild.id
        });

        const validChannels =

            config.allowedChannels.filter(id =>

                interaction.guild.channels.cache.has(id)
            );

//////////////////////////////////////////////////////

        if (!config || validChannels.length === 0) {

            return interaction.reply({
                content:"❌ No hay canales configurados",
                flags: 64
            });
        }

        const channels = config.allowedChannels
            .map(id => interaction.guild.channels.cache.get(id))
            .filter(c => c)
            .map(c => `${c}`)
            .join("\n");

        // 🔥 TUS URLs PERSONALIZADAS
        const THUMBNAIL_URL = "https://media.discordapp.net/attachments/1499375657103392839/1501666281651441925/logo_principal.png?ex=69fce735&is=69fb95b5&hm=5b517faf387901d626d4276c1fc715b1482987381c7e9387d9e2574ed37e68a8&=&format=webp&quality=lossless&width=694&height=694";
        const IMAGE_URL = "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png?ex=69fce734&is=69fb95b4&hm=ce0ce8d6ce02a2092a9a6d57952aa8dafdefc54a6d1f015ff6d22be289e0088a&=&format=webp&quality=lossless&width=1288&height=515";

        const embed = new EmbedBuilder()
    .setColor("#8A2BE2")
    .setTitle("📸 Canales permitidos")
    .setDescription(`
            ${channels || "❌ No hay canales válidos"}

            ━━━━━━━━━━━━━━
            📊 Total: ${config.allowedChannels.length}
                    `)
    .setThumbnail(THUMBNAIL_URL)
    .setImage(IMAGE_URL);

        await interaction.reply({ embeds: [embed], flags: 64 });
    }
};