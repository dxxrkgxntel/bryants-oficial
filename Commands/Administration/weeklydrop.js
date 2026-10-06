const {

    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags

} = require("discord.js");

const WeeklyDrop =
require("../../Models/WeeklyDrop");

const Economy =
require("../../Models/EconomyUser");

const WEEKLYDROP_BANNER = "https://i.imgur.com/w7LzzI0.png";

function weeklyPanel(title, text, color = 0x8A2BE2) {
    return new ContainerBuilder()
        .setAccentColor(color)
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(WEEKLYDROP_BANNER)
            )
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("## " + title))
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

function weeklyPayload(title, text, color = 0x8A2BE2) {
    return {
        components: [weeklyPanel(title, text, color)],
        flags: MessageFlags.IsComponentsV2
    };
}

function weeklyReply(interaction, title, text, color = 0x8A2BE2) {
    return interaction.editReply(weeklyPayload(title, text, color));
}

module.exports = {

    data:
    new SlashCommandBuilder()

        .setName("weeklydrop")

        .setDescription(
            "Configura el sistema de drops semanales."
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        /*
        =========================
        SETUP
        =========================
        */

        .addSubcommand(sub =>
            sub

                .setName("setup")

                .setDescription(
                    "Configura el sistema."
                )

                .addChannelOption(option =>
                    option

                        .setName("canal")

                        .setDescription(
                            "Canal de logs."
                        )

                        .addChannelTypes(
                            ChannelType.GuildText
                        )

                        .setRequired(true)
                )

                .addIntegerOption(option =>
                    option

                        .setName("minimo")

                        .setDescription(
                            "Cantidad mínima."
                        )

                        .setRequired(true)
                        .setMinValue(1)
                )

                .addIntegerOption(option =>
                    option

                        .setName("maximo")

                        .setDescription(
                            "Cantidad máxima."
                        )

                        .setRequired(true)
                        .setMinValue(1)
                )
        )

        /*
        =========================
        ENABLE
        =========================
        */

        .addSubcommand(sub =>
            sub

                .setName("enable")

                .setDescription(
                    "Activa el sistema."
                )
        )

        /*
        =========================
        DISABLE
        =========================
        */

        .addSubcommand(sub =>
            sub

                .setName("disable")

                .setDescription(
                    "Desactiva el sistema."
                )
        )

        /*
        =========================
        INFO
        =========================
        */

        .addSubcommand(sub =>
            sub

                .setName("info")

                .setDescription(
                    "Muestra información del sistema."
                )
        )

        /*
        =========================
        FORCE
        =========================
        */

        .addSubcommand(sub =>
            sub

                .setName("force")

                .setDescription(
                    "Fuerza un drop semanal."
                )
        ),

    async execute(interaction) {

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const sub =
        interaction.options.getSubcommand();

        let data =
        await WeeklyDrop.findOne({

            guildId:
            interaction.guild.id

        });

        if (!data) {

            data =
            await WeeklyDrop.create({

                guildId:
                interaction.guild.id

            });

        }

        /*
        =========================
        SETUP
        =========================
        */

        if (sub === "setup") {
            const channel = interaction.options.getChannel("canal");
            const minimo = interaction.options.getInteger("minimo");
            const maximo = interaction.options.getInteger("maximo");

            if (minimo >= maximo) return weeklyReply(interaction, "⚠️ Configuración inválida", "El mínimo debe ser menor que el máximo.", 0xFFD700);

            data.logChannelId = channel.id;
            data.minAmount = minimo;
            data.maxAmount = maximo;
            data.nextDrop = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await data.save();

            return weeklyReply(
                interaction,
                "🪙 WeeklyDrop configurado",
                "**Canal de logs:** " + channel + "\n**Mínimo:** " + minimo.toLocaleString() + "\n**Máximo:** " + maximo.toLocaleString() + "\n**Primer drop:** <t:" + Math.floor(data.nextDrop.getTime() / 1000) + ":R>",
                0x00FF99
            );
        }

        /*
        =========================
        ENABLE
        =========================
        */

        if (sub === "enable") {

            data.enabled = true;

            await data.save();

            return interaction.reply({

                content:
                "✅ Sistema WeeklyDrop activado."

            });

        }

        /*
        =========================
        DISABLE
        =========================
        */

        if (sub === "disable") {

            data.enabled = false;

            await data.save();

            return interaction.reply({

                content:
                "❌ Sistema WeeklyDrop desactivado."

            });

        }

        /*
        =========================
        INFO
        =========================
        */

        if (sub === "info") {

            const embed =
            new EmbedBuilder()

                .setColor("Blurple")

                .setTitle(
                    "🪙 Información WeeklyDrop"
                )

                .addFields(

                    {

                        name: "Estado",

                        value:
                        data.enabled
                        ? "✅ Activado"
                        : "❌ Desactivado"

                    },

                    {

                        name: "Mínimo",

                        value:
                        `${data.minAmount}`,

                        inline: true

                    },

                    {

                        name: "Máximo",

                        value:
                        `${data.maxAmount}`,

                        inline: true

                    },

                    {

                        name: "Canal Logs",

                        value:
                        data.logChannelId
                        ? `<#${data.logChannelId}>`
                        : "No configurado"

                    },

                    {

                        name: "Próximo Drop",

                        value:
                        data.nextDrop
                        ? `<t:${Math.floor(data.nextDrop.getTime() / 1000)}:R>`
                        : "No definido"

                    }

                )

                .setTimestamp();

            return interaction.reply({

                embeds: [embed]

            });

        }

        /*
        =========================
        FORCE
        =========================
        */

        if (sub === "force") {

            if (!data.enabled) {

                return interaction.reply({

                    content:
                    "❌ El sistema no está activado.",

                    flags: 64

                });

            }

            await interaction.reply({

                content:
                "🪙 Ejecutando drop semanal..."

            });

            const members =
            await interaction.guild.members.fetch();

            let totalDistributed = 0;

            let rewardedUsers = 0;

            for (const member of members.values()) {

                /*
                =========================
                IGNORAR BOTS
                =========================
                */

                if (member.user.bot)
                    continue;

                /*
                =========================
                RANDOM AMOUNT
                =========================
                */

                const amount =
                    Math.floor(

                        Math.random() *

                        (
                            data.maxAmount -
                            data.minAmount + 1
                        )

                    ) + data.minAmount;

                /*
                =========================
                BUSCAR USUARIO
                =========================
                */

                let userData =
                await Economy.findOne({

                    guildId:
                    interaction.guild.id,

                    userId:
                    member.id

                });

                /*
                =========================
                CREAR SI NO EXISTE
                =========================
                */

                if (!userData) {

                    userData =
                    await Economy.create({

                        guildId:
                        interaction.guild.id,

                        userId:
                        member.id,

                        balance: 0

                    });

                }

                /*
                =========================
                AÑADIR DINERO
                =========================
                */

                userData.balance += amount;

                await userData.save();

                totalDistributed += amount;

                rewardedUsers++;

            }

            /*
            =========================
            ACTUALIZAR FECHAS
            =========================
            */

            data.lastDrop =
            new Date();

            data.nextDrop =
            new Date(

                Date.now() +

                7 * 24 * 60 * 60 * 1000

            );

            await data.save();

            /*
            =========================
            LOG CHANNEL
            =========================
            */

            if (data.logChannelId) {

                const channel =
                interaction.guild.channels.cache.get(
                    data.logChannelId
                );

                if (channel) {

                    const logEmbed =
                    new EmbedBuilder()

                        .setColor("Gold")

                        .setTitle(
                            "🪙 Drop Semanal Ejecutado"
                        )

                        .setDescription(

`✅ Usuarios recompensados:
**${rewardedUsers}**

💰 Total distribuido:
**${totalDistributed.toLocaleString()}** coins

⏳ Próximo drop:
<t:${Math.floor(data.nextDrop.getTime() / 1000)}:R>`

                        )

                        .setFooter({

                            text:
                            `Servidor: ${interaction.guild.name}`

                        })

                        .setTimestamp();

                    await channel.send({

                        embeds: [logEmbed]

                    });

                }

            }

            /*
            =========================
            RESPUESTA FINAL
            =========================
            */

            return interaction.followUp({

                embeds: [

                    new EmbedBuilder()

                        .setColor("Green")

                        .setTitle(
                            "✅ Drop semanal completado"
                        )

                        .setDescription(

`🪙 Usuarios recompensados:
**${rewardedUsers}**

💰 Coins distribuidas:
**${totalDistributed.toLocaleString()}**`

                        )

                        .setTimestamp()

                ]

            });

        }

    }

};