const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

const errReply =
require("../../Functions/interactionErrorReply");

const correReply =
require("../../Functions/interactionReply");

const ms =
require("ms");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("moderation")

            .setDescription(
                "Sistema de moderación"
            )

            //////////////////////////////////////////////////
            // BAN
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("ban")

                    .setDescription(
                        "Banear usuario"
                    )

                    .addUserOption(option =>

                        option

                            .setName("usuario")

                            .setDescription(
                                "Usuario"
                            )

                            .setRequired(true)

                    )

                    .addStringOption(option =>

                        option

                            .setName("razon")

                            .setDescription(
                                "Razón"
                            )

                    )

            )

            //////////////////////////////////////////////////
            // UNBAN
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("unban")

                    .setDescription(
                        "Desbanear usuario"
                    )

                    .addStringOption(option =>

                        option

                            .setName("usuario")

                            .setDescription(
                                "ID usuario"
                            )

                            .setRequired(true)

                    )

            )

            //////////////////////////////////////////////////
            // KICK
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("kick")

                    .setDescription(
                        "Expulsar usuario"
                    )

                    .addUserOption(option =>

                        option

                            .setName("usuario")

                            .setDescription(
                                "Usuario"
                            )

                            .setRequired(true)

                    )

                    .addStringOption(option =>

                        option

                            .setName("razon")

                            .setDescription(
                                "Razón"
                            )

                    )

            )

            //////////////////////////////////////////////////
            // WARN
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("warn")

                    .setDescription(
                        "Advertir usuario"
                    )

                    .addUserOption(option =>

                        option

                            .setName("usuario")

                            .setDescription(
                                "Usuario"
                            )

                            .setRequired(true)

                    )

                    .addStringOption(option =>

                        option

                            .setName("razon")

                            .setDescription(
                                "Razón"
                            )

                    )

            )

            //////////////////////////////////////////////////
            // MUTE
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("mute")

                    .setDescription(
                        "Mutear usuario"
                    )

                    .addUserOption(option =>

                        option

                            .setName("user")

                            .setDescription(
                                "Usuario"
                            )

                            .setRequired(true)

                    )

                    .addStringOption(option =>

                        option

                            .setName("time")

                            .setDescription(
                                "Tiempo"
                            )

                            .setRequired(true)

                    )

                    .addStringOption(option =>

                        option

                            .setName("description")

                            .setDescription(
                                "Razón"
                            )

                    )

            )

            //////////////////////////////////////////////////
            // UNMUTE
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("unmute")

                    .setDescription(
                        "Desmutear usuario"
                    )

                    .addUserOption(option =>

                        option

                            .setName("user")

                            .setDescription(
                                "Usuario"
                            )

                            .setRequired(true)

                    )

            )

            //////////////////////////////////////////////////
            // PURGE
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("purge")

                    .setDescription(
                        "Eliminar mensajes"
                    )

                    .addIntegerOption(option =>

                        option

                            .setName("amount")

                            .setDescription(
                                "Cantidad"
                            )

                            .setMinValue(1)

                            .setMaxValue(100)

                    )

                    .addUserOption(option =>

                        option

                            .setName("user")

                            .setDescription(
                                "Usuario"
                            )

                    )

                    .addBooleanOption(option =>

                        option

                            .setName("bots")

                            .setDescription(
                                "Solo bots"
                            )

                    )

                    .addBooleanOption(option =>

                        option

                            .setName("all")

                            .setDescription(
                                "Eliminar todo"
                            )

                    )

            )

            //////////////////////////////////////////////////

            .setDefaultMemberPermissions(

                PermissionFlagsBits.ModerateMembers

            ),

    //////////////////////////////////////////////////
    // EXECUTE
    //////////////////////////////////////////////////

    async execute(interaction) {

        const subcommand =
        interaction.options.getSubcommand();

        //////////////////////////////////////////////////
        // BAN
        //////////////////////////////////////////////////

        if (subcommand === "ban") {

            const user =
            interaction.options.getMember(
                "usuario"
            );

            const reason =
            interaction.options.getString(
                "razon"
            ) ||

            "No especificada";

            //////////////////////////////////////////////////

            if (!user) {

                return errReply(

                    interaction,

                    "❌ Usuario inválido.",

                    true

                );

            }

            //////////////////////////////////////////////////

            await user.ban({

                reason

            });

            //////////////////////////////////////////////////

            const embed =
            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🔨 Usuario baneado"
                )

                .setDescription(

                    `👤 Usuario: ${user}\n` +

                    `🛡️ Moderador: ${interaction.user}\n` +

                    `📝 Razón: ${reason}`

                )

                .setTimestamp();

            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [embed]

            });

        }

        //////////////////////////////////////////////////
        // UNBAN
        //////////////////////////////////////////////////

        if (subcommand === "unban") {

            const userId =
            interaction.options.getString(
                "usuario"
            );

            //////////////////////////////////////////////////

            await interaction.guild.members.unban(
                userId
            );

            //////////////////////////////////////////////////

            return correReply(

                interaction,

                "✅ Usuario desbaneado.",

                true

            );

        }

        //////////////////////////////////////////////////
        // KICK
        //////////////////////////////////////////////////

        if (subcommand === "kick") {

            const user =
            interaction.options.getMember(
                "usuario"
            );

            const reason =
            interaction.options.getString(
                "razon"
            ) ||

            "No especificada";

            //////////////////////////////////////////////////

            if (!user) {

                return errReply(

                    interaction,

                    "❌ Usuario inválido.",

                    true

                );

            }

            //////////////////////////////////////////////////

            await user.kick(reason);

            //////////////////////////////////////////////////

            const embed =
            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "👢 Usuario expulsado"
                )

                .setDescription(

                    `👤 Usuario: ${user}\n` +

                    `🛡️ Moderador: ${interaction.user}\n` +

                    `📝 Razón: ${reason}`

                )

                .setTimestamp();

            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [embed]

            });

        }

        //////////////////////////////////////////////////
        // WARN
        //////////////////////////////////////////////////

        if (subcommand === "warn") {

            const user =
            interaction.options.getUser(
                "usuario"
            );

            const reason =
            interaction.options.getString(
                "razon"
            ) ||

            "No especificada";

            //////////////////////////////////////////////////

            const embed =
            new EmbedBuilder()

                .setColor("#FFD700")

                .setTitle(
                    "⚠️ Usuario advertido"
                )

                .setDescription(

                    `👤 Usuario: ${user}\n` +

                    `🛡️ Moderador: ${interaction.user}\n` +

                    `📝 Razón: ${reason}`

                )

                .setTimestamp();

            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [embed]

            });

        }

        //////////////////////////////////////////////////
        // MUTE
        //////////////////////////////////////////////////

        if (subcommand === "mute") {

            const user =
            interaction.options.getMember(
                "user"
            );

            const time =
            ms(

                interaction.options.getString(
                    "time"
                )

            );

            const reason =
            interaction.options.getString(
                "description"
            ) ||

            "No especificada";

            //////////////////////////////////////////////////

            if (!time) {

                return errReply(

                    interaction,

                    "❌ Tiempo inválido.",

                    true

                );

            }

            //////////////////////////////////////////////////

            await user.timeout(

                time,

                reason

            );

            //////////////////////////////////////////////////

            const embed =
            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🔇 Usuario muteado"
                )

                .setDescription(

                    `👤 Usuario: ${user}\n` +

                    `🛡️ Moderador: ${interaction.user}\n` +

                    `⏳ Tiempo: ${interaction.options.getString("time")}\n` +

                    `📝 Razón: ${reason}`

                )

                .setTimestamp();

            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [embed]

            });

        }

        //////////////////////////////////////////////////
        // UNMUTE
        //////////////////////////////////////////////////

        if (subcommand === "unmute") {

            const user =
            interaction.options.getMember(
                "user"
            );

            //////////////////////////////////////////////////

            await user.timeout(null);

            //////////////////////////////////////////////////

            return correReply(

                interaction,

                "✅ Usuario desmuteado.",

                true

            );

        }

        //////////////////////////////////////////////////
        // PURGE
        //////////////////////////////////////////////////

        if (subcommand === "purge") {

            const amount =
            interaction.options.getInteger(
                "amount"
            );

            const user =
            interaction.options.getUser(
                "user"
            );

            const bots =
            interaction.options.getBoolean(
                "bots"
            );

            const deleteAll =
            interaction.options.getBoolean(
                "all"
            );

            //////////////////////////////////////////////////

            await interaction.deferReply({

                flags: 64

            });

            //////////////////////////////////////////////////
            // DELETE ALL
            //////////////////////////////////////////////////

            if (deleteAll) {

                let deleted = 0;
                let fetched;

                do {

                    fetched =
                    await interaction.channel.messages.fetch({

                        limit: 100

                    });

                    //////////////////////////////////////////////////

                    const filtered =
                    fetched.filter(msg =>

                        Date.now() - msg.createdTimestamp
                        <
                        1209600000

                    );

                    //////////////////////////////////////////////////

                    if (filtered.size === 0)
                    break;

                    //////////////////////////////////////////////////

                    await interaction.channel.bulkDelete(

                        filtered,

                        true

                    );

                    //////////////////////////////////////////////////

                    deleted += filtered.size;

                }

                while (fetched.size >= 2);

                //////////////////////////////////////////////////

                return interaction.editReply({

                    content:
                    `✅ ${deleted} mensajes eliminados.`

                });

            }

            //////////////////////////////////////////////////

            const fetched =
            await interaction.channel.messages.fetch({

                limit: amount || 100

            });

            //////////////////////////////////////////////////

            let filtered = fetched;

            //////////////////////////////////////////////////

            if (user) {

                filtered =
                filtered.filter(

                    msg =>
                    msg.author.id === user.id

                );

            }

            //////////////////////////////////////////////////

            if (bots) {

                filtered =
                filtered.filter(

                    msg =>
                    msg.author.bot

                );

            }

            //////////////////////////////////////////////////

            filtered =
            filtered.filter(msg =>

                Date.now() - msg.createdTimestamp
                <
                1209600000

            );

            //////////////////////////////////////////////////

            const deleted =
            await interaction.channel.bulkDelete(

                filtered,

                true

            );

            //////////////////////////////////////////////////

            return interaction.editReply({

                content:
                `✅ ${deleted.size} mensajes eliminados.`

            });

        }

    }

};