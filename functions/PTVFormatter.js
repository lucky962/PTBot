const { MessageActionRow, MessageSelectMenu, MessageEmbed, DiscordAPIError, MessageAttachment } = require('discord.js');
const ptvApi = require('../functions/PTVApi');
const tfnswApi = require('../functions/TfNSWApi');

const fs = require('fs');

const avatar_url = 'https://cdn.discordapp.com/avatars/503096810961764364/f89dad593aa8635ccddd3d364ad9c46a.png'

class ptvFormatter{
    ptvEmojiRoute = [
        {name: "Metro", id: "771920140207259659"},
        {name: "Tram", id: "771921271998382140"},
        {name: "Bus", id: "771921102335246346"},
        {name: "VLine", id: "771920567959683102"},
        {name: "Bus", id: "771921102335246346"}
    ]

    tfnswRoutes = {
        1: {name: "TfNSW_T", id: "988139276275449967", color: "#F47A0B"},
        2: {name: "TfNSW_M", id: "988144694892568607", color: "#00969f"},
        4: {name: "TfNSW_L", id: "988139544245329971", color: "#EE1F35"},
        5: {name: "TfNSW_B", id: "988139592291057684", color: "#00A8E6"},
        9: {name: "TfNSW_F", id: "988139631075799040", color: "#50BF33"}
    }

    PTVColours = [
        "#0072ce",
        "#78be20",
        "#ff8200",
        "#8f1a95",
        "#ff8200"
    ]
    
    ServiceStatusColours = {
        "Good Service": 0x97d700, 
        "Service Information": 0xd3ecf4, 
        "Major Delays": 0xef4135, 
        "Minor Delays": 0xe87800, 
        "Planned Works": 0xffd500, 
        "Planned Closure": 0xffd500, 
        "Part suspended": 0x1f1f1f,
        "Other": 0x97d700
    }
        
    // Route Type to English Translation with singular and plural versions
    PTVRouteTypeTranslate = [
        ["Metro","Metro Trains"],
        ["Tram","Trams"],
        ["Bus","Busses"],
        ["VLine", "VLine Trains"],
        ["Bus", "Busses"]
    ]

    TfNSWRouteTypeTranslate = {
        1: ["Train","Trains"],
        2: ["Metro","Metro Trains"],
        4: ["Light Rail Tram","Light Rail Trams"],
        5: ["Bus","Busses"],
        7: ["Coach","Coaches"],
        9: ["Ferry","Ferries"],
        11: ["School Bus","School Busses"]
    }

    constructor(ptvDevId, ptvApiKey, tfnswApiKey) {
        this.ptvClient = new ptvApi(ptvDevId, ptvApiKey);
        this.tfnswClient = new tfnswApi(tfnswApiKey)
    }

    async searchToMenu(search_term, route_types) {
        
        const ptv_search_results = await this.ptvClient.searchForStop(search_term, route_types)
        const tfnsw_search_results = await this.tfnswClient.searchForStop(search_term)

        var stops = []

        for (var i = 0; i < Math.min(ptv_search_results['stops'].length, 13); i++) {
            stops.push({
                label: ptv_search_results['stops'][i]['stop_name'],
                description: ptv_search_results['stops'][i]['stop_suburb'],
                value: "VIC" + String(ptv_search_results['stops'][i]['route_type']) + String(ptv_search_results['stops'][i]['stop_id']), // Concatonates route type with stop id to prevent error occuring with two stops of the same id (different route types)
                emoji: this.ptvEmojiRoute[ptv_search_results['stops'][i]['route_type']]
            })
        }

        for (var i = 0; i < Math.min(tfnsw_search_results['locations'].length, 12); i++) {
            for (var mode of tfnsw_search_results['locations'][i]['modes']) {
                if (mode == 11) {continue;}
                stops.push({
                    label: tfnsw_search_results['locations'][i]['disassembledName'],
                    description: tfnsw_search_results['locations'][i]['parent']['name'],
                    value: "NSW" + String(mode) + tfnsw_search_results['locations'][i]['id'],
                    emoji: this.tfnswRoutes[mode]
                })
            }
        }

        const menu = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                    .setCustomId('stop_select')
                    .setPlaceholder('Select Your Station')
                    .addOptions(stops),
            );

