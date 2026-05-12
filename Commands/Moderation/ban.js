const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');

module.exports = {

    data: new SlashCommandBuilder()

        .setName('ban')

        .setDescription(
            'Banea a un usuario del servidor'
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.BanMembers
        )

        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription(
                    'Elige el usuario a banear'
                )
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName('razon')
                .setDescription(
                    'Razón del baneo'
                )
        ),

    async execute(interaction) {

        try {

            //////////////////////////////////////////////////
            // OPCIONES
            //////////////////////////////////////////////////

            const targetUser =
                interaction.options.getUser(
                    'usuario'
                );

            const reason =
                interaction.options.getString(
                    'razon'
                ) || 'No se especificó una razón';

            //////////////////////////////////////////////////
            // SELF BAN
            //////////////////////////////////////////////////

            if (
                targetUser.id ===
                interaction.user.id
            ) {

                return interaction.reply({

                    content:
                        '❌ No puedes banearte a ti mismo.',

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // BOT BAN
            //////////////////////////////////////////////////

            if (
                targetUser.id ===
                interaction.client.user.id
            ) {

                return interaction.reply({

                    content:
                        '❌ No puedes banearme.',

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // MEMBER
            //////////////////////////////////////////////////

            const member =
                await interaction.guild.members
                    .fetch(targetUser.id)
                    .catch(() => null);

            //////////////////////////////////////////////////
            // NO ENCONTRADO
            //////////////////////////////////////////////////

            if (!member) {

                return interaction.reply({

                    content:
                        '❌ No encontré ese usuario en el servidor.',

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // OWNER
            //////////////////////////////////////////////////

            if (
                member.id ===
                interaction.guild.ownerId
            ) {

                return interaction.reply({

                    content:
                        '❌ No puedes banear al owner del servidor.',

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // JERARQUIA USUARIO
            //////////////////////////////////////////////////

            if (

                member.roles.highest.position >=
                interaction.member.roles.highest.position

                &&

                interaction.guild.ownerId !==
                interaction.user.id

            ) {

                return interaction.reply({

                    embeds: [

                        new EmbedBuilder()

                            .setColor('#8A2BE2')

                            .setDescription(

                                `❌ No puedes banear a ${targetUser} porque tiene un rol igual o superior al tuyo.`
                            )
                    ],

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // JERARQUIA BOT
            //////////////////////////////////////////////////

            if (

                member.roles.highest.position >=
                interaction.guild.members.me.roles.highest.position

            ) {

                return interaction.reply({

                    content:
                        '❌ No puedo banear a ese usuario porque tiene un rol más alto que el mío.',

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // BANEAR
            //////////////////////////////////////////////////

            await member.ban({

                reason: reason
            });

            //////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////

            const embedBan =
                new EmbedBuilder()

                    .setTitle(
                        '✅ Usuario baneado'
                    )

                    .setDescription(

                        `${targetUser} fue baneado correctamente.`
                    )

                    .addFields(

                        {
                            name: 'Razón',
                            value: reason
                        },

                        {
                            name: 'ID',
                            value: targetUser.id
                        }
                    )

                    .setColor('#8A2BE2')

                    .setTimestamp();

            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [embedBan]
            });

        } catch (error) {

            console.log(
                'Error en ban.js:',
                error
            );

            return interaction.reply({

                content:
                    '❌ Ocurrió un error al intentar banear al usuario.',

                flags: 64
            }).catch(() => {});
        }
    }
};