const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");
const tempVoiceSchema = require("../../Models/tempVoiceSchema");

module.exports = {
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply("❌ Solo los administradores pueden configurar TempVoice.");
        }

        const botMember = interaction.guild.members.me;
        if (!botMember?.permissions.has([
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.ViewChannel
        ])) {
            return interaction.editReply("❌ Necesito permisos de `Administrar Canales`, `Mover Miembros` y `Ver Canales` para configurar TempVoice.");
        }

        const selectedCategory = interaction.options.getChannel("categoria");
        if (selectedCategory && selectedCategory.type !== ChannelType.GuildCategory) {
            return interaction.editReply("❌ La opción debe ser una categoría del servidor.");
        }

        const setup = await tempVoiceSchema.findOne({ guildId: interaction.guildId });
        const previousSetups = setup?.setups?.length
            ? setup.setups
            : setup?.creatorChannelId
                ? [{
                    categoryId: setup.categoryId,
                    creatorChannelId: setup.creatorChannelId,
                    panelChannelId: setup.panelChannelId,
                    panelMessageId: setup.panelMessageId
                }]
                : [];

        let category = selectedCategory;
        let createdCategory = false;
        let creatorChannel;
        let panelChannel;

        try {
            if (!category) {
                category = await interaction.guild.channels.create({
                    name: "SALAS TEMPORALES",
                    type: ChannelType.GuildCategory
                });
                createdCategory = true;
            }

            const categoryCount = previousSetups.filter(item => item.categoryId === category.id).length;
            const suffix = categoryCount ? ` ${categoryCount + 1}` : "";

            creatorChannel = await interaction.guild.channels.create({
                name: `➕ Crear Sala${suffix}`,
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: [{
                    id: interaction.guild.roles.everyone.id,
                    allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel]
                }]
            });

            panelChannel = await interaction.guild.channels.create({
                name: `🎛️panel-de-voz${suffix}`,
                type: ChannelType.GuildText,
                parent: category.id
            });

            const newSetup = {
                categoryId: category.id,
                creatorChannelId: creatorChannel.id,
                panelChannelId: panelChannel.id,
                panelMessageId: null
            };

            await tempVoiceSchema.findOneAndUpdate(
                { guildId: interaction.guildId },
                {
                    $setOnInsert: {
                        enabled: true,
                        creatorChannelId: creatorChannel.id,
                        categoryId: category.id,
                        panelChannelId: panelChannel.id,
                        panelMessageId: null
                    },
                    $push: { setups: { $each: [...previousSetups, newSetup] } }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            const embed = new EmbedBuilder()
                .setColor("#8A2BE2")
                .setTitle("✅ TempVoice Configurado")
                .setDescription(
                    `Se añadió un conjunto de canales TempVoice.\n\n` +
                    `📂 Categoría: ${category}\n` +
                    `🎤 Canal creador: ${creatorChannel}\n` +
                    `🎛️ Canal del panel: ${panelChannel}\n\n` +
                    `Con /setup tempvoice-panel publicarás o actualizarás los paneles de todos los conjuntos configurados.`
                )
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setFooter({ text: `${interaction.guild.name} • TempVoice` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("[TempVoice Setup] Error al configurar los canales:", error);
            await creatorChannel?.delete("Falló la configuración TempVoice").catch(() => {});
            await panelChannel?.delete("Falló la configuración TempVoice").catch(() => {});
            if (createdCategory) await category?.delete("Falló la configuración TempVoice").catch(() => {});
            return interaction.editReply("❌ Ocurrió un error al configurar los canales TempVoice.");
        }
    }
};
