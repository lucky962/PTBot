const { CommandInteraction, MessageEmbed } = require('discord.js');
const next = require('./commands/next');

module.exports = {
    /**
     * @param {CommandInteraction} interaction
     */
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isCommand() || interaction.isContextMenu()) {
            const command = client.commands.get(interaction.commandName)
            if (!command) {
                const newLocal = '⛔ An error occured while running this command.'
                return interaction.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('RED')
                        .setDescription(newLocal)
                    ]
                }) && client.commands.delete(interaction.commandName)
            }

            if (interaction.isSelectMenu()) {
                if (!interaction.customId === 'stop_select') return;

                try {
                    await next.updateDepartures(interaction)
                } catch (error) {
                    console.error(error);
                    var lucky962 = await client.users.fetch('244596682531143680')
                    await lucky962.send(JSON.stringify(error).slice(0, 2000))
                    await interaction.editReply({ content: 'Sorry, there was an error while executing this command. This has been reported to lucky962, and will be fixed ASAP.', embeds: [] });
                }
            }
        }
    }
};