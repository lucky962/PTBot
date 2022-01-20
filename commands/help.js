const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');

const avatar_url = 'https://cdn.discordapp.com/avatars/503096810961764364/f89dad593aa8635ccddd3d364ad9c46a.png'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Lists all the available commands'),

	async execute(interaction) {
                const HelpMsg = new MessageEmbed()
                .setTitle('Help Page')
                .setDescription(`This is a page full of commands you can use with VPT Bot
        NOTE: ONLY SLASH COMMANDS SUPPORT OPTIONAL ARGUMENTS
        ALSO, discord doesn't like us using non-slash commands (one where the prefix is pt! or a custom prefix) and so they will no longer work if I get to 75 servers and it is after April 30 2022.
        To read more, visit https://support-dev.discord.com/hc/en-us/articles/4404772028055 or ask in the VPTBot server :)`)
                .setAuthor('VPT Bot', avatar_url)
                .addField('Key', '[argument] - required argument you need to provide for the command\n<argument> - optional argument you can provide')
                .addField('(pt! or /)help', 'Displays this help message!')
                .addField('(pt! or /)next [station] <route_type> <minutes>', 'Shows next 3 departures per direction from a station.')
                .addField('(pt! or /)setdisruptionschannel [channel]', 'Keeps channel specified up to date with current train disruptions.')
                .addField('(pt! or /)invite', 'Sends invite link for the bot')
                .addField('pt!next(train/bus/tram/vline) [station] \n(alias = (next/n)(t/b/t/v) or (t/b/t/v)(next/n)', 'Shows next 3 departures per direction from a station for a route type.')
                .addField('pt!prefix', 'Shows your current set prefix.')
                .addField('pt!setprefix [prefix]', 'Sets a new prefix')
                .setFooter('© VPT Bot', avatar_url)

                await interaction.reply({embeds:[HelpMsg]})
	},
};
