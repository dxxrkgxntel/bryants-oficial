const {

    SlashCommandBuilder,
    PermissionFlagsBits

} = require("discord.js");

const reactionRolesSchema =
    require("../../Models/reactionRolesSchema");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("rr-delete")

            .setDescription(
                "Eliminar un panel de reaction roles"
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
            ),

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
        // BORRAR MENSAJE
        //////////////////////////////////////////////////

        try {

            const channel =
                interaction.guild.channels.cache.get(
                    data.channelId
                );

            //////////////////////////////////////////////////

            if (channel) {

                const msg =
                    await channel.messages.fetch(
                        data.messageId
                    ).catch(() => null);

                //////////////////////////////////////////////////

                if (msg) {

                    await msg.delete()
                        .catch(() => {});
                }
            }

        } catch {}

        //////////////////////////////////////////////////
        // BORRAR DB
        //////////////////////////////////////////////////

        await reactionRolesSchema.deleteOne({

            guildId:
                interaction.guild.id,

            panelId
        });

        //////////////////////////////////////////////////

        await interaction.reply({

            content:
                `✅ Panel \`${panelId}\` eliminado correctamente.`,

            flags: 64
        });
    }
};