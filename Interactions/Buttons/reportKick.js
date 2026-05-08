const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const errReply = require('../../Functions/interactionErrorReply');
const correReply = require('../../Functions/interactionReply');

const reportUserSchema = require('../../Models/reportUserSchema');

module.exports = {
    id: 'reportkick', // 🔥 customId del botón

    async execute(interaction, client) {
        const { guild, message } = interaction;

        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return errReply(interaction, "Tu no tienes permisos para hacer esto", true);
        }

        try {
            const userData = await reportUserSchema.findOne({
                reportGuildId: guild.id,
                reportMessageId: message.id
            });

            const member = guild.members.cache.get(userData.reportUserId);

            if (!member) {
                return errReply(interaction, "No se pudo encontrar al usuario", true);
            }

            const embed = message.embeds[0];

            const embedKick = new EmbedBuilder()
                .setAuthor({
                    name: `${member.user.tag}`,
                    iconURL: member.user.displayAvatarURL({ dynamic: true })
                })
                .setTitle(`Fuiste kickeado de ${guild.name}`)
                .setColor('#8A2BE2')
                .setDescription(`Puedes volver a entrar al servidor con una nueva invitación. Tómalo como una advertencia.\nPor favor no seas tóxico o no **rompas las reglas del servidor**`)
                .setTimestamp();

            try {
                await member.send({ embeds: [embedKick] });

                embed.data.fields[1] = {
                    name: 'Enviado al MD',
                    value: '✔️',
                    inline: true
                };
            } catch {
                embed.data.fields[1] = {
                    name: 'Enviado al MD',
                    value: '❌',
                    inline: true
                };
            }

            embed.data.fields[2] = {
                name: 'Usuario Sancionado',
                value: '✔️',
                inline: true
            };

            const editEmbed = EmbedBuilder.from(embed).setColor('#8A2BE2');

            await member.kick();
            await message.edit({
                embeds: [editEmbed],
                components: []
            });

            return correReply(interaction, "Se sancionó correctamente al usuario (Kickeado)", true);

        } catch (error) {
            console.log(error);
            return errReply(interaction, "Se produjo un error al tratar de sancionar al usuario", true);
        }
    }
};