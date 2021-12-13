const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('next')
		.setDescription('Shows the next 3 departures per direction from a station.')
		.addStringOption(option =>
			option.setName('station')
				.setDescription('The station you want departures for.')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('route_type')
				.setDescription('The type of transport')
				.addChoice('Metro', '0')
				.addChoice('Tram', '1')
				.addChoice('Bus', '2')
				.addChoice('Vline', '3')
				.addChoice('Night Bus', '4'))
		.addStringOption(option =>
			option.setName('minutes')
				.setDescription('How many minutes ahead do you want to look?')),
				
	async execute(interaction) {

        const departures = await //todo: add response for next command

		await interaction.reply(departures);
	},
};
