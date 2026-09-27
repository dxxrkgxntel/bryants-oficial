const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const getUser =
    require("../../utils/getUser");

const GlobalBank =
    require("../../Models/GlobalBank");

const BankDonorRole =
    require("../../Models/BankDonorRoles");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("donar-banco")

            .setDescription(
                "Dona dinero al banco global"
            )

            .addIntegerOption(option =>

                option

                    .setName("cantidad")

                    .setDescription(
                        "Cantidad a donar"
                    )

                    .setRequired(true)

                    .setMinValue(1)
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // AMOUNT
        //////////////////////////////////////////////////

        const amount =
            interaction.options.getInteger(
                "cantidad"
            );

        //////////////////////////////////////////////////
        // USER
        //////////////////////////////////////////////////

        const userData =

            await getUser(

                interaction.guild.id,
                interaction.user.id
            );

        //////////////////////////////////////////////////
        // DINERO TOTAL
        //////////////////////////////////////////////////

        const totalMoney =

            userData.wallet +
            userData.bank;

        //////////////////////////////////////////////////
        // VALIDAR
        //////////////////////////////////////////////////

        if (
            totalMoney < amount
        ) {

            return interaction.reply({

                content:
                    "❌ No tienes suficiente dinero para donar esa cantidad.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // RESTAR WALLET PRIMERO
        //////////////////////////////////////////////////

        if (
            userData.wallet >= amount
        ) {

            userData.wallet -= amount;

        } else {

            //////////////////////////////////////////////////
            // RESTANTE
            //////////////////////////////////////////////////

            const remaining =

                amount -
                userData.wallet;

            //////////////////////////////////////////////////

            userData.wallet = 0;

            userData.bank -= remaining;
        }

        //////////////////////////////////////////////////
        // GLOBAL BANK
        //////////////////////////////////////////////////

        let globalBank =
            await GlobalBank.findOne();

        //////////////////////////////////////////////////

        if (!globalBank) {

            globalBank =
                new GlobalBank({

                    balance: 0
                });
        }

        //////////////////////////////////////////////////
        // AÑADIR DINERO
        //////////////////////////////////////////////////

        globalBank.balance += amount;

        //////////////////////////////////////////////////
        // DONACIONES TOTALES
        //////////////////////////////////////////////////

        userData.bankDonated += amount;

        //////////////////////////////////////////////////
        // SAVE
        //////////////////////////////////////////////////

        await userData.save();

        await globalBank.save();

        //////////////////////////////////////////////////
        // ROLES
        //////////////////////////////////////////////////

        const donorRoles =
            await BankDonorRole.find({

                guildId:
                    interaction.guild.id
            });

        //////////////////////////////////////////////////

        const unlockedRoles = [];

        //////////////////////////////////////////////////

        for (const data of donorRoles) {

            //////////////////////////////////////////////////
            // VALIDAR CANTIDAD
            //////////////////////////////////////////////////

            if (
                userData.bankDonated <
                data.requiredAmount
            ) continue;

            //////////////////////////////////////////////////
            // ROLE
            //////////////////////////////////////////////////

            const role =
                interaction.guild.roles.cache.get(
                    data.roleId
                );

            //////////////////////////////////////////////////

            if (!role)
                continue;

            //////////////////////////////////////////////////
            // MEMBER
            //////////////////////////////////////////////////

            const member =
                interaction.member;

            //////////////////////////////////////////////////
            // SI NO LO TIENE
            //////////////////////////////////////////////////

            if (

                !member.roles.cache.has(
                    role.id
                )

            ) {

                //////////////////////////////////////////////////

                await member.roles

                    .add(role)

                    .catch(() => null);

                //////////////////////////////////////////////////

                unlockedRoles.push(
                    role.toString()
                );
            }
        }

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#00ff99")

                .setTitle(
                    "🏦 Donación realizada"
                )

                .setDescription(

                    `💸 Has donado ` +

                    `**${amount.toLocaleString()} monedas** al banco global.\n\n` +

                    `🏦 Banco global actual:\n` +

                    `**${globalBank.balance.toLocaleString()} monedas**\n\n` +

                    `📈 Total donado:\n` +

                    `**${userData.bankDonated.toLocaleString()} monedas**`
                )

                //////////////////////////////////////////////////
                // THUMBNAIL
                //////////////////////////////////////////////////

                .setThumbnail(

                    interaction.user.displayAvatarURL({

                        dynamic: true
                    })
                )

                //////////////////////////////////////////////////
                // IMAGE
                //////////////////////////////////////////////////

                .setImage(
                    "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png"
                )

                //////////////////////////////////////////////////

                .setFooter({

                    text:
                        interaction.guild.name
                })

                .setTimestamp();

        //////////////////////////////////////////////////
        // ROLES DESBLOQUEADOS
        //////////////////////////////////////////////////

        if (
            unlockedRoles.length
        ) {

            embed.addFields({

                name:
                    "🎉 Roles desbloqueados",

                value:
                    unlockedRoles.join("\n"),

                inline: false
            });
        }

        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed]
        });
    }
};