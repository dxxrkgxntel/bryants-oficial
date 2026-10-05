const {

    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder

} = require("discord.js");

const reactionRolesSchema =
    require("../../Models/reactionRolesSchema");

const ROLE_VISUALS = {
    DO: { emoji: "🇩🇴", label: "DO · Dominicano" },
    PR: { emoji: "🇵🇷", label: "PR · Puertorriqueño" },
    CU: { emoji: "🇨🇺", label: "CU · Cubano" },
    PA: { emoji: "🇵🇦", label: "PA · Panameño" },
    CO: { emoji: "🇨🇴", label: "CO · Colombiano" },
    US: { emoji: "🇺🇸", label: "US · Estadounidense" },
    CL: { emoji: "🇨🇱", label: "CL · Chileno" },
    HN: { emoji: "🇭🇳", label: "HN · Hondureño" },
    ES: { emoji: "🇪🇸", label: "ES · Español" },
    MX: { emoji: "🇲🇽", label: "MX · Mexicano" },
    PE: { emoji: "🇵🇪", label: "PE · Peruano" },
    AR: { emoji: "🇦🇷", label: "AR · Argentino" },
    VE: { emoji: "🇻🇪", label: "VE · Venezolano" }
};

function getRoleVisual(name = "") {
    const codeMatch = name.trim().match(/(?:^|[^A-Z])(?:@)?(DO|PR|CU|PA|CO|US|CL|HN|ES|MX|PE|AR|VE)(?:[^A-Z]|$)/i);
    const code = codeMatch?.[1]?.toUpperCase();
    if (code && ROLE_VISUALS[code]) return ROLE_VISUALS[code];
    return { emoji: "✨", label: name.trim().slice(0, 100) };
}


//////////////////////////////////////////////////
// COMMAND
//////////////////////////////////////////////////

