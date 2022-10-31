var { Client, Intents } = require('discord.js');

var client = new Client({
	intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_PRESENCES],
	disableEveryone: true,
	disabledEvents: ['TYPING_START'],
});

require("dotenv").config();

var adminCommands = require("./commands/adminCommands");
var dmCommands = require("./commands/dmCommands");
var functions = require("./commands/functions");

client.on("ready", function () {
    console.log("FAR Processing Bot started");
    cacheOldMessages(client);
    adminCommands.registerCommands(client);
});

client.on('interactionCreate', async function (interaction) {
    var command = interaction.commandName;
	var options = interaction.options;

    //Commands
	if (interaction.isCommand()) {
        if (command == "resendwelcomemessage") adminCommands.resendWelcomeMessage(client, interaction.member, interaction);
    }
});

client.on("message", async function(message) {
    if (message.author.bot) return;
    if (message.channel.type == "dm") {
        // If receive DM...
        dmCommands.handleDM(client, message);
    }
});

// Listen for reactions
client.on("messageReactionAdd", async function (reaction, user) {
    if (reaction.partial) {
		try {
			await reaction.fetch();
		} catch (error) {
			return console.error("Welcome message reaction listener failed to fetch message: ", error);
		}
	}

    // If is self, cancel
    if (user.bot) return;

    var channel = reaction.message.channel.id;
    
    switch (channel) {
        case process.env.instructionsChannel:
            dmCommands.sendInitialDmToUser(reaction, user);
            break;
        case process.env.processingVoteChannel:
            // Cannot just use 'user', must use 'member' because it is of type 'GuildMember'
            var member = reaction.message.guild.members.cache.find(member => member.id == user.id);
            adminCommands.handleApplication(client, reaction, member);
            break;
    }
});

process.on("uncaughtException", function (err) {
	console.error("Uncaught Exception: ", err);
});

process.on("unhandledRejection", function (err) {
	console.error("Uncaught Promise Error: ", err);
});

client.login(process.env.token);

function cacheOldMessages() {
    var instructionsChannel = client.channels.cache.get(process.env.instructionsChannel);
    var processingVoteChannel = client.channels.cache.get(process.env.processingVoteChannel);

    if (instructionsChannel && processingVoteChannel) {
        instructionsChannel.messages.fetch().then(function (messages) {
            functions.incrementalFetch(processingVoteChannel.messages, function(newMessages) {
                // Get all messages sent by bot that have reactions on them
                messages = functions.findBotImportantMessage(messages.array().concat(newMessages), client.user.id);

                console.log(messages.length + " messages cached");
            });
        });
    } else {
        console.log("An error occurred caching old messages.");
    }
}