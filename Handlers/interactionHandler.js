const ascii = require('ascii-table');
const fs = require('fs');

function loadInteractions(client) {

    const table =
        new ascii()

            .setHeading(
                'Interacciones',
                'Estado'
            );

    //////////////////////////////////////////////////
    // LIMPIAR COLECCIONES
    //////////////////////////////////////////////////

    client.buttons.clear();
    client.selects.clear();
    client.modals.clear();

    //////////////////////////////////////////////////
    // 🔘 BOTONES
    //////////////////////////////////////////////////

    fs.readdirSync('./Interactions/Buttons')

        .forEach(file => {

            try {

                delete require.cache[
                    require.resolve(
                        `../Interactions/Buttons/${file}`
                    )
                ];

                //////////////////////////////////////////////////

                const btn =
                    require(
                        `../Interactions/Buttons/${file}`
                    );

                //////////////////////////////////////////////////

                if (
                    !btn.id ||
                    !btn.execute
                ) {

                    table.addRow(
                        file,
                        '❌ Inválido'
                    );

                    return;
                }

                //////////////////////////////////////////////////

                client.buttons.set(
                    btn.id,
                    btn
                );

                //////////////////////////////////////////////////

                table.addRow(
                    file,
                    '✅ Botón'
                );

            } catch (err) {

                table.addRow(
                    file,
                    '❌ Error'
                );

                console.log(err);
            }
        });

    //////////////////////////////////////////////////
    // 📜 SELECT MENUS
    //////////////////////////////////////////////////

    fs.readdirSync('./Interactions/StringSelect')

        .forEach(file => {

            try {

                delete require.cache[
                    require.resolve(
                        `../Interactions/StringSelect/${file}`
                    )
                ];

                //////////////////////////////////////////////////

                const select =
                    require(
                        `../Interactions/StringSelect/${file}`
                    );

                //////////////////////////////////////////////////

                if (
                    !select.id ||
                    !select.execute
                ) {

                    table.addRow(
                        file,
                        '❌ Inválido'
                    );

                    return;
                }

                //////////////////////////////////////////////////
                // SOPORTE PARA REGEX IDS
                //////////////////////////////////////////////////

                client.selects.set(
                    file,
                    select
                );

                //////////////////////////////////////////////////

                table.addRow(
                    file,
                    '✅ Select'
                );

            } catch (err) {

                table.addRow(
                    file,
                    '❌ Error'
                );

                console.log(err);
            }
        });

    //////////////////////////////////////////////////
    // 🧾 MODALES
    //////////////////////////////////////////////////

    fs.readdirSync('./Interactions/ModalSubmit')

        .forEach(file => {

            try {

                delete require.cache[
                    require.resolve(
                        `../Interactions/ModalSubmit/${file}`
                    )
                ];

                //////////////////////////////////////////////////

                const modal =
                    require(
                        `../Interactions/ModalSubmit/${file}`
                    );

                //////////////////////////////////////////////////

                if (
                    !modal.id ||
                    !modal.execute
                ) {

                    table.addRow(
                        file,
                        '❌ Inválido'
                    );

                    return;
                }

                //////////////////////////////////////////////////

                client.modals.set(
                    modal.id,
                    modal
                );

                //////////////////////////////////////////////////

                table.addRow(
                    file,
                    '✅ Modal'
                );

            } catch (err) {

                table.addRow(
                    file,
                    '❌ Error'
                );

                console.log(err);
            }
        });

    //////////////////////////////////////////////////

    console.log(

        table.toString(),

        "\n[INTERACCIONES] Cargadas correctamente."
            .green
    );
}

module.exports = {
    loadInteractions
};