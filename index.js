require('dotenv').config()

const fs = require('fs');
const { Client, Collection, Intents } = require('discord.js');
const ptvFormatter = require('./functions/PTVFormatter');
const next = require('./commands/next');
const token = process.env.VPTBOT;
const devId = process.env.PTV_DEV_ID;
const apiKey = process.env.PTV_DEV_KEY;
const pg = require('pg');

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
let ptv = new ptvFormatter(devId, apiKey);

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	// Set a new item in the Collection
	// With the key as the command name and the value as the exported module
	client.commands.set(command.data.name, command);
}

client.once('ready', async () => {
	// const channel = await client.channels.fetch('558929696570736660')
	function delay(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
	console.log('Ready!');
	while (true) {
		const pgclient = new pg.Client();
		await pgclient.connect()
		var channels = await pgclient.query('SELECT * FROM disruption_channels;')
		await pgclient.end()
		// console.log(channels)

        const disruptions = await ptv.getDisruptions();

		const disruptionsEmbeds = await ptv.disruptionsToEmbed(disruptions);

		var disruptionsToUpdate = {};

		var oldDisruptionsEmbeds = {};

		try {
			oldDisruptionsEmbeds = require('./InfoFiles/disruptions.json')
		} catch {
			oldDisruptionsEmbeds = {}
		}

		// Adds Embeds that need to be updated to list disruptionsToUpdate
		if (oldDisruptionsEmbeds == {}) {
			disruptionsToUpdate = disruptionsEmbeds
		} else {
			for (var i in disruptionsEmbeds) {
				if (disruptionsEmbeds[i] !== oldDisruptionsEmbeds[i]) {
					disruptionsToUpdate[i] = disruptionsEmbeds[i];
				}
			}
		}

		// console.log("DISRUPTIONS TO UPDATE" + JSON.stringify(disruptionsToUpdate))

		for (var disruption in disruptionsToUpdate) {
			for (var serverChannels of channels['rows']) {
				var channel = await client.channels.fetch(serverChannels['channel_id'])
				var message = await channel.messages.fetch(serverChannels[disruption])
				disruptionsToUpdate[disruption].setTimestamp()
				await message.edit({content:null, embeds:[disruptionsToUpdate[disruption]]})
			}
		}

		for (var serverChannels of channels['rows']) {
			channel = await client.channels.fetch(serverChannels['channel_id'])
			message = await channel.messages.fetch(serverChannels['18'])
			await message.edit({content:`Last Checked for Disruptions at <t:${Math.round((new Date()).getTime() / 1000)}:f>
The side bar will be yellow if a Planned Work is currently active.
Source: Licensed from Public Transport Victoria under a Creative Commons Attribution 4.0 International Licence.
Be sure to join my discord server for official VPTBot support/feedback! https://discord.gg/KEhCS8U`})
		}

        const disruptionstxt = JSON.stringify(disruptionsEmbeds);

        fs.writeFile('./InfoFiles/disruptions.json', disruptionstxt, (err) => {
            if (err) {
                console.log(err);
            }
        })

		// await channel.send('test')
		await delay(60000)
	}
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.editReply({ content: 'There was an error while executing this command!'});
	}
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isSelectMenu()) return;
	if (interaction.customId === 'stop_select') {
		try {
			await next.updateDepartures(interaction)
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

client.login(token);
