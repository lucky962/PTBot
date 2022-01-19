const { MessageEmbed, MessageActionRow, MessageButton, CommandInteraction } = require('discord.js')

module.exports = {
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    name: 'invite',
    description: 'Replies with a link to invite the bot to your server!',

    async execute(interaction, client) {
        const Invite = new MessageEmbed()
            .setTitle('Invite Me!')
            .setDescription("I'm a cool Discord Bot, ain't I? Use the buttons below to invite me to your server or join our support server!\n\nStay Safe 👋")
            .setColor('PURPLE')
            .setThumbnail(client.user.displayAvatarURL())

        const row = new MessageActionRow().addComponents(
            new MessageButton()
            .setURL('https://discordapp.com/oauth2/authorize?client_id=503096810961764364&scope=bot%20applications.commands&permissions=0')
            .setLabel('Invite Me')
            .setStyle('LINK'),

            new MessageButton()
            .setURL('https://discord.gg/KEhCS8U')
            .setLabel('Support Server')
            .setStyle('LINK'),

        )
        interaction.reply({ embeds: [Invite], components: [row] })
    },
};