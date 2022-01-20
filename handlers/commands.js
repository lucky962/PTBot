const { Permissions } = require('discord.js')
module.exports = async(client, pG, Ascii) => {
    const Perms = Object.keys(Permissions.FLAGS)
    const Table = new Ascii('Commands Loaded')
    Table.setHeading('Command', 'Module', 'Status')

    const slashCommandsArray = [];
    (await pG(`${process.cwd()}/modules/*/slashCommands/*.js`)).map(async(file) => {
        const command = require(file)

        if (!command.name) {
            const L = file.split('/')
            return Table.addRow(`${L[9] + '/' + L[11]}`, '🔶 FAILED', 'Missing a name.')
        }

        if (!command.module) {
            return Table.addRow(command.name, '🔶 FAILED', 'Missing a module.')
        }
        if (command.prefix) {
            if (command.permission) {
                if (!Perms.includes(command.permission)) {
                    return Table.addRow(command.name, '🔶 FAILED', 'Invalid Permissions')
                }
            }
            client.prefixCommands.set(command.name, command)
        } else {

            if (!command.context && !command.description) {
                return Table.addRow(command.name, '🔶 FAILED', 'missing a description.')
            }

            if (command.permission) {
                if (Perms.includes(command.permission)) {
                    command.defaultPermission = false
                } else {
                    return Table.addRow(command.name, '🔶 FAILED', 'Invalid Permissions')
                }
            }

            client.slashCommands.set(command.name, command)
            slashCommandsArray.push(command)

            await Table.addRow(command.name, command.module, '✅ SUCCESSFUL')
        }
    })
    console.log(Table.toString())

    // PERMISSIONS CHECK//

    client.on('ready', async() => {
        client.guilds.cache.forEach((guild) => {
            guild.commands.set(slashCommandsArray).then(async(command) => {
                const role = (commandName) => {
                    const cmdPerms = slashCommandsArray.find((c) => c.name === commandName).permission
                    if (!cmdPerms) return null

                    return guild.roles.cache.filter((r) => r.permissions.has(cmdPerms) && !r.managed)
                }

                const fullPermissions = command.reduce((accumulator, r) => {
                    const roles = role(r.name)
                    if (!roles) return accumulator

                    const permissions = roles.reduce((a, r) => {
                        return [...a, { id: r.id, type: 'ROLE', permission: true }]
                    }, [])

                    return [...accumulator, { id: r.id, permissions }]
                }, [])

                await guild.commands.permissions.set({ fullPermissions })
            })
        })
        client.slashCommands.set(slashCommandsArray)
    })
}