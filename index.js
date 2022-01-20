require('dotenv').config()

const { Client, Collection } = require('discord.js');
const token = process.env.VPTBOT;
const { promisify } = require('util')
const { glob } = require('glob')
const pG = promisify(glob)
const Ascii = require('ascii-table')

const client = new Client({ intents: 32767, partials: ['CHANNEL'] });



client.slashCommands = new Collection();
client.prefixCommands = new Collection();
client.cooldowns = new Collection();
client.prefixes = new Collection();

['events', 'commands'].forEach(handler => {
    require(`./handlers/${handler}`)(client, pG, Ascii)
})
process.on('unhandledRejection', error => {
    console.log(error)
})

client.login(token);