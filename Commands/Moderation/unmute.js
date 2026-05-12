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

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName('unmute')

            .setDescription(
                'Desmutea a un usuario de tu servidor'
            )

            .setDefaultMemberPermissions(
                PermissionFlagsBits.ModerateMembers
            )

            .addUserOption(option =>

                option

                    .setName('user')

                    .setDescription(
                        'Elige al usuario para desmutear'
                    )

                    .setRequired(true)
            )

            .addStringOption(option =>

                option

                    .setName('description')

                    .setDescription(
                        'Escribe la razón del desmuteo'
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
        // SELF UNMUTE
        //////////////////////////////////////////////////////

        if (
            user.id === interaction.user.id
        ) {

            return errReply(

                interaction,

                "❌ No puedes desmutearte a ti mismo.",

                true
            );
        }

        //////////////////////////////////////////////////////
        // BOT UNMUTE
        //////////////////////////////////////////////////////

        if (
            user.id === interaction.client.user.id
        ) {

            return errReply(

                interaction,

                "❌ No puedes desmutearme.",

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

                "❌ No puedo desmutear a ese usuario porque tiene un rol superior al mío.",

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
        // VALIDAR SI ESTÁ MUTEADO
        //////////////////////////////////////////////////////

        if (!user.communicationDisabledUntilTimestamp) {

            return errReply(

                interaction,

                "❌ Ese usuario no está muteado.",

                true
            );
        }

        //////////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////////

        const unmuteEmbed =

            new EmbedBuilder()

                .setTitle(
                    '🔊 Usuario desmuteado'
                )

                .setDescription(

                    `👤 Usuario: ${user}\n` +

                    `🛡️ Moderador: <@${interaction.user.id}>\n` +

                    `📝 Razón: ${description}`
                )

                .setColor('#8A2BE2')

                .setTimestamp();

        //////////////////////////////////////////////////////
        // TRY
        //////////////////////////////////////////////////////

        try {

            //////////////////////////////////////////////////////
            // UNMUTE
            //////////////////////////////////////////////////////

            await user.timeout(

                null,

                description
            );

            //////////////////////////////////////////////////////
            // REPLY
            //////////////////////////////////////////////////////

            await interaction.reply({

                embeds: [unmuteEmbed]
            });

            //////////////////////////////////////////////////////
            // SUCCESS
            //////////////////////////////////////////////////////

            return correReply(

                interaction,

                `${user} fue desmuteado correctamente.`,

                true
            );

        } catch (error) {

            console.log(error);

            return errReply(

                interaction,

                "❌ Se produjo un error al tratar de desmutear al usuario.",

                true
            );
        }
    }
};