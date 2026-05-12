const {

    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder

} = require("discord.js");

const reactionRolesSchema =
    require("../../Models/reactionRolesSchema");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("rr-list")

            .setDescription(
                "Ver todos los panels de reaction roles"
            )

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // DATA
        //////////////////////////////////////////////////

        const panels =
            await reactionRolesSchema.find({

                guildId:
                    interaction.guild.id
            });

        //////////////////////////////////////////////////
        // NO PANELS
        //////////////////////////////////////////////////

        if (!panels.length) {

            return interaction.reply({

                content:
                    "❌ No hay panels guardados.",

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
                    "✨ Panels de Reaction Roles"
                )

                .setDescription(

                    panels.map(panel =>

                        `📌 **Panel ID:** \`${panel.panelId}\`\n` +

                        `🎭 Roles: **${panel.roles.length}**\n` +

                        `📍 Canal: <#${panel.channelId}>\n` +

                        `🆔 Message ID: \`${panel.messageId}\`\n`

                    ).join("\n━━━━━━━━━━━━━━\n")
                )

                .setTimestamp();

        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed],

            flags: 64
        });
    }
};