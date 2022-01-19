const pg = require('pg');
const fs = require('fs');
const { Client } = require('discord.js')
require('dotenv').config()
const ptvFormatter = require('./functions/PTVFormatter');
const devId = process.env.PTV_DEV_ID;
const apiKey = process.env.PTV_DEV_KEY;
let ptv = new ptvFormatter(devId, apiKey);

module.exports = {
    name: 'ready',
    once: true,
    /**
     * @param {Client} client
     */
    async execute(client) {

        // const channel = await client.channels.fetch('558929696570736660')
        const connectionString = process.env.DATABASE_URL + '?sslmode=require'
        const pgclient = new pg.Client({
            connectionString: connectionString,
            ssl: {
                rejectUnauthorized: false
            }
        });
        await pgclient.connect()
        var prefixesResults = await pgclient.query('SELECT * FROM public.prefixes;')
        for (var prefix of prefixesResults['rows']) {
            prefixes[prefix['guild_id']] = prefix['prefix']
        }
        await pgclient.end()

        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        console.log('Ready!');
        while (true) {
            const pgclient = new pg.Client({
                connectionString: connectionString,
                ssl: {
                    rejectUnauthorized: false
                }
            });
            await pgclient.connect()
            var channels = await pgclient.query('SELECT * FROM disruption_channels;')
            await pgclient.end()
                // console.log(channels)

            const disruptions = await ptv.getDisruptions();

            const disruptionsEmbeds = await ptv.disruptionsToEmbed(disruptions);

            var disruptionsToUpdate = {};

            var oldDisruptionsEmbeds = {};

            try {
                oldDisruptionsEmbeds = require('./InfoFiles/disruptions.json')
            } catch {
                oldDisruptionsEmbeds = {}
            }

            // Adds Embeds that need to be updated to list disruptionsToUpdate
            if (oldDisruptionsEmbeds == {}) {
                disruptionsToUpdate = disruptionsEmbeds
            } else {
                for (var i in disruptionsEmbeds) {
                    if (disruptionsEmbeds[i] !== oldDisruptionsEmbeds[i]) {
                        disruptionsToUpdate[i] = disruptionsEmbeds[i];
                    }
                }
            }

            // console.log("DISRUPTIONS TO UPDATE" + JSON.stringify(disruptionsToUpdate))

            for (var disruption in disruptionsToUpdate) {
                for (var serverChannels of channels['rows']) {
                    var channel = await client.channels.fetch(serverChannels['channel_id'])
                    var message = await channel.messages.fetch(serverChannels[disruption])
                    disruptionsToUpdate[disruption].setTimestamp()
                    await message.edit({ content: null, embeds: [disruptionsToUpdate[disruption]] })
                }
            }

            for (var serverChannels of channels['rows']) {
                channel = await client.channels.fetch(serverChannels['channel_id'])
                message = await channel.messages.fetch(serverChannels['18'])
                await message.edit({ content: `Last Checked for Disruptions at <t:${Math.round((new Date()).getTime() / 1000)}:f>
The side bar will be yellow if a Planned Work is currently active.
Source: Licensed from Public Transport Victoria under a Creative Commons Attribution 4.0 International Licence.
Be sure to join my discord server for official VPTBot support/feedback! https://discord.gg/KEhCS8U` })
            }

            const disruptionstxt = JSON.stringify(disruptionsEmbeds);

            fs.writeFile('./InfoFiles/disruptions.json', disruptionstxt, (err) => {
                if (err) {
                    console.log(err);
                }
            })

            // await channel.send('test')
            await delay(60000)
        }
    }
};