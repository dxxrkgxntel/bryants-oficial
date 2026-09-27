const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const suggestSchema = require('../../Models/suggestSchema');
const suggestMessge = require('../../Models/suggestMessage');

module.exports = {
    id: 'suggestModal', // 🔥 customId del modal

    async execute(interaction, client) {

        try {
            const data = await suggestSchema.findOne({
                guildSuggest: interaction.guild.id
            });

            if (!data || !data.guildChannel) return;

            const suggestChannel = interaction.guild.channels.cache.get(data.guildChannel);

            if (!suggestChannel) return;

            const suggestDesc = interaction.fields.getTextInputValue('suggestdesc');

            const suggestEmbed = new EmbedBuilder()
                .setColor('#8A2BE2')
                .setAuthor({
                    name: `${interaction.user.username} acaba de hacer una sugerencia`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .addFields(
                    { name: 'Sugerencia', value: `\`\`\`${suggestDesc}\`\`\`` },
                    { name: 'Votos Positivos', value: `0`, inline: true },
                    { name: 'Votos Negativos', value: `0`, inline: true }
                )
                .setFooter({
                    text: `${interaction.guild.name}`,
                    iconURL: client.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            // 🔘 BOTONES
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('votosi')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId('votono')
                    .setEmoji('❎')
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId('votolist')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Secondary)
            );

            const msg = await suggestChannel.send({
                embeds: [suggestEmbed],
                components: [buttons]
            });

            await suggestMessge.create({
                guildId: interaction.guild.id,
                messageId: msg.id,
                authorId: interaction.user.id,
                votesSi: [],
                votesNo: []
            });

            return await interaction.editReply({
                content: "Se ha enviado correctamente tu sugerencia",
                flags: 64
            });

        } catch (error) {
            console.log(error);
        }
    }
};