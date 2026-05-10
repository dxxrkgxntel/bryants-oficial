const {SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder} = require("discord.js");
const reactionRolesSchema = require("../../Models/reactionRolesSchema");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("rr-setup")

            .setDescription(
                "Crear panel de reaction roles"
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =
            new EmbedBuilder()

                .setColor("#8A2BE2")
                .setTitle("✅ ・ Selección de Roles")
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
                .setThumbnail('https://media.discordapp.net/attachments/1499375657103392839/1501666281651441925/logo_principal.png?ex=69ff8a35&is=69fe38b5&hm=93a35cefa66cd30f2730eaedc8edb5c83509e4d7ccbfcfc7ad5e24c4f9254f90&=&format=webp&quality=lossless&width=694&height=694')
                .setImage('https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png?ex=69ff8a34&is=69fe38b4&hm=20d0de70c8ae315aae73b3f468611e5d74239caf34394d34aca4cec64cdfaef0&=&format=webp&quality=lossless&width=1288&height=515');

        //////////////////////////////////////////////////
        // MENU PAISES
        //////////////////////////////////////////////////

        const countryMenu =
            new StringSelectMenuBuilder()

                .setCustomId("rr_country")
                .setPlaceholder("🌍 Selecciona tu país")
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
                .setPlaceholder("🎂 Selecciona tu edad")
                .setMinValues(0)
                .setMaxValues(1)
                .addOptions([

                    {
                        label: "Menor de 17",
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
                .setPlaceholder("👽 Selecciona tu sexo")
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

            guildId: interaction.guild.id,
            channelId: interaction.channel.id,
            messageId: msg.id
        });

        //////////////////////////////////////////////////

        return interaction.reply({

            content: "✅ Panel creado.",
            flags: 64
        });
    }
};