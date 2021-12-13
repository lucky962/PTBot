const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('invite')
		.setDescription('Replies with a link to invite the bot to your server!'),

	async execute(interaction) {
		await interaction.reply('Bot Invite Link: https://discordapp.com/oauth2/authorize?client_id=503096810961764364&scope=bot&permissions=0');
	},
};
