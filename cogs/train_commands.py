import discord
import os
import datetime
import json
import asyncio
import psycopg2
from discord.ext import commands
from ptv.client import PTVClient
from classes.PTVFormatter import PTVFormatter
from enum import Enum
from dateutil.relativedelta import relativedelta
import sys
import traceback
from urllib.error import HTTPError

PTV = PTVFormatter(os.environ['PTV_DEV_ID'],os.environ['PTV_DEV_KEY'])
# PTVA = PTVApi(os.environ['PTV_DEV_ID'],os.environ['PTV_DEV_KEY'])

with open('./InfoFiles/stations.json', 'r') as f:
    stations = json.load(f)
with open('./InfoFiles/directions.json', 'r') as f:
    directionss = json.load(f)

class RouteType(Enum):
    TRAIN = 0
    TRAM = 1
    BUS = 2
    VLINE = 3
    NIGHT_BUS = 4

class TrainCommands(commands.Cog):
    def __init__(self,bot):
        self.bot = bot
        
    def _splicegen(self, maxchars, stringlist):
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

    async def get_departures(self, ctx, route_type, station):
        noinemoji = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"]
        await ctx.trigger_typing()
        nexttrains = PTV.search(station, route_types=route_type, include_addresses=False, include_outlets=False, match_stop_by_suburb=False, match_route_by_suburb=False)
        i = 0
        trainoptionsmessage = []
        if len(nexttrains['stops']) > 1:
            for i in range(0, min(len(nexttrains['stops']), 5)):
                type_route = ['<:Metro:771920140207259659> (Metro)', '<:Tram:771921271998382140> (Tram)', '<:Bus:771921102335246346> (Bus)', '<:VLine:771920567959683102> (Vline)', '<:Bus:771921102335246346> (Night Bus)']
                trainoptionsmessage.append(f"{noinemoji[i + 1]} {(type_route[nexttrains['stops'][i]['route_type']])} {nexttrains['stops'][i]['stop_name']} in {nexttrains['stops'][i]['stop_suburb']}")
            trainoptionsmessage = await ctx.send("Which Station are you talking about?\n" + '\n'.join(trainoptionsmessage))
            for i in range(0, min(len(nexttrains['stops']), 5)):
                await trainoptionsmessage.add_reaction(noinemoji[i + 1])
            def check(reaction, user):
                return user == ctx.message.author and reaction.emoji in noinemoji and reaction.message.id == trainoptionsmessage.id

            try:
                reaction, user = await self.bot.wait_for('reaction_add', timeout=30.0, check=check)
            except asyncio.TimeoutError:
                await trainoptionsmessage.edit(content="Sorry, message timeout, please ask again")
                if ctx.message.guild:
                    try:
                        await trainoptionsmessage.clear_reactions()
                    except discord.errors.Forbidden:
                        await ctx.send("This bot requires the `manage_messages` permission to work properly. This command will still work without it, but not as well.")
                return
            else:
                await trainoptionsmessage.edit(content="Getting Information, Please wait")
                if ctx.message.guild:
                    try:
                        await trainoptionsmessage.clear_reactions()
                    except discord.errors.Forbidden:
                        await ctx.send("This bot requires the `manage_messages` permission to work properly. This command will still work without it, but not as well.")
                station = nexttrains['stops'][noinemoji.index(str(reaction)) - 1]
        elif len(nexttrains['stops']) == 0:
            await ctx.send('Sorry the station you specified was not found. Please make sure it is a station from Victoria, Australia as this bot only supports Victoria at this time.\nIf you believe this is an error, please dm me or lucky962')
            return
        else:
            trainoptionsmessage = await ctx.send("Getting Information, Please wait")
            station = nexttrains['stops'][0]
        nexttrains = PTV.get_departures_from_stop(station['route_type'], station['stop_id'], max_results=3, expand=["all"])
        embed = discord.Embed(title='Next Trains')
        embed.set_author(name='VPT Bot', icon_url=self.bot.user.avatar_url)
        nexttrains['directions'] = dict(sorted(nexttrains['directions'].items(), key=lambda p: int(p[0])))
        for directions in nexttrains['directions'].values():
            nexttrain = []
            traincounter = 0
            for train in nexttrains['departures']:
                if train['direction_id'] == directions['direction_id'] and traincounter < 3:
                    traincounter += 1
                    train['scheduled_departure_utc'] = (datetime.datetime.strptime(train['scheduled_departure_utc'],'%Y-%m-%dT%H:%M:%SZ') + datetime.timedelta(hours=11))
                    try:
                        train['estimated_departure_utc'] = (datetime.datetime.strptime(train['estimated_departure_utc'],'%Y-%m-%dT%H:%M:%SZ') + datetime.timedelta(hours=11))
                    except TypeError:
                        pass
                    flags = ""
                    if "S_WCA" in train['flags']:
                        flags += ("<:WCA:780582086398181386> ")
                    if "S_VTR" in train['flags']:
                        flags += ("VLine Train")
                    if "S_VCH" in train['flags']:
                        flags += ("VLine Coach")
                    nexttrain.append(f"{'Plat: ' + train['platform_number'] + '.' if train['platform_number'] else ''} {nexttrains['runs'][str(train['run_id'])]['vehicle_descriptor']['description'] if  str(train['run_id']) in nexttrains['runs'] and nexttrains['runs'][str(train['run_id'])]['vehicle_descriptor'] and nexttrains['runs'][str(train['run_id'])]['vehicle_descriptor']['description'] else ''} \nTo: {nexttrains['runs'][str(train['run_id'])]['destination_name']}\nScheduled to leave at: {train['scheduled_departure_utc'].strftime('%I:%M%p')}. ETA: {(str(relativedelta(train.get('estimated_departure_utc'), datetime.datetime.now()).minutes) + ' minutes' if type(train.get('estimated_departure_utc')) == datetime.datetime else train.get('estimated_departure_utc'))}\n" + ("Flags: " + flags + "\n" if flags else ""))
                elif traincounter >= 3:
                    break
            if len(nexttrain) > 0:
                embed.add_field(name=directions['direction_name'] + (" (Route " + nexttrains['routes'][str(directions['route_id'])]['route_number'] + ")" if nexttrains['routes'][str(directions['route_id'])]['route_number'] else ""), value='\n'.join(nexttrain))
        disruptionsmsng = discord.Embed(title='Potential Disruptions', description=f"Potential disruptions that might affect {station['stop_name']}", color=0x0072ce)
        disruptionsmsng.set_author(name='VPT Bot', icon_url=self.bot.user.avatar_url)
        if station['route_type'] == 0:
            embed.title = "Next Trains"
            embed.description = f"Trains departing from {station['stop_name']}"
            embed.colour = 0x0072ce
            disruptionsmsng.colour = 0x0072ce
            TransportIcon = discord.File("./src/Icons/Metro.png", filename="Metro.png")
            embed.set_thumbnail(url="attachment://Metro.png")
        elif station['route_type'] == 1:
            embed.title = "Next Trams"
            embed.description = f"Trams departing from {station['stop_name']}"
            embed.colour = 0x78be20
            disruptionsmsng.colour = 0x78be20
            TransportIcon = discord.File("./src/Icons/Tram.png", filename="Tram.png")
            embed.set_thumbnail(url="attachment://Tram.png")
        elif station['route_type'] == 2 or station['route_type'] == 4:
            embed.title = "Next Buses"
            embed.description = f"Buses departing from {station['stop_name']}"
            embed.colour = 0xff8200
            disruptionsmsng.colour = 0xff8200
            TransportIcon = discord.File("./src/Icons/Bus.png", filename="Bus.png")
            embed.set_thumbnail(url="attachment://Bus.png")
        elif station['route_type'] == 3:
            embed.title = "Next VLine Trains"
            embed.description = f"VLine Trains departing from {station['stop_name']}"
            embed.colour = 0x8f1a95
            disruptionsmsng.colour = 0x8f1a95
            TransportIcon = discord.File("./src/Icons/VLine.png", filename="VLine.png")
            embed.set_thumbnail(url="attachment://VLine.png")
        disruptions = nexttrains['disruptions']
        listofdisruptions = [[]]
        field = 0
        length = 0
        for disruption in disruptions.values():
            if disruption['display_status'] == True:
                if length + len(f"[{disruption['title']}]({disruption['url']})\n") > 1024:
                    listofdisruptions.append([])
                    field += 1
                    length = 0
                length += len(f"[{disruption['title']}]({disruption['url']})\n")
                listofdisruptions[field].append(f"[{disruption['title']}]({disruption['url']})")
        for i in listofdisruptions:
            disruptionsmsng.add_field(name="Potential Disruptions", value='\n'.join(i))
        embed.set_footer(icon_url=self.bot.user.avatar_url, text='Source: Licensed from Public Transport Victoria under a Creative Commons Attribution 4.0 International Licence.')
        disruptionsmsng.set_footer(icon_url=self.bot.user.avatar_url, text='Source: Licensed from Public Transport Victoria under a Creative Commons Attribution 4.0 International Licence.')
        await ctx.send(content="", file=TransportIcon, embed=embed)
        await trainoptionsmessage.delete()
        if listofdisruptions[0]:
            await ctx.send(embed=disruptionsmsng)

    @commands.command(name='nexttrain', aliases=['nt', 'tn', 'tnext', 'nextt'])
    async def do_nexttrain(self, ctx, *, station):
        await self.get_departures(ctx, [RouteType.TRAIN.value, RouteType.VLINE.value], station)
    
    @commands.command(name='nextbus', aliases=['nb', 'bn', 'bnext', 'nextb'])
    async def do_nextbus(self, ctx, *, station):
        await self.get_departures(ctx, [RouteType.BUS.value, RouteType.NIGHT_BUS.value], station)

    @commands.command(name='nexttram', aliases=['ntr', 'trn', 'trnext', 'nexttr', 'nam', 'amn', 'amnext', 'nextam'])
    async def do_nexttram(self, ctx, *, station):
        await self.get_departures(ctx, [RouteType.TRAM.value], station)
    
    @commands.command(name='nextvline', aliases=['vt', 'tv', 'vnext', 'nextv'])
    async def do_nextvline(self, ctx, *, station):
        await self.get_departures(ctx, [RouteType.VLINE.value], station)

    @commands.command(name='next', aliases=['n'])
    async def do_next(self, ctx, *, station):
        await self.get_departures(ctx, [RouteType.TRAIN.value, RouteType.TRAM.value, RouteType.BUS.value, RouteType.VLINE.value, RouteType.NIGHT_BUS.value], station)

    @do_nexttrain.error
    @do_nextbus.error
    @do_nexttram.error
    @do_nextvline.error
    @do_next.error
    async def nexterror(self,ctx,error):
        if isinstance(error, commands.MissingRequiredArgument):
            await ctx.send('No station specified.')
        elif isinstance(error, discord.errors.Forbidden):
            await ctx.send("Sorry, I do not have enough permissions to complete your command.")
        elif isinstance(error, HTTPError) and str(error.code).startswith("5"):
            await ctx.send(f"Error: {error.code} (This is an error on PTV's side, please try again later.)")
        else:
            print('Ignoring exception in command {}:'.format(ctx.command), file=sys.stderr)
            await ctx.send('An error has occured. This error has been reported and will be fixed as soon as possible.')
            await self.bot.get_user(244596682531143680).send(f'ERROR\nIgnoring exception in command {ctx.command}\n Command Sent: {ctx.message.content}\n{type(error)}\n{error}\n{error.__traceback__}')
            traceback.print_exception(type(error), error, error.__traceback__, file=sys.stderr)


    @commands.command(name='dep')
    async def do_dep(self, ctx, minutes, *, station):
        noinemoji = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"]
        await ctx.trigger_typing()
        nexttrains = PTV.search(station, route_types=[0, 1, 2, 3], include_addresses=False, include_outlets=False, match_stop_by_suburb=False, match_route_by_suburb=False)
        i = 0
        trainoptionsmessage = []
        if len(nexttrains['stops']) > 1:
            for i in range(0, min(len(nexttrains['stops']), 5)):
                type_route = ['<:Metro:771920140207259659> (Metro)', '<:Tram:771921271998382140> (Tram)', '<:Bus:771921102335246346> (Bus)', '<:VLine:771920567959683102> (Vline)']
                trainoptionsmessage.append(f"{noinemoji[i + 1]} {(type_route[nexttrains['stops'][i]['route_type']])} {nexttrains['stops'][i]['stop_name']} in {nexttrains['stops'][i]['stop_suburb']}")
            trainoptionsmessage = await ctx.send("Which Station are you talking about?\n" + '\n'.join(trainoptionsmessage))
            for i in range(0, min(len(nexttrains['stops']), 5)):
                await trainoptionsmessage.add_reaction(noinemoji[i + 1])
            def check(reaction, user):
                return user == ctx.message.author and reaction.emoji in noinemoji and reaction.message.id == trainoptionsmessage.id

            try:
                reaction, user = await self.bot.wait_for('reaction_add', timeout=30.0, check=check)
            except asyncio.TimeoutError:
                await trainoptionsmessage.edit(content="Sorry, message timeout, please ask again")
                if ctx.message.guild:
                    try:
                        await trainoptionsmessage.clear_reactions()
                    except discord.errors.Forbidden:
                        await ctx.send("This bot requires the `manage_messages` permission to work properly. This command will still work without it, but not as well.")
                return
            else:
                await trainoptionsmessage.edit(content="Getting Information, Please wait")
                if ctx.message.guild:
                    try:
                        await trainoptionsmessage.clear_reactions()
                    except discord.errors.Forbidden:
                        await ctx.send("This bot requires the `manage_messages` permission to work properly. This command will still work without it, but not as well.")
                station = nexttrains['stops'][noinemoji.index(str(reaction)) - 1]
        elif len(nexttrains['stops']) == 0:
            await ctx.send('Sorry the station you specified was not found. Please make sure it is a station from Victoria, Australia as this bot only supports Victoria at this time.\nIf you believe this is an error, please dm me or lucky962')
            return
        else:
            trainoptionsmessage = await ctx.send("Getting Information, Please wait")
            station = nexttrains['stops'][0]
        nexttrains = PTV.get_departures_from_stop(station['route_type'], station['stop_id'], date_utc=(datetime.datetime.now() + datetime.timedelta(minutes=int(minutes))), max_results=3, expand=["all"])
        # DELETE IF WORKS WITHOUT THIS
        # if nexttrains == "Error, station not found":
        #     await ctx.send("Sorry the station you specified was not found. Please make sure it is a station from Victoria, Australia as this bot only supports Victoria at this time.\nIf you believe this is an error, please dm me or lucky962")
        #     return
        embed = discord.Embed(title='Next Trains')
        embed.set_author(name='VPT Bot', icon_url=self.bot.user.avatar_url)
        nexttrains['directions'] = dict(sorted(nexttrains['directions'].items(), key=lambda p: int(p[0])))
        for directions in nexttrains['directions'].values():
            nexttrain = []
            traincounter = 0
            for train in nexttrains['departures']:
                if train['direction_id'] == directions['direction_id'] and traincounter < 3:
                    traincounter += 1
                    train['scheduled_departure_utc'] = (datetime.datetime.strptime(train['scheduled_departure_utc'],'%Y-%m-%dT%H:%M:%SZ') + datetime.timedelta(hours=11))
                    try:
                        train['estimated_departure_utc'] = (datetime.datetime.strptime(train['estimated_departure_utc'],'%Y-%m-%dT%H:%M:%SZ') + datetime.timedelta(hours=11))
                    except TypeError:
                        pass
                    nexttrain.append(f"{'Plat: ' + train['platform_number'] + '.' if train['platform_number'] else ''} {nexttrains['runs'][str(train['run_id'])]['vehicle_descriptor']['description'] if  str(train['run_id']) in nexttrains['runs'] and nexttrains['runs'][str(train['run_id'])]['vehicle_descriptor'] and nexttrains['runs'][str(train['run_id'])]['vehicle_descriptor']['description'] else ''} \nTo: {nexttrains['runs'][str(train['run_id'])]['destination_name']}\nScheduled to leave at: {train['scheduled_departure_utc'].strftime('%I:%M%p')}. ETA: {(str(relativedelta(train.get('estimated_departure_utc'), datetime.datetime.now()).minutes) + ' minutes' if type(train.get('estimated_departure_utc')) == datetime.datetime else train.get('estimated_departure_utc'))}\n")
                elif traincounter >= 3:
                    break
            if len(nexttrain) > 0:
                embed.add_field(name=directions['direction_name'] + (" (Route " + nexttrains['routes'][str(directions['route_id'])]['route_number'] + ")" if nexttrains['routes'][str(directions['route_id'])]['route_number'] else ""), value='\n'.join(nexttrain))
        disruptionsmsng = discord.Embed(title='Potential Disruptions', description=f"Potential disruptions that might affect {station['stop_name']}", color=0x0072ce)
        disruptionsmsng.set_author(name='VPT Bot', icon_url=self.bot.user.avatar_url)
        if station['route_type'] == 0:
            embed.title = "Next Trains"
            embed.description = f"Trains departing from {station['stop_name']}"
            embed.colour = 0x0072ce
            disruptionsmsng.colour = 0x0072ce
            TransportIcon = discord.File("./src/Icons/Metro.png", filename="Metro.png")
            embed.set_thumbnail(url="attachment://Metro.png")
        elif station['route_type'] == 1:
            embed.title = "Next Trams"
            embed.description = f"Trams departing from {station['stop_name']}"
            embed.colour = 0x78be20
            disruptionsmsng.colour = 0x78be20
            TransportIcon = discord.File("./src/Icons/Tram.png", filename="Tram.png")
            embed.set_thumbnail(url="attachment://Tram.png")
        elif station['route_type'] == 2 or station['route_type'] == 4:
            embed.title = "Next Buses"
            embed.description = f"Buses departing from {station['stop_name']}"
            embed.colour = 0xff8200
            disruptionsmsng.colour = 0xff8200
            TransportIcon = discord.File("./src/Icons/Bus.png", filename="Bus.png")
            embed.set_thumbnail(url="attachment://Bus.png")
        elif station['route_type'] == 3:
            embed.title = "Next VLine Trains"
            embed.description = f"VLine Trains departing from {station['stop_name']}"
            embed.colour = 0x8f1a95
            disruptionsmsng.colour = 0x8f1a95
            TransportIcon = discord.File("./src/Icons/VLine.png", filename="VLine.png")
            embed.set_thumbnail(url="attachment://VLine.png")
        disruptions = nexttrains['disruptions']
        listofdisruptions = [[]]
        field = 0
        length = 0
        for disruption in disruptions.values():
            if disruption['display_status'] == True:
                if length + len(f"[{disruption['title']}]({disruption['url']})\n") > 1024:
                    listofdisruptions.append([])
                    # print(length)
                    field += 1
                    length = 0
                length += len(f"[{disruption['title']}]({disruption['url']})\n")
                listofdisruptions[field].append(f"[{disruption['title']}]({disruption['url']})")
        for i in listofdisruptions:
            # print(len('\n'.join(i)))
            # print('\n'.join(i))
            disruptionsmsng.add_field(name="Potential Disruptions", value='\n'.join(i))
        # print(f"DISRUPTIONSDF SD FSDOF SD FIOSD F{listofdisruptions}")
        embed.set_footer(icon_url=self.bot.user.avatar_url, text='Source: Licensed from Public Transport Victoria under a Creative Commons Attribution 4.0 International Licence.')
        disruptionsmsng.set_footer(icon_url=self.bot.user.avatar_url, text='Source: Licensed from Public Transport Victoria under a Creative Commons Attribution 4.0 International Licence.')
        # print(embed.fields)
        await ctx.send(content="", file=TransportIcon, embed=embed)
        await trainoptionsmessage.delete()
        if listofdisruptions[0]:
            await ctx.send(embed=disruptionsmsng)
    @do_dep.error
    async def dep_error(self,ctx,error):
        if isinstance(error, commands.MissingRequiredArgument):
            await ctx.send('No station specified.')
        elif isinstance(error, discord.errors.Forbidden):
            await ctx.send("Sorry, I do not have enough permissions to complete your command.")
        elif isinstance(error, HTTPError) and str(error.code).startswith("5"):
            await ctx.send(f"Error: {error.code} (This is an error on PTV's side, please try again later.)")
        else:
            print('Ignoring exception in command {}:'.format(ctx.command), file=sys.stderr)
            await ctx.send('An error has occured. This error has been reported and will be fixed as soon as possible.')
            await self.bot.get_user(244596682531143680).send(f'ERROR\nIgnoring exception in command {ctx.command}\n Command Sent: {ctx.message.content}\n{type(error)}\n{error}\n{error.__traceback__}')
            traceback.print_exception(type(error), error, error.__traceback__, file=sys.stderr)

    @commands.command(name='setdisruptionschannel')
    @commands.has_permissions(manage_channels=True)
    async def do_disruptions(self, ctx, channel):
        channel = channel.lstrip('<#').rstrip('>')
        try:
            int(channel)
        except ValueError:
            await ctx.send("Please mention a channel to set it as a disruptions channel.")
            return
        disruptionchannelslist = []
        for j in range(1,18):
            if j != 10:
                messagerouteid = j
                disruptionsmsg = discord.Embed(name="Disruptions", description=self.bot.routes[str(messagerouteid)]["route_name"], timestamp=datetime.datetime.now() - datetime.timedelta(hours=11), color=3447003)
                PTV.disruptions_to_embed(disruptionsmsg, self.bot.disruptions[str(messagerouteid)], messagerouteid, self.bot)
                disruptionsmsg.set_footer(icon_url=self.bot.user.avatar_url, text=f'Last Disruption Update ')
                disruptionchannelslist.append((await self.bot.get_channel(int(channel)).send(embed=disruptionsmsg)).id)
        disruptionchannelslist.append((await self.bot.get_channel(int(channel)).send(f"Last Checked for Disruptions at {(datetime.datetime.now()).strftime('%I:%M%p %d %b %Y')}\nThe side bar will be yellow if a Planned Work is currently active.\nSource: Licensed from Public Transport Victoria under a Creative Commons Attribution 4.0 International Licence.\nBe sure to join my discord server for official VPTBot support/feedback! https://discord.gg/KEhCS8U")).id)
        DATABASE_URL = os.environ['DATABASE_URL']
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        cur = conn.cursor()
        cur.execute(f'DELETE FROM disruption_channels WHERE channel_id = {channel};')
        cur.execute(f'INSERT INTO disruption_channels ("channel_id", "1", "2", "3", "4", "5", "6", "7", "8", "9", "11", "12", "13", "14", "15", "16", "17", "18") VALUES({channel}, {", ".join(str(v) for v in disruptionchannelslist)});')
        conn.commit()
        cur.close()
        conn.close()
    @do_disruptions.error
    async def disruptionserror(self,ctx,error):
        if isinstance(error, commands.MissingPermissions):
            await ctx.send("Sorry, you are required to have the manage channels permission to run this command")
        elif isinstance(error, commands.MissingRequiredArgument):
            await ctx.send("Please specify a Channel")
        else:
            print('Ignoring exception in command {}:'.format(ctx.command), file=sys.stderr)
            await ctx.send('An error has occured. This error has been reported and will be fixed as soon as possible.')
            await self.bot.get_user(244596682531143680).send(f'ERROR\nIgnoring exception in command {ctx.command}\n Command Sent: {ctx.message.content}\n{type(error)}\n{error}\n{error.__traceback__}')
            traceback.print_exception(type(error), error, error.__traceback__, file=sys.stderr)

def setup(bot):
    bot.add_cog(TrainCommands(bot))