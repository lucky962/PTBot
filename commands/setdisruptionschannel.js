const { SlashCommandBuilder } = require('@discordjs/builders');
const devId = process.env.PTV_DEV_ID;
const apiKey = process.env.PTV_DEV_KEY;
const ptvFormatter = require('../functions/PTVFormatter');
const { Client } = require('pg')
const connectionString = process.env.DATABASE_URL

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

        const disruptions = await ptv.getDisruptions();

		const disruptionsEmbeds = await ptv.disruptionsToEmbed(disruptions);

		var messages = []

		for (var disruptionEmbed in disruptionsEmbeds) {
			disruptionsEmbeds[disruptionEmbed].setTimestamp()
			messages.push((await channel.send({embeds:[disruptionsEmbeds[disruptionEmbed]]})).id);
		}

		messages.push((await channel.send({content:`Last Checked for Disruptions at <t:${Math.round((new Date()).getTime() / 1000)}:f>
The side bar will be yellow if a Planned Work is currently active.
Source: Licensed from Public Transport Victoria under a Creative Commons Attribution 4.0 International Licence.
Be sure to join my discord server for official VPTBot support/feedback! https://discord.gg/KEhCS8U`})).id);

		console.log(messages)

		const pgclient = new Client({
			connectionString: connectionString,
			ssl: {
				rejectUnauthorized: false
			}
		})
		await pgclient.connect()
		await pgclient.query('DELETE FROM disruption_channels WHERE channel_id = $1;', [channelId])
		await pgclient.query(`INSERT INTO disruption_channels ("channel_id", "1", "2", "3", "4", "5", "6", "7", "8", "9", "11", "12", "13", "14", "15", "16", "17", "18") VALUES(${channelId}, ${messages.join(', ')})`)
		await pgclient.end()

		await interaction.editReply({content:'Successfully created disruptions channel.'})
	},
};
