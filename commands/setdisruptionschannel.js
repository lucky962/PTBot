const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setdisruptionschannel')
		.setDescription('Shows the next 3 departures per direction from a station.')
		.addStringOption(option =>
			option.setName('channel')
				.setDescription('What channel do you want disruptions to be in?')
				.setRequired(true)),
				
	async execute(interaction) {

        const departures = await //todo: add response for setdisruptionschannel command

		await interaction.reply("Coming Soon");
	},
};
