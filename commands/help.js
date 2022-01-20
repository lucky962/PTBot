const { SlashCommandBuilder } = require('@discordjs/builders');

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
        .set_author('VPT Bot', avatar_url)
        .add_field('Key', '[argument] - required argument you need to provide for the command\n<argument> - optional argument you can provide')
        .add_field('(pt! or /)help', 'Displays this help message!')
        .add_field('(pt! or /)next [station] <route_type> <minutes>', 'Shows next 3 departures per direction from a station.')
        .add_field('(pt! or /)setdisruptionschannel [channel]', 'Keeps channel specified up to date with current train disruptions.')
        .add_field('(pt! or /)invite', 'Sends invite link for the bot')
        .add_field('pt!next(train/bus/tram/vline) [station] \n(alias = (next/n)(t/b/t/v) or (t/b/t/v)(next/n)', 'Shows next 3 departures per direction from a station for a route type.')
        .add_field('pt!prefix', 'Shows your current set prefix.')
        .add_field('pt!setprefix [prefix]', 'Sets a new prefix')
        .set_footer('© VPT Bot', avatar_url)
	},
};
