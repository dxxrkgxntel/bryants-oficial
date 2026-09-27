const fs = require("fs");
const path = require("path");

const scamDomains = new Set();

function loadScamDomains() {

    try {

        const filePath = path.join(
            __dirname,
            "scamDomains.json"
        );

        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(
                filePath,
                JSON.stringify([])
            );
        }

        const data = JSON.parse(
            fs.readFileSync(filePath)
        );

        scamDomains.clear();

        for (const domain of data) {
            scamDomains.add(
                domain.toLowerCase()
            );
        }

        console.log(
            `[ANTISCAM] ${scamDomains.size} dominios cargados.`
        );

    } catch (err) {

        console.error(
            "[ANTISCAM] Error cargando dominios:",
            err
        );

    }

}

function isScamDomain(domain) {

    return scamDomains.has(
        domain.toLowerCase()
    );

}

module.exports = {
    loadScamDomains,
    isScamDomain,
    scamDomains
};