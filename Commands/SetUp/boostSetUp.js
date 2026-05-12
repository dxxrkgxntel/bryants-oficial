const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

const boostSchema =
    require("../../Models/boostSchema");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("boost-setup")

        .setDescription(
            "Configura el sistema Booster"
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        //////////////////////////////////////////////////
        // BOOSTER
        //////////////////////////////////////////////////

        .addRoleOption(option =>

            option

                .setName("booster")

                .setDescription(
                    "Rol Booster"
                )

                .setRequired(true)
        )

        //////////////////////////////////////////////////
        // BOOSTER VIP
        //////////////////////////////////////////////////

        .addRoleOption(option =>

            option

                .setName("boostervip")

                .setDescription(
                    "Rol Booster VIP"
                )

                .setRequired(true)
        )

        //////////////////////////////////////////////////
        // BOOSTER LEGEND
        //////////////////////////////////////////////////

        .addRoleOption(option =>

            option

                .setName("boosterlegend")

                .setDescription(
                    "Rol Booster Legend"
                )

                .setRequired(true)
        ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        try {

            //////////////////////////////////////////////////
            // ROLES
            //////////////////////////////////////////////////

            const boosterRole =
                interaction.options.getRole(
                    "booster"
                );

            const boosterVipRole =
                interaction.options.getRole(
                    "boostervip"
                );

            const boosterLegendRole =
                interaction.options.getRole(
                    "boosterlegend"
                );

            //////////////////////////////////////////////////
            // BOT MEMBER
            //////////////////////////////////////////////////

            const botMember =
                interaction.guild.members.me;

            //////////////////////////////////////////////////
            // VALIDAR JERARQUIA
            //////////////////////////////////////////////////

            const roles = [

                boosterRole,
                boosterVipRole,
                boosterLegendRole
            ];

            //////////////////////////////////////////////////

            for (const role of roles) {

                if (
                    role.position >=
                    botMember.roles.highest.position
                ) {

                    return interaction.reply({

                        content:
                            `❌ El rol ${role} está por encima de mi jerarquía.`,

                        flags: 64
                    });
                }
            }

            //////////////////////////////////////////////////
            // GUARDAR
            //////////////////////////////////////////////////

            await boostSchema.findOneAndUpdate(

                {
                    guildId:
                        interaction.guild.id
                },

                {
                    boosterRole:
                        boosterRole.id,

                    boosterVipRole:
                        boosterVipRole.id,

                    boosterLegendRole:
                        boosterLegendRole.id
                },

                {
                    upsert: true
                }
            );

            //////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "🚀 Sistema Booster Configurado"
                    )

                    .setDescription(

                        `✅ Configuración guardada correctamente.\n\n` +

                        `💜 Booster: ${boosterRole}\n` +

                        `🚀 Booster VIP: ${boosterVipRole}\n` +

                        `👑 Booster Legend: ${boosterLegendRole}`
                    )

                    .setFooter({

                        text:
                            `${interaction.guild.name} • Booster System`
                    })

                    .setTimestamp();

            //////////////////////////////////////////////////

            await interaction.reply({

                embeds: [embed],

                flags: 64
            });

        } catch (error) {

            console.log(
                "❌ Error en boost-setup:",
                error
            );

            return interaction.reply({

                content:
                    "❌ Ocurrió un error al configurar el sistema Booster.",

                flags: 64
            });
        }
    }
};