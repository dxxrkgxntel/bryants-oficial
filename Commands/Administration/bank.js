const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    ComponentType,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const BankDonorRole = require("../../Models/BankDonorRoles");

const BANK_BANNER = "https://i.imgur.com/fHtidQP.png";

function bankPanel(title, text, color = 0x8A2BE2, rows = []) {
    const box = new ContainerBuilder()
        .setAccentColor(color)
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(BANK_BANNER)
            )
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## " + title)
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(text)
        );

    if (rows.length) box.addActionRowComponents(...rows);
    return box;
}

function bankReply(interaction, title, text, color = 0x8A2BE2, rows = []) {
    return interaction.editReply({
        components: [bankPanel(title, text, color, rows)],
        flags: MessageFlags.IsComponentsV2
    });
}

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("bank")

            .setDescription(
                "Sistema del banco"
            )

            //////////////////////////////////////////////////
            // ROLE ADD
            //////////////////////////////////////////////////

            .addSubcommandGroup(group =>

                group

                    .setName("role")

                    .setDescription(
                        "Administrar roles de donador"
                    )

                    //////////////////////////////////////////////////
                    // ADD
                    //////////////////////////////////////////////////

                    .addSubcommand(sub =>

                        sub

                            .setName("add")

                            .setDescription(
                                "Añadir rol de donador"
                            )

                            .addRoleOption(option =>

                                option

                                    .setName("rol")

                                    .setDescription(
                                        "Rol a desbloquear"
                                    )

                                    .setRequired(true)

                            )

                            .addIntegerOption(option =>

                                option

                                    .setName("cantidad")

                                    .setDescription(
                                        "Cantidad requerida"
                                    )

                                    .setRequired(true)

                                    .setMinValue(1)

                            )

                    )

                    //////////////////////////////////////////////////
                    // REMOVE
                    //////////////////////////////////////////////////

                    .addSubcommand(sub =>

                        sub

                            .setName("remove")

                            .setDescription(
                                "Eliminar rol de donador"
                            )

                    )

                    //////////////////////////////////////////////////
                    // LIST
                    //////////////////////////////////////////////////

                    .addSubcommand(sub =>

                        sub

                            .setName("list")

                            .setDescription(
                                "Ver roles de donador"
                            )

                    )

            )

            //////////////////////////////////////////////////

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            ),

    //////////////////////////////////////////////////
    // EXECUTE
    //////////////////////////////////////////////////

    async execute(interaction) {

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const group =
        interaction.options.getSubcommandGroup();

        //////////////////////////////////////////////////

        const subcommand =
        interaction.options.getSubcommand();

        //////////////////////////////////////////////////
        // ROLE
        //////////////////////////////////////////////////

        if (group === "role") {

            //////////////////////////////////////////////////
            // ADD
            //////////////////////////////////////////////////

            if (subcommand === "add") {

                const role = interaction.options.getRole("rol");
                const amount = interaction.options.getInteger("cantidad");

                if (role.id === interaction.guild.id) {
                    return bankReply(interaction, "⚠️ Rol inválido", "No puedes configurar **@everyone** como rol de donador.", 0xFFD700);
                }

                if (role.managed) {
                    return bankReply(interaction, "⚠️ Rol inválido", "Los roles administrados por bots o integraciones no pueden configurarse.", 0xFFD700);
                }

                const exists = await BankDonorRole.findOne({
                    guildId: interaction.guild.id,
                    roleId: role.id
                });

                if (exists) {
                    return bankReply(
                        interaction,
                        "⚠️ Rol existente",
                        role + " ya está configurado como rol de donador.\n**Requisito:** " + exists.requiredAmount.toLocaleString() + " monedas.",
                        0xFFD700
                    );
                }

                await BankDonorRole.create({
                    guildId: interaction.guild.id,
                    roleId: role.id,
                    requiredAmount: amount
                });

                return bankReply(
                    interaction,
                    "🏦 Rol de donador añadido",
                    "**Rol:** " + role + "\n**Donación requerida:** " + amount.toLocaleString() + " monedas",
                    0x00FF99
                );
            }

            //////////////////////////////////////////////////
            // REMOVE
            //////////////////////////////////////////////////

            if (subcommand === "remove") {

                const roles = await BankDonorRole.find({ guildId: interaction.guild.id }).sort({ requiredAmount: 1 });

                if (!roles.length) return bankReply(interaction, "🏦 Eliminar rol", "No hay roles de donadores configurados.", 0xFFD700);

                const valid = roles.map(data => ({ data, role: interaction.guild.roles.cache.get(data.roleId) })).filter(entry => entry.role);

                if (!valid.length) {
                    const result = await BankDonorRole.deleteMany({ guildId: interaction.guild.id, roleId: { $in: roles.map(data => data.roleId) } });
                    return bankReply(interaction, "🧹 Registros limpiados", "Se eliminaron **" + result.deletedCount + " registros obsoletos**.", 0xFFD700);
                }

                const customId = "bank_role_remove_" + interaction.id;
                const menu = new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder("Selecciona un rol").addOptions(
                    valid.slice(0, 25).map(entry => ({
                        label: entry.role.name.slice(0, 100),
                        description: ("Requiere " + entry.data.requiredAmount.toLocaleString() + " monedas").slice(0, 100),
                        value: entry.role.id
                    }))
                );
                const row = new ActionRowBuilder().addComponents(menu);
                let text = "Selecciona el rol que deseas eliminar del sistema de donadores.\n\n**Roles disponibles:** " + valid.length;
                if (valid.length > 25) text += "\n⚠️ Se muestran los primeros 25 roles.";
                await bankReply(interaction, "🏦 Eliminar rol de donador", text, 0x8A2BE2, [row]);

                const message = await interaction.fetchReply();
                try {
                    const selected = await message.awaitMessageComponent({
                        componentType: ComponentType.StringSelect,
                        filter: component => component.customId === customId && component.user.id === interaction.user.id,
                        time: 60000
                    });
                    await selected.deferUpdate();
                    const roleId = selected.values[0];
                    const data = await BankDonorRole.findOne({ guildId: interaction.guild.id, roleId });
                    if (!data) return selected.editReply({ components: [bankPanel("⚠️ Rol no encontrado", "Ese rol ya había sido eliminado de la configuración.", 0xFFD700)], flags: MessageFlags.IsComponentsV2 });
                    const role = interaction.guild.roles.cache.get(roleId);
                    await BankDonorRole.deleteOne({ _id: data._id });
                    const roleText = role ? role.toString() : "Rol eliminado de Discord (" + roleId + ")";
                    return selected.editReply({ components: [bankPanel("🗑️ Rol eliminado", roleText + " fue retirado del sistema.\n**Requisito anterior:** " + data.requiredAmount.toLocaleString() + " monedas.", 0x00FF99)], flags: MessageFlags.IsComponentsV2 });
                } catch (error) {
                    if (error && error.code === "InteractionCollectorError") return interaction.editReply({ components: [bankPanel("⌛ Selección expirada", "El menú expiró después de 60 segundos. Ejecuta /bank role remove nuevamente.", 0xFFD700)], flags: MessageFlags.IsComponentsV2 });
                    throw error;
                }
            }
            //////////////////////////////////////////////////
            // LIST
            //////////////////////////////////////////////////

            if (subcommand === "list") {

                const roles = await BankDonorRole.find({
                    guildId: interaction.guild.id
                }).sort({ requiredAmount: 1 });

                if (!roles.length) {
                    return bankReply(interaction, "🏦 Roles de Donadores", "No hay roles de donadores configurados.", 0xFFD700);
                }

                const valid = [];
                let stale = 0;

                for (const data of roles) {
                    const role = interaction.guild.roles.cache.get(data.roleId);
                    if (!role) {
                        stale++;
                        continue;
                    }
                    valid.push(role + " — **" + data.requiredAmount.toLocaleString() + " monedas**");
                }

                let description = valid.length
                    ? valid.join("\n")
                    : "No hay roles válidos actualmente.";

                description += "\n\n**Total:** " + valid.length;

                if (stale) {
                    description += "\n⚠️ **Registros de roles eliminados:** " + stale;
                }

                return bankReply(interaction, "🏦 Roles de Donadores", description, 0x00FF99);
            }

        }

    }

};