const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const BankDonorRole =
    require("../../Models/BankDonorRoles");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("bank-role-remove")

            .setDescription(
                "Elimina un rol de donador"
            )

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // DATA
        //////////////////////////////////////////////////

        const roles =
            await BankDonorRole.find({

                guildId:
                    interaction.guild.id
            });

        //////////////////////////////////////////////////
        // NO HAY ROLES
        //////////////////////////////////////////////////

        if (!roles.length) {

            return interaction.reply({

                content:
                    "❌ No hay roles de donadores configurados.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // OPTIONS
        //////////////////////////////////////////////////

        const options = [];

        //////////////////////////////////////////////////

        for (const data of roles) {

            const role =
                interaction.guild.roles.cache.get(
                    data.roleId
                );

            //////////////////////////////////////////////////

            if (!role)
                continue;

            //////////////////////////////////////////////////

            options.push({

                label:
                    role.name,

                description:
                    `Requiere ${data.requiredAmount.toLocaleString()} monedas`,

                value:
                    role.id
            });
        }

        //////////////////////////////////////////////////
        // MENU
        //////////////////////////////////////////////////

        const menu =

            new StringSelectMenuBuilder()

                .setCustomId(
                    "bank_role_remove_select"
                )

                .setPlaceholder(
                    "Selecciona un rol"
                )

                .addOptions(options);

        //////////////////////////////////////////////////
        // ROW
        //////////////////////////////////////////////////

        const row =

            new ActionRowBuilder()

                .addComponents(menu);

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🏦 Eliminar rol de donador"
                )

                .setDescription(

                    "Selecciona el rol que deseas eliminar del sistema de donadores."
                )

                .setFooter({

                    text:
                        interaction.guild.name
                })

                .setTimestamp();

        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed],

            components: [row]
        });
    }
};