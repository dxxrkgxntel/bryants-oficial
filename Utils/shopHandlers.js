const {
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder,
    MessageFlags, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    StringSelectMenuBuilder, PermissionFlagsBits
} = require("discord.js");
const ShopItem = require("../Models/ShopItem");
const StoreItem = require("../Models/StoreItem");
const EconomyUser = require("../Models/EconomyUser");
const { trackAchievementProgress } = require("../Functions/achievementTracker");

const BANNER = "https://i.imgur.com/joAe57D.png";
function panel(title, content, row = null, color = 0x8A2BE2) {
    const container = new ContainerBuilder().setAccentColor(color);
    container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(BANNER)));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent("## " + title));
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
    if (row) {
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        container.addActionRowComponents(row);
    }
    return container;
}
function reply(interaction, title, content, color = 0x8A2BE2, ephemeral = false) {
    return interaction.reply({
        components: [panel(title, content, null, color)],
        flags: ephemeral ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral : MessageFlags.IsComponentsV2
    });
}
async function getCatalog(guildId) {
    const [roles, items] = await Promise.all([
        ShopItem.find({ guildId }).lean(),
        StoreItem.find({ guildId, enabled: { $ne: false }, $or: [{ stock: -1 }, { stock: { $gt: 0 } }] }).sort({ name: 1 }).lean()
    ]);
    return { roles, items };
}
async function recordInventoryPurchase(guildId, userId, entry) {
    const updated = await EconomyUser.updateOne(
        { guildId, userId, "inventory.itemId": entry.itemId },
        { $inc: { "inventory.$.quantity": 1 }, $set: { "inventory.$.purchasedAt": new Date(), "inventory.$.unitPrice": entry.unitPrice } }
    );
    if (updated.matchedCount) return;
    await EconomyUser.updateOne(
        { guildId, userId, "inventory.itemId": { $ne: entry.itemId } },
        { $push: { inventory: { ...entry, quantity: 1, purchasedAt: new Date() } } }
    );
}
async function runView(interaction) {
    const { roles, items } = await getCatalog(interaction.guild.id);
    const lines = [];
    for (const item of roles) {
        const role = interaction.guild.roles.cache.get(item.roleId);
        if (role) lines.push("🎭 **" + role.name + "** — " + item.price.toLocaleString() + " monedas" + (item.description ? "\n> " + item.description : ""));
    }
    for (const item of items) {
        const stock = item.stock < 0 ? "Ilimitado" : item.stock + " disponible(s)";
        lines.push((item.emoji || "📦") + " **" + item.name + "** — " + item.price.toLocaleString() + " monedas · " + stock + (item.description ? "\n> " + item.description : ""));
    }
    if (!lines.length) return reply(interaction, "🛒 Tienda del servidor", "La tienda está vacía.", 0xFF0000, true);
    return reply(interaction, "🛒 Tienda del servidor", lines.slice(0, 40).join("\n\n") + (lines.length > 40 ? "\n\n_Muestra limitada a 40 artículos._" : ""));
}
async function runBuy(interaction) {
    const { roles, items } = await getCatalog(interaction.guild.id);
    const roleOptions = roles.map(item => {
        const role = interaction.guild.roles.cache.get(item.roleId);
        return role ? { label: role.name.slice(0, 100), description: (item.price.toLocaleString() + " monedas · Rol").slice(0, 100), value: "role|" + role.id, emoji: item.emoji || "🎭" } : null;
    }).filter(Boolean);
    const itemOptions = items.map(item => ({
        label: item.name.slice(0, 100),
        description: (item.price.toLocaleString() + " monedas · " + (item.stock < 0 ? "Stock ilimitado" : "Stock: " + item.stock)).slice(0, 100),
        value: "item|" + item.itemId,
        emoji: item.emoji || "📦"
    }));
    const options = [...roleOptions, ...itemOptions].slice(0, 25);
    if (!options.length) return reply(interaction, "🛒 Tienda vacía", "No hay roles ni artículos disponibles para comprar.", 0xFF0000, true);

    const economy = await EconomyUser.findOne({ guildId: interaction.guild.id, userId: interaction.user.id });
    const menu = new StringSelectMenuBuilder().setCustomId("shop_select").setPlaceholder("Selecciona un rol o artículo").addOptions(options);
    const response = await interaction.reply({
        components: [panel("🛒 Tienda del servidor", "👛 **Tu cartera:** " + Number(economy?.wallet || 0).toLocaleString() + " monedas\n\nSelecciona lo que quieras comprar.", new ActionRowBuilder().addComponents(menu))],
        flags: MessageFlags.IsComponentsV2,
        withResponse: true
    });
    const message = response.resource?.message || await interaction.fetchReply();
    const collector = message.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async component => {
        if (component.user.id !== interaction.user.id) {
            return component.reply({ content: "❌ Solo quien abrió la tienda puede usarla.", flags: MessageFlags.Ephemeral });
        }
        await component.deferUpdate();

        if (component.isStringSelectMenu()) {
            const [kind, id] = component.values[0].split("|");
            if (kind === "role") {
                const item = await ShopItem.findOne({ guildId: interaction.guild.id, roleId: id });
                const role = item && interaction.guild.roles.cache.get(item.roleId);
                if (!item || !role) return interaction.editReply({ components: [panel("❌ Rol no disponible", "Ese rol ya no está disponible.", null, 0xFF0000)] });
                if (interaction.member.roles.cache.has(role.id)) return interaction.editReply({ components: [panel("ℹ️ Rol ya adquirido", "Ya tienes ese rol. No se realizó ningún cobro.", null, 0xFF0000)] });
                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("buyrole_" + role.id).setLabel("Comprar rol").setEmoji("✅").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("cancel_buy").setLabel("Cancelar").setEmoji("❌").setStyle(ButtonStyle.Secondary)
                );
                return interaction.editReply({ components: [panel("🎭 Confirmar compra", "¿Quieres comprar " + role + "?\n\n" + (item.emoji || "🎭") + " " + item.description + "\n💰 **Precio:** " + item.price.toLocaleString() + " monedas", buttons)] });
            }
            const item = await StoreItem.findOne({ guildId: interaction.guild.id, itemId: id, enabled: { $ne: false } });
            if (!item) return interaction.editReply({ components: [panel("❌ Artículo no disponible", "Este artículo ya no está a la venta.", null, 0xFF0000)] });
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("buyitem_" + item.itemId).setLabel("Comprar artículo").setEmoji("✅").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("cancel_buy").setLabel("Cancelar").setEmoji("❌").setStyle(ButtonStyle.Secondary)
            );
            const stock = item.stock < 0 ? "Ilimitado" : String(item.stock);
            return interaction.editReply({ components: [panel("📦 Confirmar compra", (item.emoji || "📦") + " **" + item.name + "**\n" + (item.description || "Artículo de la tienda del servidor") + "\n\n💰 **Precio:** " + item.price.toLocaleString() + " monedas\n📦 **Existencias:** " + stock, buttons)] });
        }

        if (component.customId === "cancel_buy") {
            collector.stop("cancelled");
            return interaction.editReply({ components: [panel("❌ Compra cancelada", "No se realizó ningún cobro.", null, 0xFF0000)] });
        }

        if (component.customId.startsWith("buyrole_")) {
            const roleId = component.customId.slice("buyrole_".length);
            const item = await ShopItem.findOne({ guildId: interaction.guild.id, roleId });
            const role = item && interaction.guild.roles.cache.get(roleId);
            if (!item || !role) {
                collector.stop("missing-role");
                return interaction.editReply({ components: [panel("❌ Rol no disponible", "Ese rol ya no está disponible.", null, 0xFF0000)] });
            }
            const member = await interaction.guild.members.fetch(interaction.user.id);
            if (member.roles.cache.has(roleId)) {
                collector.stop("owned");
                return interaction.editReply({ components: [panel("ℹ️ Rol ya adquirido", "Ya tienes ese rol. No se realizó ningún cobro.", null, 0xFF0000)] });
            }
            const fresh = await EconomyUser.findOneAndUpdate(
                { guildId: interaction.guild.id, userId: interaction.user.id, wallet: { $gte: item.price } },
                { $inc: { wallet: -item.price } },
                { new: true }
            );
            if (!fresh) {
                collector.stop("funds");
                return interaction.editReply({ components: [panel("❌ Fondos insuficientes", "No tienes suficientes monedas en la cartera.", null, 0xFF0000)] });
            }
            try {
                await member.roles.add(role);
                await recordInventoryPurchase(interaction.guild.id, interaction.user.id, {
                    itemId: "role:" + roleId, name: role.name, description: item.description || "Rol comprado en la tienda",
                    emoji: item.emoji || "🎭", type: "role", unitPrice: item.price, roleId
                });
            } catch (error) {
                await EconomyUser.updateOne({ guildId: interaction.guild.id, userId: interaction.user.id }, { $inc: { wallet: item.price } });
                await member.roles.remove(roleId).catch(() => {});
                collector.stop("role-error");
                return interaction.editReply({ components: [panel("❌ Compra revertida", "No se pudo entregar o registrar el rol. Tus monedas fueron devueltas.", null, 0xFF0000)] });
            }
            await trackAchievementProgress(interaction.guild, interaction.user, "itemsPurchased", 1).catch(error => console.warn("[Achievements] No se pudo registrar compra:", error.message));
            collector.stop("bought-role");
            return interaction.editReply({ components: [panel("✅ Compra completada", "Has comprado el rol " + role + ".\n\n💰 **Precio:** " + item.price.toLocaleString() + " monedas\n👛 **Cartera restante:** " + fresh.wallet.toLocaleString() + " monedas\n📦 El rol quedó registrado en tu mochila.", null, 0x00FF99)] });
        }

        if (component.customId.startsWith("buyitem_")) {
            const itemId = component.customId.slice("buyitem_".length);
            const item = await StoreItem.findOne({ guildId: interaction.guild.id, itemId, enabled: { $ne: false } });
            if (!item) {
                collector.stop("missing-item");
                return interaction.editReply({ components: [panel("❌ Artículo no disponible", "Ese artículo ya no está a la venta.", null, 0xFF0000)] });
            }
            const current = await EconomyUser.findOne({ guildId: interaction.guild.id, userId: interaction.user.id }).lean();
            const owned = current?.inventory?.find(entry => entry.itemId === item.itemId)?.quantity || 0;
            if (item.maxPerUser > 0 && owned >= item.maxPerUser) {
                collector.stop("limit");
                return interaction.editReply({ components: [panel("📦 Límite alcanzado", "Ya tienes el máximo permitido de este artículo (" + item.maxPerUser + ").", null, 0xFF0000)] });
            }
            const fresh = await EconomyUser.findOneAndUpdate(
                { guildId: interaction.guild.id, userId: interaction.user.id, wallet: { $gte: item.price } },
                { $inc: { wallet: -item.price } },
                { new: true }
            );
            if (!fresh) {
                collector.stop("funds");
                return interaction.editReply({ components: [panel("❌ Fondos insuficientes", "No tienes suficientes monedas en la cartera.", null, 0xFF0000)] });
            }
            let reserved = false;
            try {
                if (item.stock >= 0) {
                    const stockUpdate = await StoreItem.findOneAndUpdate(
                        { _id: item._id, guildId: interaction.guild.id, stock: { $gt: 0 }, enabled: { $ne: false } },
                        { $inc: { stock: -1 } },
                        { new: true }
                    );
                    if (!stockUpdate) throw new Error("OUT_OF_STOCK");
                    reserved = true;
                }
                await recordInventoryPurchase(interaction.guild.id, interaction.user.id, {
                    itemId: item.itemId, name: item.name, description: item.description || "",
                    emoji: item.emoji || "📦", type: "item", unitPrice: item.price
                });
            } catch (error) {
                await EconomyUser.updateOne({ guildId: interaction.guild.id, userId: interaction.user.id }, { $inc: { wallet: item.price } });
                if (reserved) await StoreItem.updateOne({ _id: item._id }, { $inc: { stock: 1 } });
                collector.stop("purchase-error");
                const messageText = error.message === "OUT_OF_STOCK" ? "Se agotaron las existencias antes de confirmar la compra. No se te cobró." : "No se pudo registrar la compra. Tus monedas fueron devueltas.";
                return interaction.editReply({ components: [panel("❌ Compra no completada", messageText, null, 0xFF0000)] });
            }
            await trackAchievementProgress(interaction.guild, interaction.user, "itemsPurchased", 1).catch(error => console.warn("[Achievements] No se pudo registrar compra:", error.message));
            collector.stop("bought-item");
            return interaction.editReply({ components: [panel("✅ Compra completada", (item.emoji || "📦") + " Has comprado **" + item.name + "**.\n\n💰 **Precio:** " + item.price.toLocaleString() + " monedas\n👛 **Cartera restante:** " + fresh.wallet.toLocaleString() + " monedas\n📦 Añadido a tu mochila.", null, 0x00FF99)] });
        }
    });
    collector.on("end", async (_, reason) => {
        if (reason === "time") await interaction.editReply({ components: [panel("⌛ Tienda cerrada", "La sesión de compra expiró.", null, 0xFF0000)] }).catch(() => {});
    });
}

