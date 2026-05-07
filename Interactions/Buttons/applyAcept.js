const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

const errReply = require('../../Functions/interactionErrorReply');
const correReply = require('../../Functions/interactionReply');

const applyGuildSchema = require('../../Models/applyGuildSchema');
const applyUserSchema = require('../../Models/applyUserSchema');

module.exports = {
    id: 'applyacept', // 🔥 IMPORTANTE (antes era customId)

    async execute(interaction, client) {
        const { message, guild } = interaction;

        try {
            const dataGuild = await applyGuildSchema.findOne({
                applyGuildId: guild.id
            });

            const dataUser = await applyUserSchema.findOne({
                applyGuildId: guild.id,
                applyMessageId: message.id
            });

            const user = await guild.members.cache.get(dataUser.applyUserId);

            if (interaction.user.id !== config.developer) {
                return errReply(
                    interaction,
                    'Lo siento tu no puedes aceptar esta aplicacion solamente puede las personas autorizadas',
                    true
                );
            }

            const embed = message.embeds[0];

            embed.data.fields[4] = {
                name: 'Status',
                value: 'Aceptado',
                inline: true
            };

            const embedAceptado = EmbedBuilder.from(embed)
                .setAuthor({
                    name: 'Aplicacion Aceptada',
                    iconURL: user.displayAvatarURL({ dynamic: true })
                })
                .setColor('Green')
                .addFields({
                    name: `Aceptado por`,
                    value: `<@${interaction.user.id}>`
                });

            await message.edit({
                embeds: [embedAceptado],
                components: []
            });

            const embedUser = new EmbedBuilder()
                .setTitle('Aplicacion para Staff Aceptada')
                .setDescription(
                    'Tu aplicacion para staff fue aceptada, se entrego correctamente los roles'
                )
                .addFields({
                    name: 'Servidor: ',
                    value: `${interaction.guild.name}`
                })
                .setColor('Green');

            await user.roles.add(dataGuild.applyRole);

            try {
                await user.send({
                    content: "Enhorabuena",
                    embeds: [embedUser]
                });
            } catch (error) {
                console.log('No se pudo enviar DM');
            }

            await applyUserSchema.findOneAndDelete({
                applyGuildId: guild.id,
                applyMessageId: message.id
            });

            correReply(interaction, 'Se acepto correctamente al usuario', true);

        } catch (error) {
            console.log(error);
            errReply(
                interaction,
                'Se produjo un error al tratar de aceptar la aplicacion',
                true
            );
        }
    }
};