function loadCommands(client) {
    const ascii = require('ascii-table');
    const fs = require('fs');
    const table = new ascii().setHeading('Comandos', 'Estado');

    let commandsArray = [];

    client.commands.clear(); // 🔥 IMPORTANTE

    const commandsFolder = fs.readdirSync('./Commands');

    for (const folder of commandsFolder) {
        const commandFiles = fs
            .readdirSync(`./Commands/${folder}`)
            .filter((file) => file.endsWith(".js"));

        for (const file of commandFiles) {
            try {

                delete require.cache[require.resolve(`../Commands/${folder}/${file}`)];
                const commandFile = require(`../Commands/${folder}/${file}`);

                if (!commandFile.data || !commandFile.data.name) {
                    table.addRow(file, '❌ Sin data o nombre');
                    continue;
                }

                const properties = { folder, ...commandFile };
                client.commands.set(commandFile.data.name, properties);

                commandsArray.push(commandFile.data.toJSON());

                table.addRow(file, '✅ Cargado');

            } catch (error) {
                table.addRow(file, '❌ Error');
                console.log(`Error en ${file}:`, error);
            }
        }
    }

    try {
        client.application.commands.set(commandsArray);
    } catch (error) {
        console.log('Error registrando comandos:', error);
    }

    return console.log(
        table.toString(),
        "\n[COMANDOS] Cargados (con validación).".green
    );
}

//////////////////////////////////////////////////////
// 🔥 NUEVO: RECARGA INDIVIDUAL DE COMANDOS
//////////////////////////////////////////////////////

function reloadCommand(client, filePath) {
    const path = require('path');

    try {
        const fileName = path.basename(filePath);
        const folderName = path.basename(path.dirname(filePath));

        const commandPath = `../Commands/${folderName}/${fileName}`;

        // 🔥 eliminar cache
        delete require.cache[require.resolve(commandPath)];

        const newCommand = require(commandPath);

        if (!newCommand.data || !newCommand.data.name) {
            console.log(`❌ ${fileName} inválido`);
            return;
        }

        // 🔁 reemplazar comando existente
        client.commands.set(newCommand.data.name, {
            folder: folderName,
            ...newCommand
        });

        console.log(`🔁 Comando recargado: ${newCommand.data.name}`);

    } catch (err) {
        console.error(`❌ Error recargando ${filePath}:`, err);
    }
}

//////////////////////////////////////////////////////

module.exports = { loadCommands, reloadCommand };