const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require('discord.js');

const correReply =
    require('../../Functions/interactionReply');

const ms =
    require('ms');

//////////////////////////////////////////////////////

module.exports = {

    Cooldown:
        ms("10s"),

    //////////////////////////////////////////////////////

    data:
        new SlashCommandBuilder()

            .setName('crear-embed')

            .setDescription(
                'Crea un embed totalmente a tu gusto'
            )

            //////////////////////////////////////////////////////
            // ADMIN ONLY
            //////////////////////////////////////////////////////

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            )

            //////////////////////////////////////////////////////
            // COLOR
            //////////////////////////////////////////////////////

            .addStringOption(option =>

                option

                    .setName('color')

                    .setDescription(
                        'Elige el color que quieres que tenga tu embed'
                    )

                    .addChoices(

                        {
                            name: 'Default',

                            value: 'Default'
                        },

                        {
                            name: 'White',

                            value: 'White'
                        },

                        {
                            name: 'Aqua',

                            value: 'Aqua'
                        },

                        {
                            name: 'Green',

                            value: 'Green'
                        },

                        {
                            name: 'Blue',

                            value: 'Blue'
                        },

                        {
                            name: 'Yellow',

                            value: 'Yellow'
                        },

                        {
                            name: 'Purple',

                            value: 'Purple'
                        },

                        {
                            name: 'Gold',

                            value: 'Gold'
                        },

                        {
                            name: 'Red',

                            value: 'Red'
                        },

                        {
                            name: 'Grey',

                            value: 'Grey'
                        },

                        {
                            name: 'Navy',

                            value: 'Navy'
                        },

                        {
                            name: 'Random',

                            value: 'Random'
                        }
                    )
            )

            //////////////////////////////////////////////////////
            // TITLE
            //////////////////////////////////////////////////////

            .addStringOption(option =>

                option

                    .setName('title')

                    .setDescription(
                        'Escribe el título de tu embed'
                    )
            )

            //////////////////////////////////////////////////////
            // DESCRIPTION
            //////////////////////////////////////////////////////

            .addStringOption(option =>

                option

                    .setName('description')

                    .setDescription(
                        'Ingresa la descripción de tu embed'
                    )
            )

            //////////////////////////////////////////////////////
            // THUMBNAIL
            //////////////////////////////////////////////////////

            .addAttachmentOption(option =>

                option

                    .setName('thumbnail')

                    .setDescription(
                        'Elige el Thumbnail de tu embed'
                    )
            )

            //////////////////////////////////////////////////////
            // IMAGE
            //////////////////////////////////////////////////////

            .addAttachmentOption(option =>

                option

                    .setName('image')

                    .setDescription(
                        'Elige la imagen de tu embed'
                    )
            )

            //////////////////////////////////////////////////////
            // URL
            //////////////////////////////////////////////////////

            .addStringOption(option =>

                option

                    .setName('url')

                    .setDescription(
                        'Ingresa el link para el título'
                    )
            )

            //////////////////////////////////////////////////////
            // AUTHOR
            //////////////////////////////////////////////////////

            .addStringOption(option =>

                option

                    .setName('author')

                    .setDescription(
                        'Elige el autor'
                    )
            )

            //////////////////////////////////////////////////////
            // TIMESTAMP
            //////////////////////////////////////////////////////

            .addStringOption(option =>

                option

                    .setName('timestamp')

                    .setDescription(
                        'Quieres que salga el timestamp'
                    )

                    .addChoices(

                        {
                            name: 'Sí',

                            value: 'si'
                        },

                        {
                            name: 'No',

                            value: 'no'
                        }
                    )
            )

            //////////////////////////////////////////////////////
            // FOOTER
            //////////////////////////////////////////////////////

            .addStringOption(option =>

                option

                    .setName('footer')

                    .setDescription(
                        'Ingresa el footer de tu embed'
                    )
            ),

    //////////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////////
        // ADMIN CHECK
        //////////////////////////////////////////////////////

        if (

            !interaction.member.permissions.has(

                PermissionFlagsBits.Administrator
            )
        ) {

            return interaction.reply({

                content:
                    "❌ Solo administradores pueden usar este comando.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////////
        // BOT PERMISSIONS
        //////////////////////////////////////////////////////

        if (

            !interaction.channel.permissionsFor(

                interaction.guild.members.me

            ).has('SendMessages')

        ) {

            return interaction.reply({

                content:
                    "❌ No tengo permisos para enviar mensajes aquí.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////////
        // OPTIONS
        //////////////////////////////////////////////////////

        const { options } =
            interaction;

        //////////////////////////////////////////////////////
        // DATA
        //////////////////////////////////////////////////////

        const color =
            options.getString('color');

        const title =
            options.getString('title');

        const titleURL =
            options.getString('url');

        const author =
            options.getString('author');

        //////////////////////////////////////////////////////

        let description =

            options.getString('description')

                ?.replace(/\\n/g, '\n')

                ?.replace(/```/g, "'''")

            || null;

        //////////////////////////////////////////////////////

        const attachment =
            options.getAttachment('thumbnail');

        const image =
            options.getAttachment('image');

        const timestamp =
            options.getString('timestamp');

        const footer =
            options.getString('footer');

        //////////////////////////////////////////////////////
        // EMPTY EMBED
        //////////////////////////////////////////////////////

        if (

            !title &&
            !description &&
            !attachment &&
            !image &&
            !footer &&
            !author

        ) {

            return interaction.reply({

                content:
                    "❌ Debes agregar contenido al embed.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////////
        // LIMITS
        //////////////////////////////////////////////////////

        if (

            title &&
            title.length > 256

        ) {

            return interaction.reply({

                content:
                    "❌ El título no puede superar 256 caracteres.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////////

        if (

            description &&
            description.length > 4096

        ) {

            return interaction.reply({

                content:
                    "❌ La descripción no puede superar 4096 caracteres.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////////

        if (

            footer &&
            footer.length > 2048

        ) {

            return interaction.reply({

                content:
                    "❌ El footer no puede superar 2048 caracteres.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////////

        if (

            author &&
            author.length > 256

        ) {

            return interaction.reply({

                content:
                    "❌ El author no puede superar 256 caracteres.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////////

        const embed =
            new EmbedBuilder();

        //////////////////////////////////////////////////////
        // COLOR
        //////////////////////////////////////////////////////

        if (color) {

            embed.setColor(color);
        }

        //////////////////////////////////////////////////////
        // TITLE
        //////////////////////////////////////////////////////

        if (title) {

            embed.setTitle(title);
        }

        //////////////////////////////////////////////////////
        // URL VALIDATION
        //////////////////////////////////////////////////////

        if (titleURL) {

            try {

                new URL(titleURL);

                embed.setURL(titleURL);

            } catch {

                return interaction.reply({

                    content:
                        "❌ URL inválida.",

                    flags: 64
                });
            }
        }

        //////////////////////////////////////////////////////
        // AUTHOR
        //////////////////////////////////////////////////////

        if (author) {

            embed.setAuthor({

                name: author
            });
        }

        //////////////////////////////////////////////////////
        // DESCRIPTION
        //////////////////////////////////////////////////////

        if (description) {

            embed.setDescription(
                description
            );
        }

        //////////////////////////////////////////////////////
        // THUMBNAIL
        //////////////////////////////////////////////////////

        if (attachment) {

            embed.setThumbnail(
                attachment.url
            );
        }

        //////////////////////////////////////////////////////
        // IMAGE
        //////////////////////////////////////////////////////

        if (image) {

            embed.setImage(
                image.url
            );
        }

        //////////////////////////////////////////////////////
        // TIMESTAMP
        //////////////////////////////////////////////////////

        if (
            timestamp === 'si'
        ) {

            embed.setTimestamp();
        }

        //////////////////////////////////////////////////////
        // FOOTER
        //////////////////////////////////////////////////////

        if (footer) {

            embed.setFooter({

                text: footer
            });
        }

        //////////////////////////////////////////////////////
        // TRY
        //////////////////////////////////////////////////////

        try {

            //////////////////////////////////////////////////////
            // SEND
            //////////////////////////////////////////////////////

            await interaction.channel.send({

                embeds: [embed]
            });

            //////////////////////////////////////////////////////
            // SUCCESS
            //////////////////////////////////////////////////////

            await correReply(

                interaction,

                '✅ Se envió correctamente el embed.',

                true
            );

        } catch (error) {

            console.log(error);

            //////////////////////////////////////////////////////

            return interaction.reply({

                content:
                    "❌ Ocurrió un error al enviar el embed.",

                flags: 64
            });
        }
    }
};