const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");

const Birthday =
require("../../Models/Birthday");

const BirthdayConfig =
require("../../Models/BirthdayConfig");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("birthday")

            .setDescription(
                "Sistema de cumpleaños"
            )

            //////////////////////////////////////////////////
            // SET
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("set")

                    .setDescription(
                        "Registrar tu cumpleaños"
                    )

                    .addIntegerOption(option =>

                        option

                            .setName("dia")

                            .setDescription(
                                "Día de cumpleaños"
                            )

                            .setRequired(true)

                            .setMinValue(1)

                            .setMaxValue(31)
                    )

                    .addIntegerOption(option =>

                        option

                            .setName("mes")

                            .setDescription(
                                "Mes de cumpleaños"
                            )

                            .setRequired(true)

                            .setMinValue(1)

                            .setMaxValue(12)
                    )
            )

            //////////////////////////////////////////////////
            // REMOVE
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("remove")

                    .setDescription(
                        "Eliminar tu cumpleaños"
                    )

            )

            //////////////////////////////////////////////////
            // LIST
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("list")

                    .setDescription(
                        "Lista de cumpleaños"
                    )

            )

            //////////////////////////////////////////////////
            // NEXT
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("next")

                    .setDescription(
                        "Próximos cumpleaños"
                    )

            )

            //////////////////////////////////////////////////
            // ROLE
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("role")

                    .setDescription(
                        "Configurar rol de cumpleaños"
                    )

                    .addRoleOption(option =>

                        option

                            .setName("rol")

                            .setDescription(
                                "Rol de cumpleaños"
                            )

                            .setRequired(true)

                    )

            )

            //////////////////////////////////////////////////
            // CHANNEL
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("channel")

                    .setDescription(
                        "Configurar canal de cumpleaños"
                    )

                    .addChannelOption(option =>

                        option

                            .setName("canal")

                            .setDescription(
                                "Canal de cumpleaños"
                            )

                            .setRequired(true)

                    )

            )

            //////////////////////////////////////////////////
            // EDIT
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("edit")

                    .setDescription(
                        "Editar cumpleaños de un usuario"
                    )

                    .addUserOption(option =>

                        option

                            .setName("usuario")

                            .setDescription(
                                "Usuario"
                            )

                            .setRequired(true)

                    )

                    .addIntegerOption(option =>

                        option

                            .setName("dia")

                            .setDescription(
                                "Nuevo día"
                            )

                            .setRequired(true)

                            .setMinValue(1)

                            .setMaxValue(31)
                    )

                    .addIntegerOption(option =>

                        option

                            .setName("mes")

                            .setDescription(
                                "Nuevo mes"
                            )

                            .setRequired(true)

                            .setMinValue(1)

                            .setMaxValue(12)
                    )
            ),

    //////////////////////////////////////////////////
    // EXECUTE
    //////////////////////////////////////////////////

    async execute(interaction) {

        const subcommand =
            interaction.options.getSubcommand();

        //////////////////////////////////////////////////
        // SET
        //////////////////////////////////////////////////

        if (subcommand === "set") {

            const day =
                interaction.options.getInteger(
                    "dia"
                );

            const month =
                interaction.options.getInteger(
                    "mes"
                );

            //////////////////////////////////////////////////

            const testDate =
                new Date(

                    2025,
                    month - 1,
                    day

                );

            //////////////////////////////////////////////////

            if (

                testDate.getDate() !== day ||

                testDate.getMonth() !== month - 1

            ) {

                return interaction.reply({

                    content:
                        "❌ Fecha inválida.",

                    flags: 64
                });

            }

            //////////////////////////////////////////////////

            let data =
                await Birthday.findOne({

                    guildId:
                        interaction.guild.id,

                    userId:
                        interaction.user.id

                });

            //////////////////////////////////////////////////

            if (!data) {

                data =
                    new Birthday({

                        guildId:
                            interaction.guild.id,

                        userId:
                            interaction.user.id,

                        day,

                        month

                    });

            } else {

                data.day =
                    day;

                data.month =
                    month;

            }

            //////////////////////////////////////////////////

            await data.save();

            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "🎂 Cumpleaños registrado"
                    )

                    .setDescription(

                        `📅 Fecha: **${day}/${month}**`

                    )

                    .setThumbnail(

                        interaction.user.displayAvatarURL({

                            dynamic: true

                        })

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

            const data =
                await Birthday.findOne({

                    guildId:
                        interaction.guild.id,

                    userId:
                        interaction.user.id

                });

            //////////////////////////////////////////////////

            if (!data) {

                return interaction.reply({

                    content:
                        "❌ No tienes un cumpleaños registrado.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            await Birthday.deleteOne({

                guildId:
                    interaction.guild.id,

                userId:
                    interaction.user.id

            });

            //////////////////////////////////////////////////

            return interaction.reply({

                content:
                    "🗑️ Tu cumpleaños fue eliminado.",

                flags: 64

            });

        }

        //////////////////////////////////////////////////
        // LIST
        //////////////////////////////////////////////////

        if (subcommand === "list") {

            const birthdays =
                await Birthday.find({

                    guildId:
                        interaction.guild.id

                });

            //////////////////////////////////////////////////

            if (!birthdays.length) {

                return interaction.reply({

                    content:
                        "❌ No hay cumpleaños registrados.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            birthdays.sort((a, b) => {

                if (a.month !== b.month) {

                    return a.month - b.month;

                }

                return a.day - b.day;

            });

            //////////////////////////////////////////////////

            const description =

                birthdays.map((b, i) =>

                    `\`${i + 1}.\` <@${b.userId}> • 🎂 **${b.day}/${b.month}**`

                ).join("\n");

            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "🎂 Lista de Cumpleaños"
                    )

                    .setDescription(
                        description
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
        // NEXT
        //////////////////////////////////////////////////

        if (subcommand === "next") {

            const birthdays =
                await Birthday.find({

                    guildId:
                        interaction.guild.id

                });

            //////////////////////////////////////////////////

            if (!birthdays.length) {

                return interaction.reply({

                    content:
                        "❌ No hay cumpleaños registrados.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            const now =
                new Date();

            //////////////////////////////////////////////////

            birthdays.sort((a, b) => {

                const dateA =
                    new Date(

                        now.getFullYear(),
                        a.month - 1,
                        a.day

                    );

                const dateB =
                    new Date(

                        now.getFullYear(),
                        b.month - 1,
                        b.day

                    );

                //////////////////////////////////////////////////

                if (dateA < now) {

                    dateA.setFullYear(
                        now.getFullYear() + 1
                    );

                }

                //////////////////////////////////////////////////

                if (dateB < now) {

                    dateB.setFullYear(
                        now.getFullYear() + 1
                    );

                }

                //////////////////////////////////////////////////

                return dateA - dateB;

            });

            //////////////////////////////////////////////////

            const nextBirthdays =
                birthdays.slice(0, 10);

            //////////////////////////////////////////////////

            const description =
                nextBirthdays.map((b) => {

                    return (

                        `🎂 <@${b.userId}>\n` +

                        `> 📅 ${b.day}/${b.month}`

                    );

                }).join("\n\n");

            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#ff69b4")

                    .setTitle(
                        "🎉 Próximos Cumpleaños"
                    )

                    .setDescription(
                        description
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
        // ROLE
        //////////////////////////////////////////////////

        if (subcommand === "role") {

            if (

                !interaction.member.permissions.has(
                    PermissionFlagsBits.Administrator
                )

            ) {

                return interaction.reply({

                    content:
                        "❌ No tienes permisos.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            const role =
                interaction.options.getRole(
                    "rol"
                );

            //////////////////////////////////////////////////

            let data =
                await BirthdayConfig.findOne({

                    guildId:
                        interaction.guild.id

                });

            //////////////////////////////////////////////////

            if (!data) {

                data =
                    new BirthdayConfig({

                        guildId:
                            interaction.guild.id

                    });

            }

            //////////////////////////////////////////////////

            data.roleId =
                role.id;

            //////////////////////////////////////////////////

            await data.save();

            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "🎂 Rol configurado"
                    )

                    .setDescription(

                        `✅ El rol ${role} será entregado automáticamente.`

                    );

            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [embed]

            });

        }

        //////////////////////////////////////////////////
        // CHANNEL
        //////////////////////////////////////////////////

        if (subcommand === "channel") {

            if (

                !interaction.member.permissions.has(
                    PermissionFlagsBits.Administrator
                )

            ) {

                return interaction.reply({

                    content:
                        "❌ No tienes permisos.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            const channel =
                interaction.options.getChannel(
                    "canal"
                );

            //////////////////////////////////////////////////

            let data =
                await BirthdayConfig.findOne({

                    guildId:
                        interaction.guild.id

                });

            //////////////////////////////////////////////////

            if (!data) {

                data =
                    new BirthdayConfig({

                        guildId:
                            interaction.guild.id

                    });

            }

            //////////////////////////////////////////////////

            data.channelId =
                channel.id;

            //////////////////////////////////////////////////

            await data.save();

            //////////////////////////////////////////////////

            return interaction.reply({

                content:
`✅ Canal de cumpleaños configurado en ${channel}.`

            });

        }

        //////////////////////////////////////////////////
        // EDIT
        //////////////////////////////////////////////////

        if (subcommand === "edit") {

            if (

                !interaction.member.permissions.has(
                    PermissionFlagsBits.Administrator
                )

            ) {

                return interaction.reply({

                    content:
                        "❌ No tienes permisos.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            const user =
                interaction.options.getUser(
                    "usuario"
                );

            const day =
                interaction.options.getInteger(
                    "dia"
                );

            const month =
                interaction.options.getInteger(
                    "mes"
                );

            //////////////////////////////////////////////////

            let data =
                await Birthday.findOne({

                    guildId:
                        interaction.guild.id,

                    userId:
                        user.id

                });

            //////////////////////////////////////////////////

            if (!data) {

                return interaction.reply({

                    content:
                        "❌ Ese usuario no tiene cumpleaños registrado.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            data.day =
                day;

            data.month =
                month;

            //////////////////////////////////////////////////

            await data.save();

            //////////////////////////////////////////////////

            return interaction.reply({

                content:
`✅ Cumpleaños actualizado para ${user.username}.`

            });

        }

    }

};