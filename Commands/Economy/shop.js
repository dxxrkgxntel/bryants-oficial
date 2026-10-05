const {SlashCommandBuilder}=require("discord.js");
const {runView,runBuy,runAdd,runRemove}=require("../../Utils/shopHandlers");
module.exports={
 data:new SlashCommandBuilder().setName("shop").setDescription("Tienda de roles")
  .addSubcommand(s=>s.setName("view").setDescription("Muestra la tienda de roles"))
  .addSubcommand(s=>s.setName("buy").setDescription("Compra un rol de la tienda"))
  .addSubcommand(s=>s.setName("add").setDescription("Añade un rol a la tienda (Administrador)")
   .addRoleOption(o=>o.setName("rol").setDescription("Rol que se añadirá").setRequired(true))
   .addIntegerOption(o=>o.setName("precio").setDescription("Precio del rol").setRequired(true).setMinValue(1))
   .addStringOption(o=>o.setName("emoji").setDescription("Emoji del rol").setRequired(false))
   .addStringOption(o=>o.setName("descripcion").setDescription("Descripción del rol").setRequired(false)))
  .addSubcommand(s=>s.setName("remove").setDescription("Elimina un rol de la tienda (Administrador)")),
 async execute(i){const s=i.options.getSubcommand();if(s==="view")return runView(i);if(s==="buy")return runBuy(i);if(s==="add")return runAdd(i);if(s==="remove")return runRemove(i);}
};