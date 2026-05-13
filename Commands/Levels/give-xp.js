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
                "give-xp"
            )

            .setDescription(
                "Dar XP a un usuario"
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

        let data =
            await Level.findOne({

                guildId:
                    interaction.guild.id,

                userId:
                    user.id
            });

        //////////////////////////////////////////////////

        if (!data) {

            data =
                new Level({

                    guildId:
                        interaction.guild.id,

                    userId:
                        user.id,

                    xp: 0,

                    level: 0
                });
        }

        //////////////////////////////////////////////////
        // ADD XP
        //////////////////////////////////////////////////

        data.xp += xp;

        //////////////////////////////////////////////////
        // SAVE
        //////////////////////////////////////////////////

        await data.save();

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#00ff99")

                .setTitle(
                    "📈 XP Añadido"
                )

                .setDescription(

                    `✅ Se añadieron **${xp.toLocaleString()} XP** a ${user}\n\n` +

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