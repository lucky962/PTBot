const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');

const pg = require('pg');
const connectionString = process.env.DATABASE_URL

const avatar_url = 'https://cdn.discordapp.com/avatars/503096810961764364/f89dad593aa8635ccddd3d364ad9c46a.png'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Lists all the available commands'),

	async execute(interaction) {
                var prefixes = {}
                const pgclient = new pg.Client({connectionString});
                await pgclient.connect()
                var prefixesResults = await pgclient.query('SELECT * FROM public.prefixes;')
                for (var prefix of prefixesResults['rows']) {
                        prefixes[prefix['guild_id']] = prefix['prefix']
                }
                await pgclient.end()

                if (interaction.guildId in prefixes) {
                        prefix = prefixes[interaction.guildId]
                } else {
                        prefix = 'pt!'
                }

                const HelpMsg = new MessageEmbed()
                .setTitle('Help Page')
                .setDescription(`This is a page full of commands you can use with VPT Bot
NOTE: ONLY SLASH COMMANDS SUPPORT OPTIONAL ARGUMENTS
ALSO, discord doesn't like us using non-slash commands (one where the prefix is ${prefix}) and so they will no longer work if I get to 75 servers and it is after April 30 2022.
To read more, visit https://support-dev.discord.com/hc/en-us/articles/4404772028055 or ask in the VPTBot server :)`)
                .setAuthor('VPT Bot', avatar_url)
                .addField('Key', '[argument] - required argument you need to provide for the command\n<argument> - optional argument you can provide')
                .addField(`(${prefix} or /)help`, `Displays this help message!`)
                .addField(`(${prefix} or /)next [station] <route_type> <minutes>`, `Shows next 3 departures per direction from a station.`)
                .addField(`(${prefix} or /)setdisruptionschannel [channel]`, `Keeps channel specified up to date with current train disruptions.`)
                .addField(`(${prefix} or /)invite`, `Sends invite link for the bot`)
                .addField(`${prefix}next(train/bus/tram/vline) [station] \n(alias = (next/n)(t/b/t/v) or (t/b/t/v)(next/n)`, `Shows next 3 departures per direction from a station for a route type.`)
                .addField(`${prefix}setprefix [prefix]`, `Sets a new prefix`)
                .setFooter('© VPT Bot', avatar_url)

                await interaction.reply({embeds:[HelpMsg]})
	},
};
