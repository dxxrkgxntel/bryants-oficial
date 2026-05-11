const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    PermissionFlagsBits
} = require("discord.js");

const reactionRolesSchema =
    require("../../Models/reactionRolesSchema");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("rr-setup")

            .setDescription(
                "Crear panel de reaction roles"
            )

            //////////////////////////////////////////////////
            // SOLO ADMINISTRADORES
            //////////////////////////////////////////////////

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // VALIDACION EXTRA
        //////////////////////////////////////////////////

        if (

            !interaction.member.permissions.has(
                PermissionFlagsBits.Administrator
            )

        ) {

            return interaction.reply({

                embeds: [

                    new EmbedBuilder()

                        .setColor("#ff0000")

                        .setTitle(
                            "❌ Sin permisos"
                        )

                        .setDescription(

                            `Necesitas permisos de **Administrador** para utilizar este comando.`
                        )
                ],

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // EVITAR DUPLICADOS
        //////////////////////////////////////////////////

        const existingPanel =
            await reactionRolesSchema.findOne({

                guildId:
                    interaction.guild.id
            });

        //////////////////////////////////////////////////

        if (existingPanel) {

            return interaction.reply({

                embeds: [

                    new EmbedBuilder()

                        .setColor("#ffaa00")

                        .setTitle(
                            "⚠️ Panel ya existente"
                        )

                        .setDescription(

                            `Ya existe un panel de reaction roles configurado en este servidor.\n\n` +

                            `🗑️ Elimina el anterior antes de crear uno nuevo.`
                        )
                ],

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =
            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "✅ ・ Selección de Roles"
                )

                .setDescription(

                    `> ✨ Personaliza tu perfil seleccionando los roles que mejor te representen.\n` +
                    `> Los cambios se aplicarán automáticamente al elegir una opción.\n\n` +

                    `🌍 **País**\n` +
                    `> Selecciona tu nacionalidad o región.\n\n` +

                    `🎂 **Edad**\n` +
                    `> Escoge el rango de edad correspondiente.\n\n` +

                    `👽 **Sexo**\n` +
                    `> Selecciona cómo deseas identificarte.`
                )

                .setThumbnail(
                    "https://media.discordapp.net/attachments/1499375657103392839/1501666281651441925/logo_principal.png"
                )

                .setImage(
                    "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png"
                )

                .setFooter({

                    text:
                        `Panel creado por ${interaction.user.username}`
                })

                .setTimestamp();

        //////////////////////////////////////////////////
        // MENU PAISES
        //////////////////////////////////////////////////

        const countryMenu =
            new StringSelectMenuBuilder()

                .setCustomId("rr_country")

                .setPlaceholder(
                    "🌍 Selecciona tu país"
                )

                .setMinValues(0)

                .setMaxValues(1)

                .addOptions([

                    {
                        label:"República Dominicana",
                        value:"rd",
                        emoji:"🇩🇴",
                        description:"Obtener rol RD"
                    },

                    {
                        label:"Estados Unidos",
                        value:"usa",
                        emoji:"🇺🇸",
                        description:"Obtener rol USA"
                    },

                    {
                        label:"España",
                        value:"spain",
                        emoji:"🇪🇸",
                        description:"Obtener rol España"
                    },

                    {
                        label:"Mexico",
                        value:"mexico",
                        emoji:"🇲🇽",
                        description:"Obtener rol Mexico"
                    },

                    {
                        label:"Argentina",
                        value:"arg",
                        emoji:"🇦🇷",
                        description:"Obtener rol Argentina"
                    },

                    {
                        label:"Pánama",
                        value:"pnm",
                        emoji:"🇵🇦",
                        description:"Obtener rol Pánama"
                    },

                    {
                        label:"Puerto Rico",
                        value:"prc",
                        emoji:"🇵🇷",
                        description:"Obtener rol Puerto Rico"
                    },

                    {
                        label:"Chile",
                        value:"chl",
                        emoji:"🇨🇱",
                        description:"Obtener rol Chile"
                    },

                    {
                        label:"Venezuela",
                        value:"vnzl",
                        emoji:"🇻🇪",
                        description:"Obtener rol Venezuela"
                    },

                    {
                        label:"Peru",
                        value:"per",
                        emoji:"🇵🇪",
                        description:"Obtener rol Peru"
                    },

                    {
                        label:"Cuba",
                        value:"cba",
                        emoji:"🇨🇺",
                        description:"Obtener rol Cuba"
                    },

                    {
                        label:"Colombia",
                        value:"clba",
                        emoji:"🇨🇴",
                        description:"Obtener rol Colombia"
                    },

                    {
                        label:"Honduras",
                        value:"hdr",
                        emoji:"🇭🇳",
                        description:"Obtener rol Honduras"
                    }
                ]);

        //////////////////////////////////////////////////
        // MENU EDAD
        //////////////////////////////////////////////////

        const ageMenu =
            new StringSelectMenuBuilder()

                .setCustomId("rr_age")

                .setPlaceholder(
                    "🎂 Selecciona tu edad"
                )

                .setMinValues(0)

                .setMaxValues(1)

                .addOptions([

                    {
                        label:"Menor de 17",
                        value:"menor",
                        emoji:"🍼",
                        description:"Obtener rol de menor"
                    },

                    {
                        label:"Intermedio 18",
                        value:"intermedio",
                        emoji:"🧊",
                        description:"Obtener rol de intermedio"
                    },

                    {
                        label:"Mayor de 21",
                        value:"mayor",
                        emoji:"🥂",
                        description:"Obtener rol de mayor"
                    }
                ]);

        //////////////////////////////////////////////////
        // MENU SEXO
        //////////////////////////////////////////////////

        const sexMenu =
            new StringSelectMenuBuilder()

                .setCustomId("rr_sex")

                .setPlaceholder(
                    "👽 Selecciona tu sexo"
                )

                .setMinValues(0)

                .setMaxValues(1)

                .addOptions([

                    {
                        label:"Hombre",
                        value:"hm",
                        emoji:"🙋🏽‍♂️",
                        description:"Obtener rol Hombre"
                    },

                    {
                        label:"Mujer",
                        value:"mj",
                        emoji:"🙋🏽",
                        description:"Obtener rol Mujer"
                    },

                    {
                        label:"Homo / Lesbiana",
                        value:"homo",
                        emoji:"🏳️‍🌈",
                        description:"Obtener rol Homo / Lesbian"
                    }
                ]);

        //////////////////////////////////////////////////
        // ROWS
        //////////////////////////////////////////////////

        const row1 =
            new ActionRowBuilder()

                .addComponents(countryMenu);

        //////////////////////////////////////////////////

        const row2 =
            new ActionRowBuilder()

                .addComponents(ageMenu);

        //////////////////////////////////////////////////

        const row3 =
            new ActionRowBuilder()

                .addComponents(sexMenu);

        //////////////////////////////////////////////////
        // ENVIAR
        //////////////////////////////////////////////////

        const msg =
            await interaction.channel.send({

                embeds: [embed],

                components: [row1, row2, row3]
            });

        //////////////////////////////////////////////////
        // GUARDAR DB
        //////////////////////////////////////////////////

        await reactionRolesSchema.create({

            guildId:
                interaction.guild.id,

            channelId:
                interaction.channel.id,

            messageId:
                msg.id
        });

        //////////////////////////////////////////////////

        return interaction.reply({

            embeds: [

                new EmbedBuilder()

                    .setColor("#00ff99")

                    .setTitle(
                        "✅ Panel creado"
                    )

                    .setDescription(

                        `El panel de reaction roles fue creado correctamente en ${interaction.channel}.`
                    )
            ],

            flags: 64
        });
    }
};