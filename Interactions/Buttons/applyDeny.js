const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

const errReply = require('../../Functions/interactionErrorReply');
const correReply = require('../../Functions/interactionReply');

const applyUserSchema = require('../../Models/applyUserSchema');

module.exports = {
    id: 'applydeny', // 🔥 customId del botón

    async execute(interaction, client) {
        const { guild, message } = interaction;

        try {
            if (interaction.user.id !== config.developer) {
                return errReply(
                    interaction,
                    'Tu no puedes denegar aplicaciones o no cuentas con los permisos necesarios',
                    true
                );
            }

            const embed = message.embeds[0];

            const userData = await applyUserSchema.findOne({
                applyGuildId: guild.id,
                applyMessageId: message.id
            });

            const user = client.users.cache.get(userData.applyUserId);

            embed.data.fields[4] = {
                name: 'Status',
                value: 'Denegado',
                inline: true
            };

            const embedDenegado = EmbedBuilder.from(embed)
                .setAuthor({
                    name: 'Aplicacion Denegada',
                    iconURL: user.displayAvatarURL({ dynamic: true })
                })
                .setColor('#8A2BE2')
                .addFields({
                    name: `Denegado por`,
                    value: `<@${interaction.user.id}>`
                });

            await message.edit({
                embeds: [embedDenegado],
                components: []
            });

            const embedUser = new EmbedBuilder()
                .setTitle('Aplicacion Denegada')
                .setDescription('Tu aplicacion para staff fue denegada')
                .setColor('#8A2BE2');

            await user.send({ embeds: [embedUser] });

            await applyUserSchema.findOneAndDelete({
                applyGuildId: guild.id,
                applyMessageId: message.id
            });

            correReply(interaction, 'La aplicacion fue denegada correctamente', true);

        } catch (error) {
            console.log(error);
            return errReply(
                interaction,
                'Se produjo un error al tratar de denegar la aplicacion del usuario',
                true
            );
        }
    }
};