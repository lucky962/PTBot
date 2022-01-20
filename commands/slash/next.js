const devId = process.env.PTV_DEV_ID;
const apiKey = process.env.PTV_DEV_KEY;
const ptvFormatter = require('../../functions/PTVFormatter');

let ptv = new ptvFormatter(devId, apiKey);

module.exports = {
    name: 'next',
    description: 'Shows the next 3 departures per direction from a station.',
    options: [{
        name: 'station',
        description: 'The station you want departures for.',
        required: true,
    }, {
        name: 'route_type',
        description: 'The type of transport',
        choices: [{
            name: 'Metro',
            value: 0
        }, {
            name: 'Tram',
            value: 1
        }, {
            name: 'Bus',
            value: 2
        }, {
            name: 'Vline',
            value: 3
        }, {
            name: 'Night Bus',
            value: 4
        }]
    }, {
        name: 'minutes',
        description: 'How many minutes ahead do you want to look? (COMING SOON)'
    }],

    async execute(interaction) {
        await interaction.deferReply();

        stops = await ptv.searchToMenu(interaction.options.getString('station'), ((interaction.options.getString('route_type') == null) ? [0, 1, 2, 3, 4] : [interaction.options.getString('route_type')])); //todo: add route_type options

        await interaction.editReply({ content: 'Which station would you like?', components: [stops] });
    },

    async updateDepartures(interaction) {
        await interaction.deferUpdate();

        departures = await ptv.stopToDeparturesEmbed(interaction.values[0].substring(1), interaction.values[0][0])

        await interaction.editReply(departures)
    }

};