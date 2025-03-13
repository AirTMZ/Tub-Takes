import discord
from discord.ext import commands

intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

# Store tierlists: { user_id: {'flavors': {flavor1: tierScore, ...}, 'count': numFlavorsTried} }
user_tierlists = {}

# Simple weighting function
def compute_overall_scores():
    flavor_scores = {}  # {flavor: (totalScore, totalWeight)}
    for data in user_tierlists.values():
        count = data['count']  # More flavors tried => higher weight
        for flavor, score in data['flavors'].items():
            if flavor not in flavor_scores:
                flavor_scores[flavor] = (0, 0)
            totalScore, totalWeight = flavor_scores[flavor]
            flavor_scores[flavor] = (totalScore + score * count, totalWeight + count)

    # Decay factor if few totalWeight
    final_scores = {}
    for flavor, (tScore, tWeight) in flavor_scores.items():
        if tWeight == 0:
            final_scores[flavor] = 0
        else:
            # Example decay factor for outlier control
            final_scores[flavor] = (tScore / tWeight) * (min(tWeight, 5) / 5.0)
    return final_scores

def parse_tierlist_code(code):
    # Example code parsing: S=6, A=5, B=4, C=3, D=2, F=1
    # Use your existing logic for decoding flavors
    # Return {flavorName: numericScore, ...}
    decoded = some_decode_function(code)  # Implement your decode
    return decoded

@bot.command()
async def update_tier(ctx, code):
    flavor_dict = parse_tierlist_code(code)
    user_tierlists[ctx.author.id] = {
        'flavors': flavor_dict,
        'count': len(flavor_dict)
    }
    await ctx.send("Your tierlist has been updated.")

@bot.command()
async def show_tiers(ctx):
    scores = compute_overall_scores()
    # Sort from highest to lowest
    sorted_flavors = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    output = "\n".join([f"{flv}: {round(scr, 2)}" for flv, scr in sorted_flavors])
    await ctx.send(f"**Overall Tier Scores:**\n{output}")

bot.run("YOUR_BOT_TOKEN")