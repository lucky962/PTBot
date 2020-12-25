import traceback
import sys
from discord.ext import commands
import discord


class CommandErrorHandler(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_command_error(self, ctx, error):
        """The event triggered when an error is raised while invoking a command.
        ctx   : Context
        error : Exception"""

        if isinstance(error, discord.errors.Forbidden):
            return await ctx.send("Sorry, I do not have enough permissions to complete your command.")

        if hasattr(ctx.command, 'on_error'):
            return
        
        ignored = (commands.CommandNotFound, commands.UserInputError)
        error = getattr(error, 'original', error)
        
        if isinstance(error, ignored):
            return
        
        if isinstance(error, commands.errors.DisabledCommand):
            return await ctx.send('This command has been disabled, please dm lucky9621 if you think this has been an error.')

        if isinstance(error, commands.errors.CommandNotFound):
            return
            
        print('Ignoring exception in command {}:'.format(ctx.command), file=sys.stderr)
        await ctx.send('An error has occured. This error has been reported and will be fixed as soon as possible.')
        await self.bot.get_user(244596682531143680).send(f'ERROR\nIgnoring exception in command {ctx.command}\n Command Sent: {ctx.message.content}\n{type(error)}\n{error}\n{error.__traceback__}')
        traceback.print_exception(type(error), error, error.__traceback__, file=sys.stderr)
    
    # @commands.command(name='repeat', aliases=['mimic', 'copy'])
    # async def do_repeat(self, ctx, *, inp: str):
    #     await ctx.send(inp)

    # @do_repeat.error
    # async def do_repeat_handler(self, ctx, error):
    #     if isinstance(error, commands.MissingRequiredArgument):
    #         if error.param.name == 'inp':
    #             await ctx.send("You forgot to give me input to repeat!")
                

def setup(bot):
    bot.add_cog(CommandErrorHandler(bot))
