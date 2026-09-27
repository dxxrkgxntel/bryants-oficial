function loadEvents(client) {
    const ascii = require('ascii-table');
    const fs = require('fs');
    const table = new ascii().setHeading('Eventos', 'Estado');

    // 🔥 NUEVO: almacenar eventos
    if (!client.events) client.events = new Map();

    const folders = fs.readdirSync('./Events');

    for (const folder of folders) {
        const files = fs
            .readdirSync(`./Events/${folder}`)
            .filter((file) => file.endsWith(".js"));

        for (const file of files) {
            try {
                delete require.cache[require.resolve(`../Events/${folder}/${file}`)];

                const event = require(`../Events/${folder}/${file}`);

                if (!event.name || !event.execute) {
                    table.addRow(file, '❌ Inválido');
                    continue;
                }

                // 🔥 NUEVO: crear handler reutilizable
                const handler = (...args) =>
                    event.execute(...args, client);

                // 🔥 NUEVO: guardar referencia
                client.events.set(file, {
                    name: event.name,
                    handler,
                    rest: event.rest || false
                });

                if (event.rest) {
                    if (event.once) {
                        client.rest.once(event.name, handler);
                    } else {
                        client.rest.on(event.name, handler);
                    }
                } else {
                    if (event.once) {
                        client.once(event.name, handler);
                    } else {
                        client.on(event.name, handler);
                    }
                }

                table.addRow(file, '✅ Cargado');

            } catch (error) {
                table.addRow(file, '❌ Error');
                console.log(`Error en evento ${file}:`, error);
            }
        }
    }

    console.log(
        table.toString(),
        "\n[EVENTOS] Cargados (con validación).".green
    );
}

//////////////////////////////////////////////////////
// 🔥 NUEVO: RECARGA INDIVIDUAL DE EVENTOS
//////////////////////////////////////////////////////

function reloadEvent(client, filePath) {
    const path = require('path');

    try {
        const fileName = path.basename(filePath);
        const folderName = path.basename(path.dirname(filePath));

        const eventPath = `../Events/${folderName}/${fileName}`;

        // 🔥 eliminar cache
        delete require.cache[require.resolve(eventPath)];

        const event = require(eventPath);

        if (!event.name || !event.execute) {
            console.log(`❌ Evento inválido: ${fileName}`);
            return;
        }

        // 🔥 eliminar evento anterior SOLO de este archivo
        const existing = client.events?.get(fileName);

        if (existing) {
            if (existing.rest) {
                client.rest.off(existing.name, existing.handler);
            } else {
                client.off(existing.name, existing.handler);
            }
        }

        // 🔁 crear nuevo handler
        const handler = (...args) =>
            event.execute(...args, client);

        // 🔁 guardar referencia nueva
        client.events.set(fileName, {
            name: event.name,
            handler,
            rest: event.rest || false
        });

        // 🔁 volver a registrar
        if (event.rest) {
            if (event.once) {
                client.rest.once(event.name, handler);
            } else {
                client.rest.on(event.name, handler);
            }
        } else {
            if (event.once) {
                client.once(event.name, handler);
            } else {
                client.on(event.name, handler);
            }
        }

        console.log(`🔁 Evento recargado: ${event.name}`);

    } catch (err) {
        console.error(`❌ Error recargando evento ${filePath}:`, err);
    }
}

//////////////////////////////////////////////////////

module.exports = { loadEvents, reloadEvent };