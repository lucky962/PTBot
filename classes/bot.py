import asyncio
import datetime
import discord
import config
import sys
import traceback

from discord.ext import commands
# from classes.InfoFiles import all_prefixes

class Bot(commands.Bot):
    def __init__(self, **kwargs):
        super().__init__(
            command_prefix=config.global_prefix, **kwargs
        )
        self.config = config
        self.version = config.version
        self.all_prefixes = all_prefixes
        self.launch_time = (
            datetime.datetime.now()
        )
    
    @property
    def uptime(self):
        return datetime.datetime.now() - self.launch_time

    async def start_bot(self):
        for extension in self.config.initial_extensions:
            try:
                self.load_extension(extension)
            except Exception:
                print(f"Failed to load extension {extension}.", file=sys.stderr)
                traceback.print_exc()
        if self.config.is_testing:
            await self.start(self.config.TESTINGTOKEN)
        else:
            await self.start(self.config.TOKEN)

    def _get_prefix(self, bot, message):
        if not message.guild:
            return self.config.global_prefix
        try:
            return commands.when_mentioned_or(self.all_prefixes[message.guild.id])(self, message)
        except KeyError:
            return commands.when_mentioned_or(self.config.global_prefix)(self, message)

    def set_prefix(self, ctx, *, prefix):
        if prefix == self.config.global_prefix:
            del self.all_prefixes[ctx.guild.id]
        else:
            self.all_prefixes[ctx.guild.id] = prefix
        with open("./infofiles/prefixes.py",'w') as f:
            f.write("all_prefixes = {\n")
            for key, value in self.all_prefixes.items():
                f.write(f"    '{key}':'{value}'")
            f.write("}")
        

        