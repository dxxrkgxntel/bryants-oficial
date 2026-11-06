const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require("discord.js");
const CommunityPanel = require("../../Models/CommunityPanel");
const { buildCommunityPanelPayload } = require("../../Functions/communityPanelMessage");

const validId = /^[a-z0-9_-]{1,40}$/;
const hidden = MessageFlags.Ephemeral;
const findPanel = (guildId, panelId) => CommunityPanel.findOne({ guildId, panelId: String(panelId || "").toLowerCase() });
const respond = (interaction, content, extra = {}) => {
    const payload = { content, flags: hidden, ...extra };
    return interaction.deferred || interaction.replied ? interaction.followUp(payload) : interaction.reply(payload);
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("community-panel")
        .setDescription("Crea y administra paneles de comunidad de Bryvex Bot")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false)
        .addSubcommand(s => s.setName("create").setDescription("Crea o actualiza un panel")
            .addStringOption(o => o.setName("id").setDescription("ID único del panel").setMaxLength(40).setRequired(true))
            .addStringOption(o => o.setName("nombre").setDescription("Nombre interno").setMaxLength(80).setRequired(true))
            .addStringOption(o => o.setName("tipo").setDescription("Tipo de panel").setRequired(true).addChoices({name:"Autoroles voluntarios",value:"self_roles"},{name:"Verificación",value:"verification"}))
            .addChannelOption(o => o.setName("canal").setDescription("Canal de publicación").addChannelTypes(ChannelType.GuildText,ChannelType.GuildAnnouncement).setRequired(true))
            .addStringOption(o => o.setName("formato").setDescription("Formato visual").setRequired(true).addChoices({name:"Texto",value:"text"},{name:"Embed",value:"embed"},{name:"Components V2",value:"components_v2"}))
            .addStringOption(o => o.setName("titulo").setDescription("Título").setMaxLength(256))
            .addStringOption(o => o.setName("descripcion").setDescription("Descripción").setMaxLength(4000))
            .addStringOption(o => o.setName("texto").setDescription("Texto adicional").setMaxLength(2000))
            .addStringOption(o => o.setName("color").setDescription("Color hexadecimal #8A2BE2").setMaxLength(7))
            .addRoleOption(o => o.setName("rol").setDescription("Rol asignado; obligatorio para verificación")))
        .addSubcommand(s => s.setName("add-role").setDescription("Añade una opción de rol")
            .addStringOption(o => o.setName("id").setDescription("ID del panel").setRequired(true))
            .addRoleOption(o => o.setName("rol").setDescription("Rol reclamable").setRequired(true))
            .addStringOption(o => o.setName("etiqueta").setDescription("Texto del botón").setMaxLength(80).setRequired(true))
            .addStringOption(o => o.setName("descripcion").setDescription("Descripción").setMaxLength(100))
            .addStringOption(o => o.setName("emoji").setDescription("Emoji opcional").setMaxLength(100)))
        .addSubcommand(s => s.setName("publish").setDescription("Publica o actualiza un panel").addStringOption(o => o.setName("id").setDescription("ID del panel").setRequired(true)))
        .addSubcommand(s => s.setName("preview").setDescription("Previsualiza un panel").addStringOption(o => o.setName("id").setDescription("ID del panel").setRequired(true)))
        .addSubcommand(s => s.setName("list").setDescription("Lista los paneles configurados"))
        .addSubcommand(s => s.setName("delete").setDescription("Elimina un panel").addStringOption(o => o.setName("id").setDescription("ID del panel").setRequired(true))),

    async execute(interaction) {
        if (!interaction.guild || !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return respond(interaction, "Necesitas permisos de administrador para gestionar paneles.");
        }
        const action = interaction.options.getSubcommand();

        if (action === "create") {
            const panelId = interaction.options.getString("id").toLowerCase().trim();
            if (!validId.test(panelId)) return respond(interaction, "El ID solo admite letras minúsculas, números, guiones y guiones bajos (máximo 40 caracteres).");
            const kind = interaction.options.getString("tipo");
            const role = interaction.options.getRole("rol");
            if (kind === "verification" && !role) return respond(interaction, "Selecciona el rol que recibirá el miembro al completar la verificación.");
            if (role && (role.id === interaction.guildId || role.managed || role.position >= interaction.guild.members.me.roles.highest.position)) {
                return respond(interaction, "Ese rol no se puede asignar. Comprueba la jerarquía del bot.");
            }
            const panel = await CommunityPanel.findOneAndUpdate(
                { guildId: interaction.guildId, panelId },
                { $set: {
                    name: interaction.options.getString("nombre"), kind, enabled: true,
                    channelId: interaction.options.getChannel("canal").id,
                    messageType: interaction.options.getString("formato"),
                    title: interaction.options.getString("titulo") || "",
                    description: interaction.options.getString("descripcion") || "",
                    content: interaction.options.getString("texto") || "",
                    color: interaction.options.getString("color") || "#8A2BE2",
                    verificationRoleId: kind === "verification" ? role.id : null
                }, $setOnInsert: { guildId: interaction.guildId, panelId } },
                { new: true, upsert: true, runValidators: true }
            );
            const note = kind === "self_roles"
                ? " Añade opciones con /community-panel add-role y después publícalo."
                : " En esta primera versión, el botón asigna directamente el rol configurado.";
            return respond(interaction, "Panel " + panel.name + " guardado. Usa /community-panel publish id:" + panelId + "." + note);
        }

        if (action === "add-role") {
            const panel = await findPanel(interaction.guildId, interaction.options.getString("id"));
            if (!panel || panel.kind !== "self_roles") return respond(interaction, "No existe un panel de autoroles con ese ID. Créalo primero.");
            const role = interaction.options.getRole("rol");
            if (role.id === interaction.guildId || role.managed || role.position >= interaction.guild.members.me.roles.highest.position) {
                return respond(interaction, "Ese rol no se puede asignar. Revisa la jerarquía del bot.");
            }
            const roles = (panel.roles || []).filter(item => item.roleId !== role.id);
            if (roles.length >= 25) return respond(interaction, "El panel admite un máximo de 25 roles.");
            roles.push({ roleId: role.id, label: interaction.options.getString("etiqueta"), description: interaction.options.getString("descripcion") || "", emoji: interaction.options.getString("emoji") || "" });
            panel.roles = roles;
            await panel.save();
            return respond(interaction, "Añadí " + role.name + " al panel " + panel.name + ". Vuelve a publicarlo para actualizarlo.");
        }

        if (action === "list") {
            const panels = await CommunityPanel.find({ guildId: interaction.guildId }).sort({ createdAt: -1 }).lean();
            if (!panels.length) return respond(interaction, "Todavía no hay paneles. Empieza con /community-panel create.");
            return respond(interaction, panels.map(p => "• " + p.name + " — " + p.panelId + " · " + (p.kind === "verification" ? "Verificación" : "Autoroles") + " · " + (p.enabled ? "Activo" : "Desactivado")).join("\n").slice(0,1900));
        }

        if (action === "delete") {
            const panel = await findPanel(interaction.guildId, interaction.options.getString("id"));
            if (!panel) return respond(interaction, "No existe un panel con ese ID.");
            await CommunityPanel.deleteOne({ _id: panel._id });
            return respond(interaction, "El panel " + panel.name + " fue eliminado. Los botones antiguos dejarán de funcionar.");
        }

        const panelId = interaction.options.getString("id").toLowerCase().trim();
        const panel = await findPanel(interaction.guildId, panelId);
        if (!panel) return respond(interaction, "No existe ese panel. Usa /community-panel list para consultar los disponibles.");
        const payload = buildCommunityPanelPayload(panel, interaction.guild);
        if (action === "preview") return interaction.reply({ ...payload, flags: hidden });

        if (action === "publish") {
            await interaction.deferReply({ flags: hidden });
            const channel = await interaction.guild.channels.fetch(panel.channelId).catch(() => null);
            if (!channel?.isTextBased() || !channel.send) return interaction.editReply("El canal guardado ya no existe o no admite mensajes.");
            let message = panel.messageId ? await channel.messages.fetch(panel.messageId).catch(() => null) : null;
            if (message) await message.edit(payload);
            else message = await channel.send(payload);
            panel.messageId = message.id;
            await panel.save();
            return interaction.editReply("Panel " + panel.name + " publicado correctamente en <#" + channel.id + ">.");
        }
    }
};
