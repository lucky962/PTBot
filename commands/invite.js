const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('invite')
		.setDescription('Replies with a link to invite the bot to your server!'),

	async execute(interaction) {
		await interaction.reply('Bot Invite Link: https://discord.com/api/oauth2/authorize?client_id=503096810961764364&permissions=0&scope=bot%20applications.commands');
	},
};