async function runAdd(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return reply(interaction, "❌ Sin permisos", "Necesitas permisos de **Administrador**.", 0xFF0000, true);
    const role = interaction.options.getRole("rol");
    const price = interaction.options.getInteger("precio");
    const emoji = interaction.options.getString("emoji") || "🛒";
    const description = interaction.options.getString("descripcion") || "Rol exclusivo";
    if (role.managed || role.id === interaction.guild.id) return reply(interaction, "❌ Rol no válido", "No puedes vender un rol administrado por una integración o @everyone.", 0xFF0000, true);
    if (role.position >= (interaction.guild.members.me?.roles.highest?.position ?? 0)) return reply(interaction, "❌ Jerarquía de roles", "Sube el rol de Bryvex Bot por encima del rol que quieres vender.", 0xFF0000, true);
    if (await ShopItem.findOne({ guildId: interaction.guild.id, roleId: role.id })) return reply(interaction, "❌ Rol duplicado", "Ese rol ya está en la tienda.", 0xFF0000, true);

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("shopadd_confirm").setLabel("Confirmar").setEmoji("✅").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("shopadd_cancel").setLabel("Cancelar").setEmoji("❌").setStyle(ButtonStyle.Secondary)
    );
    await interaction.reply({ components: [panel("🛒 Confirmar rol", "¿Deseas añadir " + role + " a la tienda?\n\n" + emoji + " **Emoji:** " + emoji + "\n📝 **Descripción:** " + description + "\n💰 **Precio:** " + price.toLocaleString() + " monedas", buttons)], flags: MessageFlags.IsComponentsV2, withResponse: true });
    const message = await interaction.fetchReply();
    const collector = message.createMessageComponentCollector({ time: 30000 });
    collector.on("collect", async component => {
        if (component.user.id !== interaction.user.id) return component.reply({ content: "❌ No puedes usar estos botones.", flags: MessageFlags.Ephemeral });
        await component.deferUpdate();
        if (component.customId === "shopadd_cancel") {
            collector.stop("cancelled");
            return interaction.editReply({ components: [panel("❌ Operación cancelada", "No se realizó ningún cambio.", null, 0xFF0000)] });
        }
        if (await ShopItem.findOne({ guildId: interaction.guild.id, roleId: role.id })) {
            collector.stop("duplicate");
            return interaction.editReply({ components: [panel("❌ Rol duplicado", "Ese rol ya fue añadido.", null, 0xFF0000)] });
        }
        await ShopItem.create({ guildId: interaction.guild.id, roleId: role.id, price, emoji, description });
        collector.stop("added");
        return interaction.editReply({ components: [panel("✅ Rol añadido", role + " fue añadido a la tienda.", null, 0x00FF99)] });
    });
    collector.on("end", async (_, reason) => { if (reason === "time") await interaction.editReply({ components: [panel("⌛ Tiempo agotado", "No confirmaste la operación.", null, 0xFF0000)] }).catch(() => {}); });
}