        return menu
    }

    async ptvStopToDeparturesEmbed(stop_id, route_type) {
        
        const departure_results = await this.ptvClient.getDepartures(stop_id, route_type);

        // Sort Departures into dictionary with key direction_id and value being a list of departures with that direction id

        var departures = {}

        for (var departure of departure_results['departures']) {
            if (!departures[departure['direction_id']]) {
                departures[departure['direction_id']] = [];
            }
            departures[departure['direction_id']].push(departure)
        }

        // Convert departures into an Embed

        // const thumbnail = new MessageAttachment('./src/Icons/' + this.PTVRouteTypeTranslate[route_type][0] + '.png')

        var departuresEmbed = new MessageEmbed()
            .setTitle('Next ' + this.PTVRouteTypeTranslate[route_type][0])
            .setColor(this.PTVColours[route_type])
            .setDescription(
`Next ${this.PTVRouteTypeTranslate[route_type][1]} departing from ${departure_results['stops'][stop_id]['stop_name']}.
Train Types are sourced from ptv however seem to be quite inaccurate in some cases. They may or may not be accurate.`)
            .setAuthor('VPT Bot', avatar_url)
            // .attachFiles(thumbnail)
            .setThumbnail('https://raw.githubusercontent.com/lucky962/PTBot/main/src/Icons/' + this.PTVRouteTypeTranslate[route_type][0] + '.png')
            .setFooter('Source: Licensed from Public Transport Victoria under a Creative Commons Attribution 4.0 International Licence.', avatar_url)
        
        for (var direction in departures) {
            var direction_text = '';
            var noofdepartures = 0;
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

Plat: ${departure['platform_number']}. ${(departure_results['runs'][departure['run_ref']]['vehicle_descriptor']) ? departure_results['runs'][departure['run_ref']]['vehicle_descriptor']['description'] : ""}
Scheduled: <t:${(new Date(departure['scheduled_departure_utc'])).getTime() / 1000}:${((new Date(departure['scheduled_departure_utc'])).toDateString() == (new Date()).toDateString()) ? 't' : 'f'}>
ETA: ${(departure['estimated_departure_utc']) ? ('<t:' + (new Date(departure['estimated_departure_utc'])).getTime() / 1000 + ':R>') : 'None'}
Flags:${flags}`
                noofdepartures += 1;
                if (noofdepartures > 2) {
                    break;
                }
            }
            departuresEmbed.addField(departure_results['directions'][direction]['direction_name'], direction_text, true)
        }
        
        // Convert Disruptions into an Embed

        var disruptions = '';
        
        var disruptionsEmbed = new MessageEmbed()
            .setTitle('Potential Disruptions')
            .setColor(this.PTVColours[route_type])
            .setDescription('Potential Disruptions that might affect ' + departure_results['stops'][stop_id]['stop_name'])
            .setAuthor('VPT Bot', avatar_url)
            .setThumbnail('https://raw.githubusercontent.com/lucky962/PTBot/main/src/Icons/' + this.PTVRouteTypeTranslate[route_type][0] + '.png')
            .setFooter('Source: Licensed from Public Transport Victoria under a Creative Commons Attribution 4.0 International Licence.', avatar_url)

        for (var disruption in departure_results['disruptions']) {
            if (disruptions.length + `[${departure_results['disruptions'][disruption]['title']}](${departure_results['disruptions'][disruption]['url']})\n`.length <= 1024) {
                disruptions += `[${departure_results['disruptions'][disruption]['title']}](${departure_results['disruptions'][disruption]['url']})\n`
            } else {
                disruptionsEmbed.addField('Potential Disruptions', disruptions);
                disruptions = '';
            }
        }

        if (disruptionsEmbed.fields.length == 0) {

            const departuresMessage = {content: 'Departures:', embeds: [departuresEmbed]}
    
            return departuresMessage
        }

        if (disruptions != '') {
            disruptionsEmbed.addField('Potential Disruptions', disruptions)
        }

        if (departuresEmbed.length + disruptionsEmbed.length > 6000) {
            var disruptions = '';
            
            var disruptionsEmbed = new MessageEmbed()
                .setTitle('Potential Disruptions')
                .setColor(this.PTVColours[route_type])
                .setDescription('Potential Disruptions that might affect ' + departure_results['stops'][stop_id]['stop_name'])
                .setAuthor('VPT Bot', avatar_url)
                .setThumbnail('https://raw.githubusercontent.com/lucky962/PTBot/main/src/Icons/' + this.PTVRouteTypeTranslate[route_type][0] + '.png')
                .setFooter('Source: Licensed from Public Transport Victoria under a Creative Commons Attribution 4.0 International Licence.', avatar_url)
    
            for (var disruption in departure_results['disruptions']) {
                if (disruptions.length + `${departure_results['disruptions'][disruption]['title']}\n`.length <= 1024) {
                    disruptions += `${departure_results['disruptions'][disruption]['title']}\n`
                } else {
                    disruptionsEmbed.addField('Potential Disruptions', disruptions);
                    disruptions = '';
                }
            }

        }

        if (disruptions != '') {
            disruptionsEmbed.addField('Potential Disruptions', disruptions)
        }

        const departuresMessage = {content: 'Departures:', embeds: [departuresEmbed, disruptionsEmbed]}

        return departuresMessage
    }

    async nswStopToDeparturesEmbed(stop_id, route_type) {
        
        const departure_results = await this.tfnswClient.getDepartures(stop_id, route_type);

        var noofdepartures = {}
        var departures = {}

        for (var departure of departure_results['stopEvents']) {
            if (noofdepartures[departure['transportation']['destination']['name']] >= 2) {
                continue;
            }
            if (departure['transportation']['destination']['name'] in noofdepartures) {
                noofdepartures[departure['transportation']['destination']['name']] = noofdepartures[departure['transportation']['destination']['name']] + 1
            } else {
                noofdepartures[departure['transportation']['destination']['name']] = 0
            }
            departures[departure['transportation']['destination']['name']] = 
`${(departures[departure['transportation']['destination']['name']]) ? departures[departure['transportation']['destination']['name']] : ''}

${(departure['location']['name'].split(', '))[departure['location']['name'].split(', ').length - 1]}
Scheduled: <t:${(new Date(departure['departureTimePlanned'])).getTime() / 1000}:${((new Date(departure['departureTimePlanned'])).toDateString() == (new Date()).toDateString()) ? 't' : 'f'}>
ETA: ${(departure['departureTimeEstimated']) ? ('<t:' + (new Date(departure['departureTimeEstimated'])).getTime() / 1000 + ':R>') : 'None'}
Flags:${(departure['properties']['WheelchairAccess'])?'<:WCA:780582086398181386>':''}`
        }

        var departuresEmbed = new MessageEmbed()
            .setTitle('Next ' + this.TfNSWRouteTypeTranslate[route_type][1])
            .setColor(this.tfnswRoutes[route_type]['color'])
            .setDescription(
`Next ${this.TfNSWRouteTypeTranslate[route_type][1]} departing from ${departure_results['locations'][0]['name']}.`)
            .setAuthor('VPT Bot', avatar_url)
            // .attachFiles(thumbnail)
            .setThumbnail('https://raw.githubusercontent.com/lucky962/PTBot/main/src/Icons/' + this.tfnswRoutes[route_type]['name'] + '.png')
            .setFooter('Source: TfNSW API', avatar_url)

        for (var destination in departures) {
            departuresEmbed.addField(destination, departures[destination], true)
        }

        const departuresMessage = {content: 'Departures:', embeds: [departuresEmbed]}

        return departuresMessage
    }

    async getDisruptions() {
        
        const disruptions_results = await this.ptvClient.getDisruptions();

        var disruptions = {1:{}, 2:{},3:{},4:{},5:{},6:{},7:{},8:{},9:{},10:{},11:{},12:{},13:{},14:{},15:{},16:{},17:{}};

        for (var disruption in disruptions) {
            disruptions[disruption] = {"Part suspended" : [],
            "Major Delays" : [], 
            "Minor Delays" : [], 
            "Planned Works" : [], 
            "Planned Closure" : [], 
            "Service Information" : []}
        }

        for (var disruption of disruptions_results['disruptions']['metro_train']) {
            for (var route of disruption['routes']) {
                if (!disruptions[route['route_id']]) {
                    disruptions[route['route_id']] = {"Part suspended" : [],
                    "Major Delays" : [], 
                    "Minor Delays" : [], 
                    "Planned Works" : [], 
                    "Planned Closure" : [], 
                    "Service Information" : []}
                }

                if (!(disruption['disruption_type'] in disruptions[route['route_id']])) {
                    disruptions[route['route_id']][disruption['disruption_type']] = [];
                }
                disruptions[route['route_id']][disruption['disruption_type']].push(disruption);
                // disruptions[route['route_id']]['route_name'] = route['route_name'];
            }
        }

        return disruptions
    }

    async disruptionsToEmbed(disruptions) {

        const routes = await this.ptvClient.getRoutes();

        var disruptionsEmbeds = {};

        for (var route of routes['routes']) {
            if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17].includes(route['route_id'])) {
                var disruptionEmbed = new MessageEmbed()
                .setTitle(route['route_name'])
                .setFooter('Last Disruption Update', avatar_url)

                if (route['route_service_status']['description'] in this.ServiceStatusColours) {
                    disruptionEmbed.setColor(this.ServiceStatusColours[route['route_service_status']['description']])
                }

                if (route['route_service_status']['description'] == 'Good Service') {
                    disruptionEmbed.addField('Good Service', 'Trains are currently running on time to five minutes.')
                }

                for (var disruption_type in disruptions[route['route_id']]) {
                    if (disruptions[route['route_id']][disruption_type].length !== 0) {
                        var disruptionsTxt = '';
                        for (var disruption in disruptions[route['route_id']][disruption_type]) {
                            if (disruptionsTxt.length + `[${disruptions[route['route_id']][disruption_type][disruption]['title']}](${disruptions[route['route_id']][disruption_type][disruption]['url']})\n`.length <= 1024) {
                                disruptionsTxt = disruptionsTxt + `[${disruptions[route['route_id']][disruption_type][disruption]['title']}](${disruptions[route['route_id']][disruption_type][disruption]['url']})\n`
                            } else {
                                disruptionEmbed.addField(disruption_type, disruptionsTxt);
                                disruptionsTxt = `[${disruptions[route['route_id']][disruption_type][disruption]['title']}](${disruptions[route['route_id']][disruption_type][disruption]['url']})\n`;
                            }
                        }

                        disruptionEmbed.addField(disruption_type, disruptionsTxt);
                    }
                }

                disruptionsEmbeds[route['route_id']] = disruptionEmbed;
            }
        }

        return disruptionsEmbeds
    }
}

module.exports = ptvFormatter;