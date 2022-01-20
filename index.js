require('dotenv').config()

const fs = require('fs');
const { Client, Collection, Intents } = require('discord.js');
const ptvFormatter = require('./functions/PTVFormatter');
const next = require('./commands/next');
const token = process.env.VPTBOT;
const devId = process.env.PTV_DEV_ID;
const apiKey = process.env.PTV_DEV_KEY;
const pg = require('pg');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
let ptv = new ptvFormatter(devId, apiKey);

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

var prefixes = {};

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	// Set a new item in the Collection
	// With the key as the command name and the value as the exported module
	client.commands.set(command.data.name, command);
}

client.once('ready', async () => {
	// const channel = await client.channels.fetch('558929696570736660')

	const pgclient = new pg.Client();
	await pgclient.connect()
	var prefixesResults = await pgclient.query('SELECT * FROM public.prefixes;')
	for (var prefix of prefixesResults['rows']) {
		prefixes[prefix['guild_id']] = prefix['prefix']
	}
	await pgclient.end()

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

client.on('messageCreate', async message => {
	console.log(message.content)
	console.log(!(message.guildId in prefixes))
	console.log(message.content.toLowerCase().startsWith('pt!'))
	if ((message.guildId in prefixes & message.content.startsWith(prefixes[message.guildId])) | ((!(message.guildId in prefixes) & message.content.toLowerCase().startsWith('pt!')))) {
		const command = message.content.replace(prefixes[message.guildId, '']).toLowerCase().replace('pt!','');
		if (command.startsWith('next ')) {
			stops = await ptv.searchToMenu(command.replace('next ',''), [0,1,2,3,4]); 
			await message.reply({content: 'Which station would you like?', components: [stops]});
		} else if (command.startsWith('nexttrain') | command.startsWith('nt ') | command.startsWith('tn ') | command.startsWith('tnext ') | command.startsWith('nextt ')) {
			stops = await ptv.searchToMenu(command.replace('nexttrain ','').replace('nt ','').replace('tn ','').replace('tnext ','').replace('nextt ',''), [0,3]); 
			await message.reply({content: 'Which station would you like?', components: [stops]});
		} else if (command.startsWith('nextbus') | command.startsWith('nb') | command.startsWith('bn') | command.startsWith('bnext') | command.startsWith('nextb')) {
			stops = await ptv.searchToMenu(command.replace('nextbus ','').replace('nb ','').replace('bn ','').replace('bnext ','').replace('nextb ',''), [2, 4]); 
			await message.reply({content: 'Which station would you like?', components: [stops]});
		} else if (command.startsWith('nexttram') | command.startsWith('ntr') | command.startsWith('trn') | command.startsWith('trnext') | command.startsWith('nexttr')) {
			stops = await ptv.searchToMenu(command.replace('nexttram ','').replace('ntr ','').replace('trn ','').replace('trnext ','').replace('nexttr ',''), [1]); 
			await message.reply({content: 'Which station would you like?', components: [stops]});
		} else if (command.startsWith('nextvline') | command.startsWith('nv') | command.startsWith('vn') | command.startsWith('vnext') | command.startsWith('nextv')) {
			stops = await ptv.searchToMenu(command.replace('nextvline ','').replace('nv ','').replace('vn ','').replace('vnext ','').replace('nextv ',''), [3]); 
			await message.reply({content: 'Which station would you like?', components: [stops]});
		} else if (command.startsWith('setprefix ')) {
			message.reply('setprefix command coming soon');
		} else if (command.startsWith('help ')) {
			message.reply('help command coming soon');
		} else if (command.startsWith('setdisruptionschannel ')) {

			const channelId = command.replace('setdisruptionschannel ', '').substring(2).substring(0,18)
	
			var channel = null;
	
			try {
				channel = await message.guild.channels.fetch(channelId);
			} catch (error) {
				if (error.code == 50035) {
					await message.reply({content:'Channel not found, please mention the channel.'})
					return
				} else {
					throw(error)
				}
			}
	
			const disruptions = await ptv.getDisruptions();
	
			const disruptionsEmbeds = await ptv.disruptionsToEmbed(disruptions);
	
			var messages = []
	
			for (var disruptionEmbed in disruptionsEmbeds) {
				disruptionEmbed.setTimestamp()
				messages.push((await channel.send({embeds:[disruptionsEmbeds[disruptionEmbed]]})).id);
			}
	
			messages.push((await channel.send({content:`Last Checked for Disruptions at <t:${Math.round((new Date()).getTime() / 1000)}:f>
	The side bar will be yellow if a Planned Work is currently active.
	Source: Licensed from Public Transport Victoria under a Creative Commons Attribution 4.0 International Licence.
	Be sure to join my discord server for official VPTBot support/feedback! https://discord.gg/KEhCS8U`})).id);
	
			console.log(messages)
	
			const pgclient = new Client()
			await pgclient.connect()
			await pgclient.query('DELETE FROM disruption_channels WHERE channel_id = $1;', [channelId])
			await pgclient.query(`INSERT INTO disruption_channels ("channel_id", "1", "2", "3", "4", "5", "6", "7", "8", "9", "11", "12", "13", "14", "15", "16", "17", "18") VALUES(${channelId}, ${messages.join(', ')})`)
			await pgclient.end()
	
			await message.reply({content:'Successfully created disruptions channel.'})
		}
	}
});

client.login(token);
