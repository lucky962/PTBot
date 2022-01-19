const { SlashCommandBuilder } = require('@discordjs/builders');
const devId = process.env.PTV_DEV_ID;
const apiKey = process.env.PTV_DEV_KEY;
const ptvFormatter = require('../functions/PTVFormatter');

let ptv = new ptvFormatter(devId, apiKey);

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setdisruptionschannel')
		.setDescription('Shows the next 3 departures per direction from a station.')
		.addStringOption(option =>
			option.setName('channel')
				.setDescription('What channel do you want disruptions to be in?')
				.setRequired(true)),
				
	async execute(interaction) {
		await interaction.deferReply();

		const channelId = interaction.options.getString('channel').substring(2).substring(0,18)

		var channel = null;

		try {
			channel = await interaction.guild.channels.fetch(channelId);
		} catch (error) {
			if (error.code == 50035) {
				await interaction.editReply({content:'Channel not found, please mention the channel.'})
				return
			} else {
				throw(error)
			}
		}

        const disruptions = await ptv.getDisruptions();//todo: add response for setdisruptionschannel command

		const disruptionsEmbeds = await ptv.disruptionsToEmbed(disruptions);

		for (var disruptionEmbed of disruptionsEmbeds) {
			await channel.send({embeds:[disruptionEmbed]});
		}

		await interaction.editReply({content:'success'})
	},
};
