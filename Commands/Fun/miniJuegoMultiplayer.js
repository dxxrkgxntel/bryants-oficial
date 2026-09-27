const {
    Client,
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
} = require("discord.js");
const {
    Connect4,
    RockPaperScissors,
    TicTacToe,
} = require('discord-gamecord');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("games-multiplayer")
        .setDescription("Juega un minijuego multijugador dentro de Discord.")
        .addStringOption(option =>
            option.setName("game")
                .setDescription("Elige el juego que deseas.")
                .setRequired(true)
                .addChoices(
                    { name: "Connect 4", value: "connect4" },
                    { name: "Piedra, Papel o Tijera", value: "rps" },
                    { name: "Tic Tac Toe", value: "tictactoe" },
                )
        )
        .addUserOption(option =>
            option.setName("user")
                .setDescription('Elige tu oponente para iniciar el juego.')
                .setRequired(true)
        )
        .setDMPermission(false),
    /**
     * @param {Client} client
     * @param {ChatInputCommandInteraction} interaction
     */
    async execute(interaction) {
        const game = interaction.options.getString("game");
        const user = interaction.options.getUser("user");

        if (!user) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#8A2BE2")
                        .setDescription(":warning: | Es muy probable que el objetivo especificado haya abandonado el servidor.")
                ],
                flags: 64
            })
        }

        if (user.bot) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#8A2BE2")
                        .setDescription(":warning: | No está permitido jugar con o contra un bot.")
                ],
                flags: 64
            })
        }

        if (user.id === interaction.user.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#8A2BE2")
                        .setDescription(":warning: | No puedes jugar una partida multijugador contigo mismo.")
                ],
                flags: 64
            })
        }

        switch (game) {
            case "connect4": {
                const Game = new Connect4({
                    message: interaction,
                    slash_command: true,
                    opponent: interaction.options.getUser('user'),
                    embed: {
                        title: 'Connect4 Game',
                        statusTitle: 'Status',
                        color: '#2f3136'
                    },
                    emojis: {
                        board: '⚪',
                        player1: '🔴',
                        player2: '🟡'
                    },
                    mentionUser: true,
                    timeoutTime: 60000,
                    buttonStyle: 'SECONDARY',
                    turnMessage: '{emoji} | Es el turno del jugador: **{player}**.',
                    winMessage: '{emoji} | **{player}** ganó el juego Connect4.',
                    tieMessage: '¡Empate! ¡Nadie ganó el juego!',
                    timeoutMessage: '¡El juego quedó inconcluso! ¡Nadie ganó el juego!',
                    playerOnlyMessage: 'Solo {player} y {opponent} pueden usar estos botones.'
                });

                Game.startGame();
                Game.on('gameOver', result => {
                    console.log(result);  // =>  { result... }
                });
            }
                break;
            case "rps": {
                const Game = new RockPaperScissors({
                    message: interaction,
                    slash_command: true,
                    opponent: interaction.options.getUser('user'),
                    embed: {
                        title: 'Rock Paper Scissors',
                        color: '#2f3136',
                        description: 'Press a button below to make a choice.'
                    },
                    buttons: {
                        rock: 'Rock',
                        paper: 'Paper',
                        scissors: 'Scissors'
                    },
                    emojis: {
                        rock: '🌑',
                        paper: '📰',
                        scissors: '✂️'
                    },
                    mentionUser: true,
                    timeoutTime: 60000,
                    buttonStyle: 'PRIMARY',
                    pickMessage: 'You choose {emoji}.',
                    winMessage: '**{player}** won the Game! Congratulations!',
                    tieMessage: 'The Game tied! No one won the Game!',
                    timeoutMessage: 'The Game went unfinished! No one won the Game!',
                    playerOnlyMessage: 'Only {player} and {opponent} can use these buttons.'
                });

                Game.startGame();
                Game.on('gameOver', result => {
                    console.log(result);  // =>  { result... }
                });
            }
                break;
            case "tictactoe": {
                const Game = new TicTacToe({
                    message: interaction,
                    slash_command: true,
                    opponent: interaction.options.getUser('user'),
                    embed: {
                        title: 'Tic Tac Toe',
                        color: '#2f3136',
                        statusTitle: 'Status',
                        overTitle: 'Game Over'
                    },
                    emojis: {
                        xButton: '❌',
                        oButton: '🔵',
                        blankButton: '➖'
                    },
                    mentionUser: true,
                    timeoutTime: 60000,
                    xButtonStyle: 'DANGER',
                    oButtonStyle: 'PRIMARY',
                    turnMessage: '{emoji} | Its turn of player **{player}**.',
                    winMessage: '{emoji} | **{player}** won the TicTacToe Game.',
                    tieMessage: 'The Game tied! No one won the Game!',
                    timeoutMessage: 'The Game went unfinished! No one won the Game!',
                    playerOnlyMessage: 'Only {player} and {opponent} can use these buttons.'
                });

                Game.startGame();
                Game.on('gameOver', result => {
                    console.log(result);  // =>  { result... }
                })
            }
                break;
        }
    }
}