const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");

const Level =
    require("../../Models/Level");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName(
                "remove-xp"
            )

            .setDescription(
                "Remover XP a un usuario"
            )

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            )

            //////////////////////////////////////////////////
            // USER
            //////////////////////////////////////////////////

            .addUserOption(option =>

                option

                    .setName("usuario")

                    .setDescription(
                        "Usuario"
                    )

                    .setRequired(true)
            )

            //////////////////////////////////////////////////
            // XP
            //////////////////////////////////////////////////

            .addIntegerOption(option =>

                option

                    .setName("xp")

                    .setDescription(
                        "Cantidad de XP"
                    )

                    .setRequired(true)

                    .setMinValue(1)
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////

        const user =
            interaction.options.getUser(
                "usuario"
            );

        //////////////////////////////////////////////////

        const xp =
            interaction.options.getInteger(
                "xp"
            );

        //////////////////////////////////////////////////
        // DATA
        //////////////////////////////////////////////////

        const data =
            await Level.findOne({

                guildId:
                    interaction.guild.id,

                userId:
                    user.id
            });

        //////////////////////////////////////////////////

        if (!data) {

            return interaction.reply({

                content:
                    "❌ Ese usuario no tiene XP.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // REMOVE XP
        //////////////////////////////////////////////////

        data.xp -= xp;

        //////////////////////////////////////////////////

        if (data.xp < 0)
            data.xp = 0;

        //////////////////////////////////////////////////
        // SAVE
        //////////////////////////////////////////////////

        await data.save();

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#ff0000")

                .setTitle(
                    "📉 XP Removido"
                )

                .setDescription(

                    `❌ Se removieron **${xp.toLocaleString()} XP** a ${user}\n\n` +

                    `📊 XP actual: **${data.xp.toLocaleString()}**`
                )

                .setThumbnail(

                    user.displayAvatarURL({

                        dynamic: true
                    })
                )

                .setFooter({

                    text:
                        interaction.guild.name
                })

                .setTimestamp();

        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed]
        });
    }
};