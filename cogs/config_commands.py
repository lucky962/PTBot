import discord
import json
from discord.ext import commands
import traceback
import sys
import os
import psycopg2

class ConfigCommands(commands.Cog):
    def __init__(self,bot):
        self.bot = bot

    @commands.command(name='invite')
    async def do_invite(self, ctx):
        await ctx.send("Bot Invite Link: https://discordapp.com/oauth2/authorize?client_id=503096810961764364&scope=bot&permissions=0")

    @commands.group(name='setprefix')
    @commands.has_permissions(manage_guild=True)
    @commands.guild_only()
    async def do_setprefix(self, ctx, prefix):
        if len(prefix) > 5:
            await ctx.send("The prefix must be less than 6 characters.")
            return    
        DATABASE_URL = os.environ['DATABASE_URL']
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        cur = conn.cursor()
        cur.execute(f'DELETE FROM prefixes WHERE guild_id = {ctx.message.guild.id};')
        cur.execute(f"INSERT INTO prefixes (guild_id, prefix) VALUES ({ctx.message.guild.id}, '{prefix}');")
        conn.commit()
        cur.close()
        conn.close()
        await ctx.send(f"Your prefix has been changed to '{prefix}'")
    @do_setprefix.error
    async def setprefixerror(self,ctx,error):
        if isinstance(error, commands.MissingPermissions):
            await ctx.send("Sorry, you are required to have the manage server permission to run this command")
        elif isinstance(error, commands.NoPrivateMessage):
            await ctx.send("This command is a server only command. You cannot use this in DMs.")
        else:
            print('Ignoring exception in command {}:'.format(ctx.command), file=sys.stderr)
            await ctx.send('An error has occured. This error has been reported and will be fixed as soon as possible.')
            await self.bot.get_user(244596682531143680).send(f'ERROR\nIgnoring exception in command {ctx.command}\n Command Sent: {ctx.message.content}\n{type(error)}\n{error}\n{error.__traceback__}')
            traceback.print_exception(type(error), error, error.__traceback__, file=sys.stderr)
        
    @commands.group(name='prefix')
    async def do_prefix(self, ctx):
        global json
        with open('./InfoFiles/prefixes.json', 'r') as f:
            prefixes = json.load(f)
        await ctx.send(f"Your current prefix is '{prefixes[str(ctx.message.guild.id)] if str(ctx.message.guild.id) in prefixes else 'pt!'}'. To change your prefix, use the setprefix command!")

def setup(bot):
    bot.add_cog(ConfigCommands(bot))