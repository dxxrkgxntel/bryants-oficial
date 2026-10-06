const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    Client,
    ChatInputCommandInteraction,
    EmbedBuilder
} = require('discord.js');

const errReply = require('../../Functions/interactionErrorReply');
const correReply = require('../../Functions/interactionReply');

const autoRole = require('../../Models/autoRoleType');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('autorol-setup')
        .setDescription('Crea un sistema de autoroles para usuarios y bots')

        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addRoleOption(option =>
            option
                .setName('userrole')
                .setDescription('Elige el rol para usuarios')
                .setRequired(true)
        )

        .addRoleOption(option =>
            option
                .setName('botrole')
                .setDescription('Elige el rol para bots')
                .setRequired(true)
        ),

    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */

    async execute(interaction, client) {

        // 🔒 Protección backend
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {

            return interaction.reply({
                content: '❌ No tienes permisos para usar este comando.',
                flags: 64
            });
        }

        const { options, guild } = interaction;

        const userRole = options.getRole('userrole');
        const botRole = options.getRole('botrole');

        try {

            // 🔥 Validar jerarquía del bot
            const botMember = guild.members.me;

            if (userRole.position >= botMember.roles.highest.position) {

                return errReply(
                    interaction,
                    `❌ Mi rol debe estar por encima de ${userRole}.`,
                    true
                );
            }

            if (botRole.position >= botMember.roles.highest.position) {

                return errReply(
                    interaction,
                    `❌ Mi rol debe estar por encima de ${botRole}.`,
                    true
                );
            }

            // 🔥 Evitar @everyone
            if (userRole.id === guild.id || botRole.id === guild.id) {

                return errReply(
                    interaction,
                    '❌ No puedes usar el rol @everyone.',
                    true
                );
            }

            // 🔥 Buscar datos
            const autoRolData = await autoRole.findOne({
                guildId: guild.id
            });

            // ==================================================
            // CREAR
            // ==================================================

            if (!autoRolData) {

                await autoRole.create({

                    guildId: guild.id,

                    userRole: userRole.id,

                    botRole: botRole.id

                });

                const embed = new EmbedBuilder()
                    .setColor('#8A2BE2')
                    .setTitle('✅ Sistema de Autoroles Configurado')
                    .addFields(
                        {
                            name: '👤 Rol Usuarios',
                            value: `${userRole}`,
                            inline: true
                        },
                        {
                            name: '🤖 Rol Bots',
                            value: `${botRole}`,
                            inline: true
                        }
                    )
                    .setFooter({
                        text: guild.name,
                        iconURL: guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp();

                return interaction.reply({
                    embeds: [embed],
                    flags: 64
                });
            }

            // ==================================================
            // ACTUALIZAR
            // ==================================================

            await autoRole.findOneAndUpdate(

                { guildId: guild.id },

                {
                    userRole: userRole.id,
                    botRole: botRole.id
                },

                { new: true }

            );

            const embed = new EmbedBuilder()
                .setColor('#8A2BE2')
                .setTitle('✅ Sistema de Autoroles Actualizado')
                .addFields(
                    {
                        name: '👤 Nuevo Rol Usuarios',
                        value: `${userRole}`,
                        inline: true
                    },
                    {
                        name: '🤖 Nuevo Rol Bots',
                        value: `${botRole}`,
                        inline: true
                    }
                )
                .setFooter({
                    text: guild.name,
                    iconURL: guild.iconURL({ dynamic: true })
                })
                .setTimestamp();

            return interaction.reply({
                embeds: [embed],
                flags: 64
            });

        } catch (error) {

            console.log(error);

            if (interaction.replied || interaction.deferred) {

                return interaction.followUp({
                    content: '❌ Ocurrió un error al configurar el sistema de autoroles.',
                    flags: 64
                });

            } else {

                return interaction.reply({
                    content: '❌ Ocurrió un error.',
                    flags: 64
                });
            }
        }
    }
};