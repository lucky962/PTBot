import discord
import asyncio
import re
import os
import datetime
# import git
import sys
import json
import dbl
import psycopg2
import logging
from discord.ext import commands

from classes.PTVFormatter import PTVFormatter
import sys, traceback

debug_mode = False

if debug_mode:
    TOKEN = os.environ['VPTBOT_DEVELOPMENT']
    # logging.basicConfig(level=logging.DEBUG)
else:
    TOKEN = os.environ['VPTBOT']

initial_extensions = ['cogs.error_handler',
                      'cogs.train_commands',
                      'cogs.config_commands',
                      'cogs.help_command']


def get_prefix(bot, message):
    try:
        DATABASE_URL = os.environ['DATABASE_URL']
    except KeyError:
        return commands.when_mentioned_or('pt!', 'Pt!', 'pT!', 'PT!')(bot, message)
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    cur = conn.cursor()
    prefix = None
    if message.guild:
        cur.execute(f"SELECT * FROM prefixes WHERE guild_id = {message.guild.id}")
        prefix = cur.fetchone()
    if prefix == None:
        return commands.when_mentioned_or('pt!', 'Pt!', 'pT!', 'PT!')(bot, message)
    else:
        return commands.when_mentioned_or(prefix[1])(bot, message)

bot = commands.Bot(command_prefix=get_prefix, description='Shows Victorian Train Information', case_insensitive=True)
PTV = PTVFormatter(os.environ['PTV_DEV_ID'],os.environ['PTV_DEV_KEY'])
dblpy = dbl.DBLClient(bot, os.environ['DBL_TOKEN'])

try:
    with open ("./InfoFiles/disruptions.json", 'r') as f:
        disruptions = json.load(f)
except FileNotFoundError:
    with open ("./InfoFiles/disruptions.json", 'w+') as f:
        f.write('{"1":["l"], "2":["l"],"3":["l"],"4":["l"],"5":["l"],"6":["l"],"7":["l"],"8":["l"],"9":["l"],"10":[],"11":["l"],"12":["l"],"13":["l"],"14":["l"],"15":["l"],"16":["l"],"17":["l"]}')

with open ("./InfoFiles/routes.json", 'r') as f:
    bot.routes = json.load(f)

bot.remove_command('help')

if __name__ == '__main__':
    for extension in initial_extensions:
        try:
            bot.load_extension(extension)
        except Exception as e:
            print(f'Failed to load extension {extension}.', file=sys.stderr)
            traceback.print_exc()

def _splicegen(maxchars, stringlist):
    """
    Return a list of slices to print based on maxchars string-length boundary.
    """
    runningcount = 0  # start at 0
    tmpslice = []  # tmp list where we append slice numbers.
    for item in stringlist:
        runningcount += len(item)
        if runningcount <= int(maxchars):
            tmpslice.append(item)
        else:
            yield tmpslice
            tmpslice = [item]
            runningcount = len(item)
    yield(tmpslice)

async def my_background_task():
    await bot.wait_until_ready()
    # disruptionschannel = bot.get_channel(545113422283669514)
    while not bot.is_closed():
        await bot.change_presence(activity=discord.Activity(type=discord.ActivityType.watching, name=f'Trains with {len(bot.guilds)} servers! || pt!help'))
        try:
            await dblpy.post_guild_count()
        except:
            print('An error has occured posting server count')
        await asyncio.sleep(60)