async function runRemove(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return reply(interaction, "❌ Sin permisos", "Necesitas permisos de **Administrador**.", 0xFF0000, true);
    const items = await ShopItem.find({ guildId: interaction.guild.id });
    const options = items.map(item => {
        const role = interaction.guild.roles.cache.get(item.roleId);
        return role ? { label: role.name.slice(0, 100), description: item.price.toLocaleString() + " monedas", value: role.id, emoji: item.emoji || "🎭" } : null;
    }).filter(Boolean).slice(0, 25);
    if (!options.length) return reply(interaction, "❌ No hay roles", "No existen roles válidos registrados.", 0xFF0000, true);
    const menu = new StringSelectMenuBuilder().setCustomId("shopremove_select").setPlaceholder("Selecciona un rol").addOptions(options);
    await interaction.reply({ components: [panel("🗑️ Eliminar rol", "Selecciona el rol que deseas retirar de la tienda.", new ActionRowBuilder().addComponents(menu))], flags: MessageFlags.IsComponentsV2, withResponse: true });
    const message = await interaction.fetchReply();
    const collector = message.createMessageComponentCollector({ time: 30000 });
    let selectedRoleId = null;
    collector.on("collect", async component => {
        if (component.user.id !== interaction.user.id) return component.reply({ content: "❌ No puedes usar este menú.", flags: MessageFlags.Ephemeral });
        await component.deferUpdate();
        if (component.isStringSelectMenu()) {
            const roleId = component.values[0];
            selectedRoleId = roleId;
            const role = interaction.guild.roles.cache.get(roleId);
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("shopremove_confirm").setLabel("Eliminar").setEmoji("🗑️").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId("shopremove_cancel").setLabel("Cancelar").setStyle(ButtonStyle.Secondary)
            );
            return interaction.editReply({ components: [panel("🗑️ Confirmar eliminación", "¿Eliminar " + (role ? role.toString() : "este rol") + " de la tienda?", buttons)] });
        }
        if (component.customId === "shopremove_cancel") {
            collector.stop("cancelled");
            return interaction.editReply({ components: [panel("❌ Operación cancelada", "No se realizó ningún cambio.", null, 0xFF0000)] });
        }
        if (component.customId === "shopremove_confirm") {
            if (selectedRoleId) await ShopItem.deleteOne({ guildId: interaction.guild.id, roleId: selectedRoleId });
            collector.stop("removed");
            return interaction.editReply({ components: [panel("🗑️ Rol eliminado", "El rol se retiró de la tienda.", null, 0xFF003C)] });
        }
    });
    collector.on("end", async (_, reason) => { if (reason === "time") await interaction.editReply({ components: [panel("⌛ Tiempo agotado", "La operación expiró.", null, 0xFF0000)] }).catch(() => {}); });
}

module.exports = { runView, runBuy, runAdd, runRemove };
