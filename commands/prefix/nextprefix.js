let ptv;

module.exports = {
    name: 'next',
    aliases: ['n', 'ne'],
    description: 'Provides the next departures',
    prefix: true,

    async execute(message, args) {
        let stops = await ptv.searchToMenu(args.replace('next ', ''), [0, 1, 2, 3, 4]);
        await message.reply({ content: 'Which station would you like?', components: [stops] });
    }
}