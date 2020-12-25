import discord
import json
from discord.ext import commands
import os
import psycopg2

class HelpCommands(commands.Cog):
    def __init__(self,bot):
        self.bot = bot

    @commands.group(name='help')
    async def do_help(self, ctx):
        if ctx.guild:
            try:
                DATABASE_URL = os.environ['DATABASE_URL']
                conn = psycopg2.connect(DATABASE_URL, sslmode='require')
                cur = conn.cursor()
                cur.execute(f"SELECT * FROM prefixes WHERE guild_id = {ctx.guild.id}")
                prefix = cur.fetchone()
            except KeyError:
                prefix = None
        if prefix == None:
            prefix = 'pt!'
        else:
            prefix = prefix[1]
        HelpMsg = discord.Embed(title='Help Page', description='This is a page full of commands you can use with VPT Bot', color=3447003)
        HelpMsg.set_author(name='VPT Bot', icon_url=self.bot.user.avatar_url)
        HelpMsg.add_field(name=prefix + 'help', value='Displays this help message!', inline=False)
        HelpMsg.add_field(name=prefix + 'next [station]', value='Shows next 3 departures per direction from a station.', inline=False)
        HelpMsg.add_field(name=prefix + 'next(train/bus/tram/vline) [station] \n(alias = (next/n)(t/b/t/v) or (t/b/t/v)(next/n)', value='Shows next 3 departures per direction from a station for a route type.', inline=False)
        HelpMsg.add_field(name=prefix + 'next [station]', value='Shows next 3 departures per direction from a station for all route types.', inline=False)
        HelpMsg.add_field(name=prefix + 'setdisruptionschannel [channel]', value='Keeps channel specified up to date with current train disruptions.', inline=False)
        HelpMsg.add_field(name=prefix + 'invite', value='Sends you a link to invite the bot.', inline=False)
        HelpMsg.add_field(name=prefix + 'prefix', value='Shows your current set prefix.', inline=False)
        HelpMsg.add_field(name=prefix + 'setprefix [prefix]', value='Sets a new prefix.', inline=False)
        HelpMsg.set_footer(icon_url=self.bot.user.avatar_url, text='© VPT Bot')
        await ctx.send(embed=HelpMsg)

def setup(bot):
    bot.add_cog(HelpCommands(bot))