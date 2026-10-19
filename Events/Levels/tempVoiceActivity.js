// La actividad de juego no debe cambiar automáticamente el nombre de una sala temporal.
// El propietario conserva el nombre que haya elegido en el panel de la sala.
module.exports = {
    name: "presenceUpdate",
    async execute() {
        // Intencionalmente vacío: no renombrar canales según el juego que esté ejecutando el propietario.
    }
};