async def disruptions_task():
    await bot.wait_until_ready()
    print('BOT READY')
    while not bot.is_closed():
        # {"1":["l"], "2":["l"],"3":["l"],"4":["l"],"5":["l"],"6":["l"],"7":["l"],"8":["l"],"9":["l"],"10":[],"11":["l"],"12":["l"],"13":["l"],"14":["l"],"15":["l"],"16":["l"],"17":["l"]}
        try:
            bot.disruptions, notuptodatedisruption = PTV.UpdateDisruptions(bot)
            # channelstodelete = []
            disruptionchannels = {}
            DATABASE_URL = os.environ['DATABASE_URL']
            conn = psycopg2.connect(DATABASE_URL, sslmode='require')
            cur = conn.cursor()
            cur.execute("SELECT * FROM disruption_channels")
            disruptionchannelsstorage = cur.fetchall()
            for row in disruptionchannelsstorage:
                disruptionchannels[str(row[0])] = {"1":row[1],"2":row[2],"3":row[3],"4":row[4],"5":row[5],"6":row[6],"7":row[7],"8":row[8],"9":row[9],"11":row[10],"12":row[11],"13":row[12],"14":row[13],"15":row[14],"16":row[15],"17":row[16],"18":row[17]}
            cur.close()
            conn.close()
            # with open('./InfoFiles/disruptionchannels.json', 'r') as f:
            #     disruptionchannels = json.load(f)
            #     # disruptionchannelsold = dict(disruptionchannels)
            for j in notuptodatedisruption:
                for channel, messages in disruptionchannels.items():
                    if messages[j]:
                        messagerouteid = j
                        messageid = messages[j]
                        disruptionsmsg = discord.Embed(name="Disruptions", description=bot.routes[str(messagerouteid)]["route_name"], timestamp=datetime.datetime.now() - datetime.timedelta(hours=11), color=3447003)
                        disruptionsmsg = PTV.disruptions_to_embed(disruptionsmsg, bot.disruptions[str(messagerouteid)], messagerouteid, bot)
                        disruptionsmsg.set_footer(icon_url=bot.user.avatar_url, text=f'Last Disruption Update ')
                        try:
                            disruptionmsgobj = await bot.get_channel(int(channel)).fetch_message(messageid)
                        except AttributeError:
                            # if not channel in channelstodelete:
                            #     channelstodelete.append(channel)
                            continue
                        try:
                            await disruptionmsgobj.edit(content = "", embed = disruptionsmsg)
                        except discord.errors.HTTPException:
                            await disruptionmsgobj.edit(content = "ERROR - Disruptions have too many characters for an embed field.", embed = None)
            for channel, messages in disruptionchannels.items():
                if messages["18"]:
                    try:
                        updatedtime = await bot.get_channel(int(channel)).fetch_message(messages["18"])
                    except AttributeError:
                        # if not channel in channelstodelete:
                        #     channelstodelete.append(channel)
                        continue
                    await updatedtime.edit(content = f"Last Checked for Disruptions at {(datetime.datetime.now()).strftime('%I:%M%p %d %b %Y')}\nThe side bar will be yellow if a Planned Work is currently active.\nSource: Licensed from Public Transport Victoria under a Creative Commons Attribution 4.0 International Licence.\nBe sure to join my discord server for official VPTBot support/feedback! https://discord.gg/KEhCS8U")
            # for channel in channelstodelete:
            #     del disruptionchannels[channel]
            # with open('./InfoFiles/disruptionchannels.json', 'r') as f:
            #     disruptionchannelsnew = json.load(f)
            # if disruptionchannelsnew == disruptionchannelsold:
            #     with open('./InfoFiles/disruptionchannels.json', 'w') as f:
            #         f.write(json.dumps(disruptionchannels))
            await asyncio.sleep(60)
        except Exception as e:
            print(f"ERROR OCCURED {e}")
            traceback.print_exc()
            await asyncio.sleep(5)
            pass

@bot.event
async def on_ready():
    global json
    """http://discordpy.readthedocs.io/en/rewrite/api.html#discord.on_ready"""

    print(f'\n\nLogged in as: {bot.user.name} - {bot.user.id}\nVersion: {discord.__version__}\n')

    # Changes our bots Playing Status.
    await bot.change_presence(activity=discord.Activity(type=discord.ActivityType.watching, name='Trains! || pt!help'))
    print(f'Successfully logged in and booted...!')
    updatesmessage = await bot.get_channel(553466650347962372).fetch_message(557735165896425492)
    Updates = discord.Embed(timestamp=datetime.datetime.now())
    Updates.set_author(name='VPT Bot', icon_url=bot.user.avatar_url)
    Updates.add_field(name='Feature Updates', value=':white_check_mark: Show disruptions in nexttrain command.\n:white_check_mark: NextTrain Command\n:white_check_mark: Better looking help command! \n:white_check_mark: Customisable prefixes.\n:white_check_mark: A configurable disruptions channel!\n:white_check_mark: More detailed nexttrain command.\n:ok_hand: Feedback message after commands.', inline=False)
    Updates.add_field(name='General Improvements', value=':white_check_mark: Speed Improvements for nexttrain command.\n:white_check_mark: Made ETA: NOW if train was at station.')
    Updates.add_field(name='Bugs', value=':white_check_mark: NextTrain command for City Loop Stations don\'t work. \n:white_check_mark: Case sensitivity for stations.\n:white_check_mark: Fixes message if station not found.\n:thumbsup: Saved Disruptions Channel info gets deleted upon error code from PTV resulting in not up-to-date disruptions info.', inline=False)
    Updates.add_field(name='Key', value=':white_check_mark: Updated and deployed into bot\n:thumbsup: Beta testing, don\'t expect much. \n:ok_hand: Developing/Fixing\n:raised_hand: Under Investigation', inline=False)
    Updates.set_footer(icon_url=bot.user.avatar_url, text=f'Last Updated ')
    if debug_mode == False:
        await updatesmessage.edit(embed=Updates)
        bot.loop.create_task(my_background_task())
        bot.loop.create_task(disruptions_task())

@bot.event
async def on_message(message):
    # print(f"Message by {message.author} in {message.channel} in {message.guild} at {datetime.datetime.now()}")
    # print(message.content)
    if not message.guild:
        if message.author.id != 503096810961764364 and message.author.id != 558928207357673493 and not message.content.lower().startswith("pt!"):
            await message.channel.send('Thank you for your message, it will be passed on to lucky962. If you instead wanted to run a command, please make sure to include the prefix ("pt!") at the start of your message.')
            await bot.get_user(244596682531143680).send(f'You received a message from {message.author.name} ({message.author.id}) saying:\n{message.content}')
    await bot.process_commands(message)

@bot.command(name='await', description='**lucky962 only** does an await command', brief='**lucky962 only** does an await command')
@commands.is_owner()
async def do_await(ctx, *, args):
    await ctx.message.delete()
    await eval(args)

bot.run(TOKEN, bot=True, reconnect=True)
