var moment = require("moment");
var functions = require('./functions');
var commandDefinitions = require('./commandDefinitions');

module.exports = {
    resendWelcomeMessage: function(client, member, message) {
        if (!validatePermissionsAdmin(member)) return message.channel.send("Insufficient permissions. You must be an admin to perform this command.");

        client.channels.cache.get(process.env.instructionsChannel).send("React to this message to confirm that you have read the <insert link here for channels> channels. Please check your DMs after reacting.").then(function(message) {
            message.react(functions.getServerEmoji(message.guild.emojis, process.env.welcomeEmoji));
        });
    },

    handleApplication: function(client, reaction, user) {
        // Fail if invalid perms (neither admin or processor role)
        if (!validatePermissionsProcessors(user) && !validatePermissionsAdmin(user)) return reaction.users.remove(user);

        // Fail if emoji is not dedicated confirm emojis
        if (reaction.emoji.name != process.env.confirmEmoji) return;
        
        var reactions = reaction.message.reactions;

        // Calculate all acceptances and denials from the current application, subtract 2 to remove the bot's votes
        var totalVotes = reactions.resolve(process.env.acceptEmoji).count + reactions.resolve(process.env.denyEmoji).count - 2;

        // Only allow confirm reaction to work if 5 total votes. 
        if (totalVotes < 5) return reaction.users.remove(user);

        // Determine which channel to send to
        var success = reactions.resolve(process.env.acceptEmoji).count >= reactions.resolve(process.env.denyEmoji).count;
        var channel = success ? process.env.acceptedApplicantsChannel : process.env.deniedApplicantsChannel;
        var actionMessage = success ? "\nAccepted by: " : "\nDenied by: ";
    
        // Send new message
        var date = moment().format("lll");
        // Remove the mention of the application processor role and replace the time with the current time
        var messageParts = reaction.message.content.replace("\n<@&" + process.env.applicationprocessorsRole + ">", "").replace(/Date:.*?\n/, "Date: " + date + "\n", "") + actionMessage + "<@" + user.id + ">";
        client.channels.cache.get(channel).send(messageParts);
        
        // Delete message
        reaction.message.delete();

        sendMessageToApplicant(client, reaction.message, success);
    },

    registerCommands: async function(client) {
        var guild = client.guilds.cache.get(process.env.serverId);
        var discordCommands = guild ? guild.commands : client.application.commands;
    
        console.log('Registering commands...');
        for (let command of commandDefinitions) {
            await discordCommands.create(command);
        }
        console.log('Commands registered');
    }
}

function sendMessageToApplicant(client, message, success) {
    // Get the user ID from the message
    var userID = message.content.split("\n")[0].split(": ")[1].replace(/\D/g, "");
    var user = client.users.cache.find(u => u.id == userID);

    // Create text for success or deny
    var text = success ? "You have been accepted into the Furs at Riddle Discord server! Please make sure to read the rules, and don't share this link with anyone else. <insert link here>" : "You have been denied. You may re-apply in " + process.env.cooldownHours + " hours.";
        
    user.send(text);
}

function validatePermissionsAdmin(member) {
    return member.hasPermission('ADMINISTRATOR');
}

function validatePermissionsProcessors(member) {
    return member.roles.cache.some(role => role.name == "Mods");
}