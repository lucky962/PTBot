const { MessageActionRow, MessageSelectMenu, MessageEmbed, DiscordAPIError, MessageAttachment } = require('discord.js');
const ptvApi = require('../functions/PTVApi');

class ptvFormatter{
    emojiRoute = [
        {name: "Metro", id: "771920140207259659"},
        {name: "Tram", id: "771921271998382140"},
        {name: "Bus", id: "771921102335246346"},
        {name: "VLine", id: "771920567959683102"},
        {name: "Bus", id: "771921102335246346"}
    ]

    PTColours = [
        "#0072ce",
        "#78be20",
        "#ff8200",
        "#8f1a95",
        "#ff8200"
    ]


    // Route Type to English Translation with singular and plural versions
    RouteTypeTranslate = [
        ["Metro","Metro Trains"],
        ["Tram","Trams"],
        ["Bus","Busses"],
        ["VLine", "VLine Trains"],
        ["Bus", "Busses"]
    ]

    constructor(devId, apiKey) {
        this.ptvClient = new ptvApi(devId, apiKey);
    }

    async searchToMenu(search_term, route_types) {
        
        const search_results = await this.ptvClient.searchForStop(search_term, route_types)

        var stops = []
        var stop_ids = []

        for (var i = 0; i < Math.min(search_results['stops'].length,25); i++) {
            stop_ids.push
            stops.push({
                label: search_results['stops'][i]['stop_name'],
                description: search_results['stops'][i]['stop_suburb'],
                value: String(search_results['stops'][i]['route_type']) + String(search_results['stops'][i]['stop_id']), // Concatonates route type with stop id to prevent error occuring with two stops of the same id (different route types)
                emoji: this.emojiRoute[search_results['stops'][i]['route_type']]
            })
        }

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

    async stopToDeparturesEmbed(stop_id, route_type) {
        
        const departure_results = await this.ptvClient.getDepartures(stop_id, route_type);

        const avatar_url = 'https://cdn.discordapp.com/avatars/503096810961764364/f89dad593aa8635ccddd3d364ad9c46a.png'

        // Sort Departures into dictionary with key direction_id and value being a list of departures with that direction id

        var departures = {}

        for (var departure of departure_results['departures']) {
            console.log(departure)
            if (!departures[departure['direction_id']]) {
                departures[departure['direction_id']] = [];
            }
            departures[departure['direction_id']].push(departure)
        }

        // Convert departures into an Embed

        const thumbnail = new MessageAttachment('./src/Icons/' + this.RouteTypeTranslate[route_type][0] + '.png')

        var departuresEmbed = new MessageEmbed()
            .setTitle('Next ' + this.RouteTypeTranslate[route_type][0])
            .setColor(this.PTColours[route_type])
            .setDescription(
`Next ${this.RouteTypeTranslate[route_type][1]} departing from ${departure_results['stops'][stop_id]['stop_name']}.
Train Types are sourced from ptv however seem to be quite inaccurate in some cases. They may or may not be accurate.`)
            .setAuthor('VPT Bot', avatar_url)
            // .attachFiles(thumbnail)
            .setThumbnail('attachment://' + this.RouteTypeTranslate[route_type][0] + '.png')
            .setFooter('Source: Licensed from Public Transport Victoria under a Creative Commons Attribution 4.0 International Licence.', avatar_url)

        // console.log(departures)
        for (var direction in departures) {
            var direction_text = '';
            for (var departure of departures[direction]) {
                var flags = '';
                if (departure['flags'].includes('S_WCA')) {
                    flags += ("<:WCA:780582086398181386> ")
                }
                if (departure['flags'].includes('S_VTR')) {
                    flags += ("VLine Train")
                }
                if (departure['flags'].includes('S_VCH')) {
                    flags += ("VLine Coach")
                }
                direction_text = 
`${direction_text}

Plat: ${departure['platform_number']}
Scheduled: <t:${(new Date(departure['scheduled_departure_utc'])).getTime() / 1000}:${((new Date(departure['scheduled_departure_utc'])).toDateString() == (new Date()).toDateString()) ? 't' : 'f'}>
ETA: ${(departure['estimated_departure_utc']) ? ('<t:' + (new Date(departure['estimated_departure_utc'])).getTime() / 1000 + ':R>') : 'None'}
Flags:${flags}`
            }
            console.log(departure_results['directions'][direction]['direction_name'])
            console.log(direction_text)
            departuresEmbed.addField(departure_results['directions'][direction]['direction_name'], direction_text, true)
        }
        
        // Convert Disruptions into an Embed

        var disruptions = '';

        for (var disruption in departure_results['disruptions']) {
            disruptions += `[${departure_results['disruptions'][disruption]['title']}](${departure_results['disruptions'][disruption]['url']})\n`
        }

        var disruptionsEmbed = new MessageEmbed()
            .setTitle('Potential Disruptions')
            .setColor(this.PTColours[route_type])
            .setDescription('Potential Disruptions that might affect ' + departure_results['stops'][stop_id]['stop_name'])
            .setAuthor('VPT Bot', avatar_url)
            .setThumbnail('attachment://' + this.RouteTypeTranslate[route_type][0] + '.png')
            .setFooter('Source: Licensed from Public Transport Victoria under a Creative Commons Attribution 4.0 International Licence.', avatar_url)
            .addField('Potential Disruptions', disruptions)

        const departuresMessage = {content: 'Departures:', embeds: [departuresEmbed, disruptionsEmbed], files: [thumbnail]}

        return departuresMessage
    }
}

module.exports = ptvFormatter;