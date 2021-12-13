const { MessageActionRow, MessageSelectMenu } = require('discord.js');
const ptvApi = require('../functions/PTVApi');

class ptvFormatter{
    emojiRoute = [
        {name: "Metro", id: "771920140207259659"},
        {name: "Tram", id: "771921271998382140"},
        {name: "Bus", id: "771921102335246346"},
        {name: "VLine", id: "771920567959683102"},
        {name: "Bus", id: "771921102335246346"}
    ]

    constructor(devId, apiKey) {
        this.ptvClient = new ptvApi(devId, apiKey);
    }

    async searchToMenu(search_term, route_types) {
        
        const search_results = await this.ptvClient.searchForStop(search_term, route_types)

        var stops = []

        for (var i = 0; i < Math.min(search_results['stops'].length,25); i++) {
            console.log(i)
            console.log(search_results['stops'][i])
            console.log(search_results)
            stops.push({
                label: search_results['stops'][i]['stop_name'],
                description: search_results['stops'][i]['stop_suburb'],
                value: String(i),
                emoji: this.emojiRoute[search_results['stops'][i]['route_type']]
            })
        }

        console.log(stops)

        // console.log(stops)

        const menu = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                    .setCustomId('stop_select')
                    .setPlaceholder('Select Your Station')
                    .addOptions(stops),
            );

        return menu
    }
}

module.exports = ptvFormatter;