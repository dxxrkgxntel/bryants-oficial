const {

    SlashCommandBuilder,
    EmbedBuilder

} = require("discord.js");

const Economy =
require("../../Models/EconomyUser");

const RobCooldown =
require("../../Models/RobCooldown");

module.exports = {

    data:
    new SlashCommandBuilder()

        .setName("robar")

        .setDescription(
            "Intenta robarle coins a otro usuario."
        )

        .addUserOption(option =>

            option

                .setName("usuario")

                .setDescription(
                    "Usuario a robar"
                )

                .setRequired(true)
        ),

    async execute(interaction) {

        const target =
        interaction.options.getUser(
            "usuario"
        );

        //////////////////////////////////////////////////
        // VALIDACIONES
        //////////////////////////////////////////////////

        if (target.bot) {

            return interaction.reply({

                content:
                "❌ No puedes robar bots.",

                flags: 64

            });

        }

        //////////////////////////////////////////////////

        if (target.id === interaction.user.id) {

            return interaction.reply({

                content:
                "❌ No puedes robarte a ti mismo.",

                flags: 64

            });

        }

        //////////////////////////////////////////////////
        // COOLDOWN
        //////////////////////////////////////////////////

        const cooldown =
        await RobCooldown.findOne({

            guildId:
            interaction.guild.id,

            userId:
            interaction.user.id

        });

        //////////////////////////////////////////////////

        if (

            cooldown &&
            cooldown.expiresAt > new Date()

        ) {

            return interaction.reply({

                content:

`⏳ Ya robaste recientemente.

Vuelve a intentarlo:
<t:${Math.floor(cooldown.expiresAt.getTime() / 1000)}:R>`,

                flags: 64

            });

        }

        //////////////////////////////////////////////////
        // BUSCAR DATOS
        //////////////////////////////////////////////////

        let robberData =
        await Economy.findOne({

            guildId:
            interaction.guild.id,

            userId:
            interaction.user.id

        });

        //////////////////////////////////////////////////

        let targetData =
        await Economy.findOne({

            guildId:
            interaction.guild.id,

            userId:
            target.id

        });

        //////////////////////////////////////////////////
        // CREAR SI NO EXISTEN
        //////////////////////////////////////////////////

        if (!robberData) {

            robberData =
            await Economy.create({

                guildId:
                interaction.guild.id,

                userId:
                interaction.user.id,

                wallet: 0,
                bank: 0

            });

        }

        //////////////////////////////////////////////////

        if (!targetData) {

            targetData =
            await Economy.create({

                guildId:
                interaction.guild.id,

                userId:
                target.id,

                wallet: 0,
                bank: 0

            });

        }

        //////////////////////////////////////////////////
        // ASEGURAR QUE WALLET SEA NUMBER
        //////////////////////////////////////////////////

        robberData.wallet =
        Number(robberData.wallet) || 0;

        //////////////////////////////////////////////////

        targetData.wallet =
        Number(targetData.wallet) || 0;

        //////////////////////////////////////////////////
        // VALIDAR DINERO VICTIMA
        //////////////////////////////////////////////////

        if (targetData.wallet < 5000) {

            return interaction.reply({

                content:
                "❌ Ese usuario tiene muy poco efectivo para robar.",

                flags: 64

            });

        }

        //////////////////////////////////////////////////
        // CHANCE DE EXITO
        //////////////////////////////////////////////////

        const success =
        Math.random() < 0.55;

        //////////////////////////////////////////////////
        // SI FALLA
        //////////////////////////////////////////////////

        if (!success) {

            //////////////////////////////////////////////////
            // MULTA ALEATORIA
            //////////////////////////////////////////////////

            const finePercent =
            Math.random() * (0.05 - 0.01) + 0.01;

            //////////////////////////////////////////////////

            let fine =
            Math.floor(

                robberData.wallet *
                finePercent

            );

            //////////////////////////////////////////////////

            if (fine < 250)
                fine = 250;

            //////////////////////////////////////////////////

            if (fine > robberData.wallet)
                fine = robberData.wallet;

            //////////////////////////////////////////////////

            robberData.wallet -= fine;

            //////////////////////////////////////////////////

            if (robberData.wallet < 0)
                robberData.wallet = 0;

            //////////////////////////////////////////////////

            await robberData.save();

            //////////////////////////////////////////////////
            // COOLDOWN
            //////////////////////////////////////////////////

            await RobCooldown.findOneAndUpdate(

                {

                    guildId:
                    interaction.guild.id,

                    userId:
                    interaction.user.id

                },

                {

                    expiresAt:
                    new Date(
                        Date.now() +
                        30 * 60 * 1000
                    )

                },

                {

                    upsert: true
                }

            );

            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [

                    new EmbedBuilder()

                        .setColor("Red")

                        .setTitle(
                            "🚔 Robo Fallido"
                        )

                        .setDescription(

`Intentaste robar a ${target} pero te atraparon.

💸 Multa:
**${fine.toLocaleString()}** coins`

                        )

                        .setTimestamp()

                ]

            });

        }

        //////////////////////////////////////////////////
        // ROBO EXITOSO
        //////////////////////////////////////////////////

        const percent =
        Math.random() * (0.12 - 0.03) + 0.03;

        //////////////////////////////////////////////////

        let amount =
        Math.floor(

            targetData.wallet *
            percent

        );

        //////////////////////////////////////////////////
        // LIMITES
        //////////////////////////////////////////////////

        if (amount < 250)
            amount = 250;

        //////////////////////////////////////////////////

        if (amount > 50000)
            amount = 50000;

        //////////////////////////////////////////////////

        if (amount > targetData.wallet)
            amount = targetData.wallet;

        //////////////////////////////////////////////////
        // SEGURIDAD EXTRA
        //////////////////////////////////////////////////

        amount =
        Number(amount) || 0;

        //////////////////////////////////////////////////

        if (amount <= 0) {

            return interaction.reply({

                content:
                "❌ No se pudo completar el robo.",

                flags: 64

            });

        }

        //////////////////////////////////////////////////
        // TRANSFERIR DINERO
        //////////////////////////////////////////////////

        targetData.wallet -= amount;

        robberData.wallet += amount;

        //////////////////////////////////////////////////

        if (targetData.wallet < 0)
            targetData.wallet = 0;

        //////////////////////////////////////////////////

        await targetData.save();

        await robberData.save();

        //////////////////////////////////////////////////
        // COOLDOWN
        //////////////////////////////////////////////////

        await RobCooldown.findOneAndUpdate(

            {

                guildId:
                interaction.guild.id,

                userId:
                interaction.user.id

            },

            {

                expiresAt:
                new Date(
                    Date.now() +
                    30 * 60 * 1000
                )

            },

            {

                upsert: true
            }

        );

        //////////////////////////////////////////////////
        // RESPUESTA
        //////////////////////////////////////////////////

        return interaction.reply({

            embeds: [

                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "🦹 Robo Exitoso"
                    )

                    .setDescription(

`Robaste exitosamente a ${target}

💰 Cantidad robada:
**${amount.toLocaleString()}** coins

👛 Dinero restante de la víctima:
**${targetData.wallet.toLocaleString()}** coins`

                    )

                    .setTimestamp()

            ]

        });

    }

};