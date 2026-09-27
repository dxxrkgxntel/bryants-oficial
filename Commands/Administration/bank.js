const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const BankDonorRole =
require("../../Models/BankDonorRoles");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("bank")

            .setDescription(
                "Sistema del banco"
            )

            //////////////////////////////////////////////////
            // ROLE ADD
            //////////////////////////////////////////////////

            .addSubcommandGroup(group =>

                group

                    .setName("role")

                    .setDescription(
                        "Administrar roles de donador"
                    )

                    //////////////////////////////////////////////////
                    // ADD
                    //////////////////////////////////////////////////

                    .addSubcommand(sub =>

                        sub

                            .setName("add")

                            .setDescription(
                                "Añadir rol de donador"
                            )

                            .addRoleOption(option =>

                                option

                                    .setName("rol")

                                    .setDescription(
                                        "Rol a desbloquear"
                                    )

                                    .setRequired(true)

                            )

                            .addIntegerOption(option =>

                                option

                                    .setName("cantidad")

                                    .setDescription(
                                        "Cantidad requerida"
                                    )

                                    .setRequired(true)

                                    .setMinValue(1)

                            )

                    )

                    //////////////////////////////////////////////////
                    // REMOVE
                    //////////////////////////////////////////////////

                    .addSubcommand(sub =>

                        sub

                            .setName("remove")

                            .setDescription(
                                "Eliminar rol de donador"
                            )

                    )

                    //////////////////////////////////////////////////
                    // LIST
                    //////////////////////////////////////////////////

                    .addSubcommand(sub =>

                        sub

                            .setName("list")

                            .setDescription(
                                "Ver roles de donador"
                            )

                    )

            )

            //////////////////////////////////////////////////

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            ),

    //////////////////////////////////////////////////
    // EXECUTE
    //////////////////////////////////////////////////

    async execute(interaction) {

        const group =
        interaction.options.getSubcommandGroup();

        //////////////////////////////////////////////////

        const subcommand =
        interaction.options.getSubcommand();

        //////////////////////////////////////////////////
        // ROLE
        //////////////////////////////////////////////////

        if (group === "role") {

            //////////////////////////////////////////////////
            // ADD
            //////////////////////////////////////////////////

            if (subcommand === "add") {

                const role =
                interaction.options.getRole(
                    "rol"
                );

                //////////////////////////////////////////////////

                const amount =
                interaction.options.getInteger(
                    "cantidad"
                );

                //////////////////////////////////////////////////

                const exists =
                await BankDonorRole.findOne({

                    guildId:
                        interaction.guild.id,

                    roleId:
                        role.id

                });

                //////////////////////////////////////////////////

                if (exists) {

                    return interaction.reply({

                        content:
                            "❌ Ese rol ya está configurado como rol de donador.",

                        flags: 64

                    });

                }

                //////////////////////////////////////////////////

                await BankDonorRole.create({

                    guildId:
                        interaction.guild.id,

                    roleId:
                        role.id,

                    requiredAmount:
                        amount

                });

                //////////////////////////////////////////////////

                const embed =
                new EmbedBuilder()

                    .setColor("#00ff99")

                    .setTitle(
                        "🏦 Rol de donador añadido"
                    )

                    .setDescription(

                        `🎭 Rol: ${role}\n\n` +

                        `💰 Donación requerida:\n` +

                        `**${amount.toLocaleString()} monedas**`

                    )

                    .setFooter({

                        text:
                            interaction.guild.name

                    })

                    .setTimestamp();

                //////////////////////////////////////////////////

                return interaction.reply({

                    embeds: [embed]

                });

            }

            //////////////////////////////////////////////////
            // REMOVE
            //////////////////////////////////////////////////

            if (subcommand === "remove") {

                const roles =
                await BankDonorRole.find({

                    guildId:
                        interaction.guild.id

                });

                //////////////////////////////////////////////////

                if (!roles.length) {

                    return interaction.reply({

                        content:
                            "❌ No hay roles de donadores configurados.",

                        flags: 64

                    });

                }

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

                const row =
                new ActionRowBuilder()

                    .addComponents(menu);

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

                return interaction.reply({

                    embeds: [embed],

                    components: [row]

                });

            }

            //////////////////////////////////////////////////
            // LIST
            //////////////////////////////////////////////////

            if (subcommand === "list") {

                const roles =
                await BankDonorRole.find({

                    guildId:
                        interaction.guild.id

                })

                .sort({

                    requiredAmount: 1

                });

                //////////////////////////////////////////////////

                if (!roles.length) {

                    return interaction.reply({

                        content:
                            "❌ No hay roles de donadores configurados.",

                        flags: 64

                    });

                }

                //////////////////////////////////////////////////

                let description =
                "";

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

                    description +=

                        `🎭 Rol: ${role}\n` +

                        `💰 Requiere: ` +

`**${data.requiredAmount.toLocaleString()} monedas**\n\n`;

                }

                //////////////////////////////////////////////////

                const embed =
                new EmbedBuilder()

                    .setColor("#00ff99")

                    .setTitle(
                        "🏦 Roles de Donadores"
                    )

                    .setDescription(
                        description
                    )

                    .setImage(
                        "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png"
                    )

                    .setFooter({

                        text:
                            interaction.guild.name

                    })

                    .setTimestamp();

                //////////////////////////////////////////////////

                return interaction.reply({

                    embeds: [embed]

                });

            }

        }

    }

};