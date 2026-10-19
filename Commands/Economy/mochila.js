const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require("discord.js");
const EconomyUser = require("../../Models/EconomyUser");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mochila")
        .setDescription("Consulta los artículos y roles que has comprado"),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const economy = await EconomyUser.findOne({ guildId: interaction.guild.id, userId: interaction.user.id }).lean();
        const inventory = Array.isArray(economy?.inventory) ? economy.inventory.filter(item => Number(item.quantity || 0) > 0) : [];
        const container = new ContainerBuilder().setAccentColor(0x8A2BE2);
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent("## 🎒 Tu mochila"));
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        if (!inventory.length) {
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent("Todavía no has comprado artículos ni roles en la tienda del servidor.\n\nUsa /shop view para ver lo que está a la venta."));
        } else {
            const lines = inventory.slice(0, 25).map(item => {
                const type = item.type === "role" ? "Rol adquirido" : "Artículo";
                const quantity = Math.max(0, Number(item.quantity || 0));
                return (item.emoji || (item.type === "role" ? "🎭" : "📦")) + " **" + (item.name || item.itemId || "Artículo") + "** ×" + quantity.toLocaleString() + "\n> " + type + " · Precio unitario: " + Math.max(0, Number(item.unitPrice || 0)).toLocaleString() + " monedas";
            });
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n\n") + (inventory.length > 25 ? "\n\n_Muestra limitada a 25 tipos de compra._" : "")));
        }
        return interaction.editReply({ flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, components: [container] });
    }
};
