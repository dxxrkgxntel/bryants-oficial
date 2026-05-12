const {

    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ChannelType

} = require("discord.js");

const reactionRolesSchema =
    require("../../Models/reactionRolesSchema");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("rr-send")

            .setDescription(
                "Reenviar un panel de reaction roles"
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
                        "ID del panel"
                    )

                    .setRequired(true)
            )

            //////////////////////////////////////////////////
            // CHANNEL
            //////////////////////////////////////////////////

            .addChannelOption(option =>

                option

                    .setName("channel")

                    .setDescription(
                        "Canal donde enviar el panel"
                    )

                    .addChannelTypes(
                        ChannelType.GuildText
                    )

                    .setRequired(false)
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // DATA
        //////////////////////////////////////////////////

        const panelId =
            interaction.options.getString(
                "panelid"
            );

        //////////////////////////////////////////////////

        const channel =
            interaction.options.getChannel(
                "channel"
            ) ||

            interaction.channel;

        //////////////////////////////////////////////////
        // BUSCAR PANEL
        //////////////////////////////////////////////////

        const data =
            await reactionRolesSchema.findOne({

                guildId:
                    interaction.guild.id,

                panelId
            });

        //////////////////////////////////////////////////

        if (!data) {

            return interaction.reply({

                content:
                    "❌ No encontré ese panel.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // MENU
        //////////////////////////////////////////////////

        const menu =
            new StringSelectMenuBuilder()

                .setCustomId(
                    data.customId
                )

                .setPlaceholder(
                    data.placeholder
                )

                .setMinValues(0)

                .setMaxValues(1)

                .addOptions(

                    data.roles.map(role => ({

                        label:
                            role.label,

                        value:
                            role.roleId,

                        description:
                            role.description ||

                            `Obtener ${role.label}`
                    }))
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

        const embed =
            new EmbedBuilder()

                .setColor(
                    data.color
                )

                .setTitle(
                    data.title
                )

                .setDescription(
                    data.description
                )

        //////////////////////////////////////////////////
        // SEND
        //////////////////////////////////////////////////

        const msg =
            await channel.send({

                embeds: [embed],

                components: [row]
            });

        //////////////////////////////////////////////////
        // UPDATE MESSAGE
        //////////////////////////////////////////////////

        data.messageId =
            msg.id;

        data.channelId =
            channel.id;

        //////////////////////////////////////////////////

        await data.save();

        //////////////////////////////////////////////////

        await interaction.reply({

            content:
                `✅ Panel \`${panelId}\` enviado correctamente.`,

            flags: 64
        });
    }
};