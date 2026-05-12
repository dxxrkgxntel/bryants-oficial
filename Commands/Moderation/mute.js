const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ChatInputCommandInteraction
} = require('discord.js');

const errReply =
    require('../../Functions/interactionErrorReply');

const correReply =
    require('../../Functions/interactionReply');

const ms =
    require('ms');

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName('mute')

            .setDescription(
                'Mutea a un usuario de tu servidor'
            )

            .setDefaultMemberPermissions(
                PermissionFlagsBits.ModerateMembers
            )

            .addUserOption(option =>

                option

                    .setName('user')

                    .setDescription(
                        'Elige al usuario para mutear'
                    )

                    .setRequired(true)
            )

            .addStringOption(option =>

                option

                    .setName('time')

                    .setDescription(
                        'Ingresa el tiempo de sanción (1s,1m,1h)'
                    )

                    .setRequired(true)
            )

            .addStringOption(option =>

                option

                    .setName('description')

                    .setDescription(
                        'Escribe la razón del muteo'
                    )

                    .setRequired(false)
            ),

    //////////////////////////////////////////////////////

    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     */

    async execute(interaction) {

        //////////////////////////////////////////////////////
        // OPTIONS
        //////////////////////////////////////////////////////

        const { options } =
            interaction;

        //////////////////////////////////////////////////////
        // USER
        //////////////////////////////////////////////////////

        const user =
            options.getMember('user');

        //////////////////////////////////////////////////////
        // VALIDAR USER
        //////////////////////////////////////////////////////

        if (!user) {

            return errReply(

                interaction,

                "❌ Usuario inválido o no encontrado.",

                true
            );
        }

        //////////////////////////////////////////////////////
        // SELF MUTE
        //////////////////////////////////////////////////////

        if (
            user.id === interaction.user.id
        ) {

            return errReply(

                interaction,

                "❌ No puedes mutearte a ti mismo.",

                true
            );
        }

        //////////////////////////////////////////////////////
        // BOT MUTE
        //////////////////////////////////////////////////////

        if (
            user.id === interaction.client.user.id
        ) {

            return errReply(

                interaction,

                "❌ No puedes mutearme.",

                true
            );
        }

        //////////////////////////////////////////////////////
        // JERARQUÍA
        //////////////////////////////////////////////////////

        if (

            user.roles.highest.position >=
            interaction.member.roles.highest.position

        ) {

            return errReply(

                interaction,

                "❌ Ese usuario tiene un rol igual o superior al tuyo.",

                true
            );
        }

        //////////////////////////////////////////////////////
        // BOT ROLE CHECK
        //////////////////////////////////////////////////////

        if (

            user.roles.highest.position >=
            interaction.guild.members.me.roles.highest.position

        ) {

            return errReply(

                interaction,

                "❌ No puedo mutear a ese usuario porque tiene un rol superior al mío.",

                true
            );
        }

        //////////////////////////////////////////////////////
        // DESCRIPTION
        //////////////////////////////////////////////////////

        const description =

            options.getString('description') ||

            'No se especificó la razón';

        //////////////////////////////////////////////////////
        // TIME
        //////////////////////////////////////////////////////

        const time =

            ms(
                options.getString('time')
            );

        //////////////////////////////////////////////////////
        // VALIDAR TIEMPO
        //////////////////////////////////////////////////////

        if (!time) {

            return errReply(

                interaction,

                "❌ Tiempo inválido.",

                true
            );
        }

        //////////////////////////////////////////////////////
        // MAX TIME
        //////////////////////////////////////////////////////

        const comparacion =
            ms('28d');

        //////////////////////////////////////////////////////

        if (time > comparacion) {

            return errReply(

                interaction,

                "❌ El tiempo máximo de mute es de 28 días.",

                true
            );
        }

        //////////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////////

        const muteEmbed =

            new EmbedBuilder()

                .setTitle(
                    '🔇 Usuario muteado'
                )

                .setDescription(

                    `👤 Usuario: ${user}\n` +

                    `🛡️ Moderador: <@${interaction.user.id}>\n` +

                    `⏳ Tiempo: ${options.getString('time')}\n` +

                    `📝 Razón: ${description}`
                )

                .setColor('#8A2BE2')

                .setTimestamp();

        //////////////////////////////////////////////////////
        // TRY
        //////////////////////////////////////////////////////

        try {

            //////////////////////////////////////////////////////
            // MUTE
            //////////////////////////////////////////////////////

            await user.timeout(

                time,

                description
            );

            //////////////////////////////////////////////////////
            // REPLY
            //////////////////////////////////////////////////////

            await interaction.reply({

                embeds: [muteEmbed]
            });

            //////////////////////////////////////////////////////
            // SUCCESS
            //////////////////////////////////////////////////////

            return correReply(

                interaction,

                `${user} fue muteado correctamente.`,

                true
            );

        } catch (error) {

            console.log(error);

            return errReply(

                interaction,

                "❌ Se produjo un error al tratar de mutear al usuario.",

                true
            );
        }
    }
};