const data =
    new SlashCommandBuilder()

        .setName("rr-setup")

        .setDescription(
            "Crear panel de reaction roles"
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        //////////////////////////////////////////////////
        // PANEL ID
        //////////////////////////////////////////////////

        .addStringOption(option =>

            option

                .setName("panelid")

                .setDescription(
                    "ID único del panel"
                )

                .setRequired(true)
        )

        //////////////////////////////////////////////////
        // PERSONALIZACIÓN
        //////////////////////////////////////////////////

        .addStringOption(option =>

            option

                .setName("titulo")

                .setDescription(
                    "Título del embed"
                )
        )

        .addStringOption(option =>

            option

                .setName("descripcion")

                .setDescription(
                    "Descripción del embed"
                )
        )

        .addStringOption(option =>

            option

                .setName("placeholder")

                .setDescription(
                    "Texto del menú"
                )
        )

        .addStringOption(option =>

            option

                .setName("color")

                .setDescription(
                    "Color HEX del embed"
                )
        )

        //////////////////////////////////////////////////
        // IMÁGENES
        //////////////////////////////////////////////////

        .addAttachmentOption(option =>

            option

                .setName("imagen")

                .setDescription(
                    "Imagen principal del embed"
                )
        )

        .addAttachmentOption(option =>

            option

                .setName("thumbnail")

                .setDescription(
                    "Thumbnail del embed"
                )
        );

//////////////////////////////////////////////////
// 18 ROLES
//////////////////////////////////////////////////

for (let i = 1; i <= 18; i++) {

    data.addRoleOption(option =>

        option

            .setName(`role${i}`)

            .setDescription(
                `Rol ${i}`
            )
    );
}

//////////////////////////////////////////////////

module.exports = {

    data,

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // PANEL ID
        //////////////////////////////////////////////////

        const panelId =
            interaction.options.getString(
                "panelid"
            );

        //////////////////////////////////////////////////
        // VALIDAR PANEL
        //////////////////////////////////////////////////

        const existingPanel =
            await reactionRolesSchema.findOne({

                guildId:
                    interaction.guild.id,

                panelId
            });

        //////////////////////////////////////////////////

        if (existingPanel) {

            return interaction.reply({

                content:
                    "❌ Ya existe un panel con ese ID.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // PERSONALIZACIÓN
        //////////////////////////////////////////////////

        const title =
            interaction.options.getString(
                "titulo"
            ) ||

            "✨ Reaction Roles";

        //////////////////////////////////////////////////

        const description =
            interaction.options

                .getString("descripcion")

                ?.replace(/\\n/g, "\n")

            ||

            "Selecciona los roles que deseas obtener.";

        //////////////////////////////////////////////////

        const placeholder =
            interaction.options.getString(
                "placeholder"
            ) ||

            "✨ Selecciona tus roles";

        //////////////////////////////////////////////////

        const color =
            interaction.options.getString(
                "color"
            ) ||

            "#8A2BE2";

        //////////////////////////////////////////////////
        // IMÁGENES
        //////////////////////////////////////////////////

        const imagen =
            interaction.options.getAttachment(
                "imagen"
            );

        //////////////////////////////////////////////////

        const thumbnail =
            interaction.options.getAttachment(
                "thumbnail"
            );

        //////////////////////////////////////////////////
        // VALIDAR IMÁGENES
        //////////////////////////////////////////////////

        if (
            imagen &&
            !imagen.contentType?.startsWith(
                "image"
            )
        ) {

            return interaction.reply({

                content:
                    "❌ El archivo imagen debe ser una imagen.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////

        if (
            thumbnail &&
            !thumbnail.contentType?.startsWith(
                "image"
            )
        ) {

            return interaction.reply({

                content:
                    "❌ El thumbnail debe ser una imagen.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////

        const imageURL =
            imagen?.url || null;

        //////////////////////////////////////////////////

        const thumbnailURL =
            thumbnail?.url || null;

        //////////////////////////////////////////////////
        // ROLES
        //////////////////////////////////////////////////

        const roles = [];

        //////////////////////////////////////////////////

        for (let i = 1; i <= 18; i++) {

            const role =
                interaction.options.getRole(
                    `role${i}`
                );

            //////////////////////////////////////////////////

            if (role) {

                roles.push(role);
            }
        }

        //////////////////////////////////////////////////
        // VALIDAR
        //////////////////////////////////////////////////

        if (roles.length < 2) {

            return interaction.reply({

                content:
                    "❌ Debes añadir mínimo 2 roles.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // CUSTOM ID
        //////////////////////////////////////////////////

        const customId =
            `rr_${Date.now()}`;

        //////////////////////////////////////////////////
        // MENU
        //////////////////////////////////////////////////

        const menu =
            new StringSelectMenuBuilder()

                .setCustomId(customId)

                .setPlaceholder(
                    placeholder
                )

                .setMinValues(0)

                .setMaxValues(1)

                .addOptions(

                    roles.map(role => {
                        const visual = getRoleVisual(role.name);
                        return {
                            label: visual.label.slice(0, 100),
                            value: role.id,
                            emoji: visual.emoji,
                            description: `Obtener el rol ${visual.label}`.slice(0, 100)
                        };
                    })
                );

        //////////////////////////////////////////////////
        // ROW
        //////////////////////////////////////////////////

        const row =
            new ActionRowBuilder()

                .addComponents(menu);

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const rolesList =
            roles.map(role => {
                const visual = getRoleVisual(role.name);
                return `${visual.emoji} · ${role}  **${visual.label.replace(/^[A-Z]{2} · /, "")}**`;
            }).join("\n");

        const panelDescription =
            `${description}\n\n` +
            `${rolesList}\n\n` +
            `Selecciona del menú siguiente para gestionar tus roles en · **${title}**`;

        const embed =
            new EmbedBuilder()

                .setColor(color)

                .setTitle(title)

                .setDescription(panelDescription);

        if (imageURL) {
            embed.setImage(imageURL);
        }

        //////////////////////////////////////////////////
        // SEND
        //////////////////////////////////////////////////

        const msg =
            await interaction.channel.send({

                embeds: [embed],

                components: [row]
            });

        //////////////////////////////////////////////////
        // SAVE DB
        //////////////////////////////////////////////////

        await reactionRolesSchema.create({

            guildId:
                interaction.guild.id,

            panelId,

            channelId:
                interaction.channel.id,

            messageId:
                msg.id,

            customId,

            title,

            description,

            placeholder,

            color,

            image:
                imageURL,

            thumbnail:
                thumbnailURL,

            roles: roles.map(role => ({

                roleId:
                    role.id,

                label:
                    role.name
            }))
        });

        //////////////////////////////////////////////////

        await interaction.reply({

            content:
                `✅ Panel \`${panelId}\` creado correctamente.`,

            flags: 64
        });
    }
};