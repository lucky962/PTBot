import asyncio

from classes.bot import Bot

bot = Bot(
    case_insensitive=True,
    description="A discord bot that gives you the latest Victorian public transport information!",
)

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(bot.start_bot())