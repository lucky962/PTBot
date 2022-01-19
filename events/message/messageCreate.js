require('dotenv').config()
const ptvFormatter = require('./functions/PTVFormatter');
const { Client, Message, MessageEmbed } = require('discord.js')
const devId = process.env.PTV_DEV_ID;
const apiKey = process.env.PTV_DEV_KEY;
const pg = require('pg');
const connectionString = process.env.DATABASE_URL + '?sslmode=require'
let prefix;
module.exports = {
    name: 'messageCreate',
    /**
     * 
     * @param {Message} message 
     * @param {Client} client
     */
    async execute(message, client) {
        const prefixes = client.prefixes
        const avatar_url = 'https://cdn.discordapp.com/avatars/503096810961764364/f89dad593aa8635ccddd3d364ad9c46a.png';
        let ptv = new ptvFormatter(devId, apiKey);
        console.log(message.content)
        console.log(!(message.guildId in prefixes))
        console.log(message.content.startsWith(prefixes[message.guildId]))
        if ((message.guildId in prefixes & message.content.startsWith(prefixes[message.guildId])) | ((!(message.guildId in prefixes) & message.content.toLowerCase().startsWith('pt!')))) {
            const command = message.content.replace(prefixes[message.guildId], '').toLowerCase().replace('pt!', '');
            if (command.startsWith('next ')) {
                stops = await ptv.searchToMenu(command.replace('next ', ''), [0, 1, 2, 3, 4]);
                await message.reply({ content: 'Which station would you like?', components: [stops] });
            } else if (command.startsWith('nexttrain') | command.startsWith('nt ') | command.startsWith('tn ') | command.startsWith('tnext ') | command.startsWith('nextt ')) {
                stops = await ptv.searchToMenu(command.replace('nexttrain ', '').replace('nt ', '').replace('tn ', '').replace('tnext ', '').replace('nextt ', ''), [0, 3]);
                await message.reply({ content: 'Which station would you like?', components: [stops] });
            } else if (command.startsWith('nextbus') | command.startsWith('nb') | command.startsWith('bn') | command.startsWith('bnext') | command.startsWith('nextb')) {
                stops = await ptv.searchToMenu(command.replace('nextbus ', '').replace('nb ', '').replace('bn ', '').replace('bnext ', '').replace('nextb ', ''), [2, 4]);
                await message.reply({ content: 'Which station would you like?', components: [stops] });
            } else if (command.startsWith('nexttram') | command.startsWith('ntr') | command.startsWith('trn') | command.startsWith('trnext') | command.startsWith('nexttr')) {
                stops = await ptv.searchToMenu(command.replace('nexttram ', '').replace('ntr ', '').replace('trn ', '').replace('trnext ', '').replace('nexttr ', ''), [1]);
                await message.reply({ content: 'Which station would you like?', components: [stops] });
            } else if (command.startsWith('nextvline') | command.startsWith('nv') | command.startsWith('vn') | command.startsWith('vnext') | command.startsWith('nextv')) {
                stops = await ptv.searchToMenu(command.replace('nextvline ', '').replace('nv ', '').replace('vn ', '').replace('vnext ', '').replace('nextv ', ''), [3]);
                await message.reply({ content: 'Which station would you like?', components: [stops] });
            } else if (command.startsWith('setprefix ')) {
                const prefix = command.replace('setprefix ', '');
                if (prefix.length < 6) {
                    const pgclient = new pg.Client({
                        connectionString: connectionString,
                        ssl: {
                            rejectUnauthorized: false
                        }
                    });
                    await pgclient.connect()
                    await pgclient.query('DELETE FROM prefixes WHERE guild_id = $1;', [message.guildId])
                    await pgclient.query(`INSERT INTO prefixes (guild_id, prefix) VALUES($1, $2)`, [message.guildId, prefix])
                    var prefixesResults = await pgclient.query('SELECT * FROM public.prefixes;')
                    for (var prefixez of prefixesResults['rows']) {
                        prefixes[prefixez['guild_id']] = prefixez['prefix']
                    }
                    await pgclient.end()
                    await message.reply('Successfully changed prefix')
                } else {
                    await message.reply('Prefix too long, it needs to be 5 characters or less.')
                }
            } else if (command.startsWith('help')) {
                if (message.guildId in prefixes) {
                    prefix = prefixes[message.guildId]
                } else {
                    prefix = 'pt!'
                }
                const HelpMsg = new MessageEmbed()
                    .setTitle('Help Page')
                    .setDescription(`This is a page full of commands you can use with VPT Bot
        NOTE: ONLY SLASH COMMANDS SUPPORT OPTIONAL ARGUMENTS
        ALSO, discord doesn't like us using non-slash commands (one where the prefix is ${prefix}) and so they will no longer work if I get to 75 servers and it is after April 30 2022.
        To read more, visit https://support-dev.discord.com/hc/en-us/articles/4404772028055 or ask in the VPTBot server :)`)
                    .setAuthor('VPT Bot', avatar_url)
                    .addField('Key', '[argument] - required argument you need to provide for the command\n<argument> - optional argument you can provide')
                    .addField(`(${prefix} or /)help`, `Displays this help message!`)
                    .addField(`(${prefix} or /)next [station] <route_type> <minutes>`, `Shows next 3 departures per direction from a station.`)
                    .addField(`(${prefix} or /)setdisruptionschannel [channel]`, `Keeps channel specified up to date with current train disruptions.`)
                    .addField(`(${prefix} or /)invite`, `Sends invite link for the bot`)
                    .addField(`${prefix}next(train/bus/tram/vline) [station] \n(alias = (next/n)(t/b/t/v) or (t/b/t/v)(next/n)`, `Shows next 3 departures per direction from a station for a route type.`)
                    .addField(`${prefix}setprefix [prefix]`, `Sets a new prefix`)
                    .setFooter('© VPT Bot', avatar_url)

                await message.reply({ embeds: [HelpMsg] })
            } else if (command.startsWith('setdisruptionschannel ')) {

                const channelId = command.replace('setdisruptionschannel ', '').substring(2).substring(0, 18)

                var channel = null;

                try {
                    channel = await message.guild.channels.fetch(channelId);
                } catch (error) {
                    if (error.code == 50035) {
                        await message.reply({ content: 'Channel not found, please mention the channel.' })
                        return
                    } else {
                        throw (error)
                    }
                }

                const disruptions = await ptv.getDisruptions();

                const disruptionsEmbeds = await ptv.disruptionsToEmbed(disruptions);

                var messages = []

                for (var disruptionEmbed in disruptionsEmbeds) {
                    disruptionEmbed.setTimestamp()
                    messages.push((await channel.send({ embeds: [disruptionsEmbeds[disruptionEmbed]] })).id);
                }

                messages.push((await channel.send({ content: `Last Checked for Disruptions at <t:${Math.round((new Date()).getTime() / 1000)}:f>
        The side bar will be yellow if a Planned Work is currently active.
        Source: Licensed from Public Transport Victoria under a Creative Commons Attribution 4.0 International Licence.
        Be sure to join my discord server for official VPTBot support/feedback! https://discord.gg/KEhCS8U` })).id);

                console.log(messages)

                const pgclient = new pg.Client({
                    connectionString: connectionString,
                    ssl: {
                        rejectUnauthorized: false
                    }
                });
                await pgclient.connect()
                await pgclient.query('DELETE FROM disruption_channels WHERE channel_id = $1;', [channelId])
                await pgclient.query(`INSERT INTO disruption_channels ("channel_id", "1", "2", "3", "4", "5", "6", "7", "8", "9", "11", "12", "13", "14", "15", "16", "17", "18") VALUES(${channelId}, ${messages.join(', ')})`)
                await pgclient.end()

                await message.reply({ content: 'Successfully created disruptions channel.' })
            }
        }
    }
}