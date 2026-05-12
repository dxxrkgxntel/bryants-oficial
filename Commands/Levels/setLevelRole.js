const {

    SlashCommandBuilder,
    PermissionFlagsBits

} = require("discord.js");

const LevelReward =
    require("../../Models/LevelReward");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName(
                "levelrole-setup"
            )

            .setDescription(
                "Configura un rol por nivel"
            )

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            )

            //////////////////////////////////////////////////

            .addIntegerOption(option =>

                option

                    .setName("nivel")

                    .setDescription(
                        "Nivel requerido"
                    )

                    .setRequired(true)
            )

            //////////////////////////////////////////////////

            .addRoleOption(option =>

                option

                    .setName("rol")

                    .setDescription(
                        "Rol a otorgar"
                    )

                    .setRequired(true)
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////

        const level =
            interaction.options.getInteger(
                "nivel"
            );

        //////////////////////////////////////////////////

        const role =
            interaction.options.getRole(
                "rol"
            );

        //////////////////////////////////////////////////

        await LevelReward.findOneAndUpdate(

            {

                guildId:
                    interaction.guild.id,

                level
            },

            {

                roleId:
                    role.id
            },

            {

                upsert: true
            }
        );

        //////////////////////////////////////////////////

        await interaction.reply({

            content:

                `✅ El rol ${role} será otorgado al alcanzar el nivel **${level}**.`,

            flags: 64
        });
    }
};