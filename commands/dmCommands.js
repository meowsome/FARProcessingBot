var moment = require("moment");
var functions = require("./functions");

module.exports = {
    sendInitialDmToUser: function(reaction, user) {
        //Validate reaction is correct emoji
        if (reaction.emoji.name != process.env.welcomeEmoji) return;

        user.send("Hiya and welcome to the Furries At Riddle server!!\n\nTo gain access to the rest of the server, please send a brief introduction about yourself in new-members. We'd love to know your name (sona name is fine!), what your species is, what pronouns you use, the things you are interested in, what your major is, put a cat emoji in your reply, what year are you in, and where did you find out about us.\n\nPlease make sure to read over the rules before sending an introduction!");
    },

    handleDM: function(client, message) {
        var userId = message.author.id;

        checkIfVerified(client, userId, function(result) {
            if (!result) return message.author.send("You have not reacted to the message in <#" + process.env.instructionsChannel + ">. React to the message to make a submission.");

            checkIfAlreadySubmitted(client, userId, function(result) {
                if (!result) return message.author.send("You have to wait a full " + process.env.cooldownHours + " hours before you send another application.");

                checkIfAccepted(client, userId, function(result) {
                    if (result) return message.author.send("You have already been accepted.");

                    message.author.send("Your application has been submitted. I will send you a message if you are accepted. Thank you!");

                    var date = moment().format("lll");

                    client.channels.cache.get(process.env.processingVoteChannel).send("Applicant Username: <@" + userId + ">\nDate: " + date + "\nIntroduction: " + message.content + "\n<@&" + process.env.applicationprocessorsRole + ">").then(function(message) {
                        message.react(process.env.acceptEmoji);
                        message.react(process.env.denyEmoji);
                        message.react(process.env.confirmEmoji);
                    });
                });
            });
        });
    }
}

// Check if the user has reacted to the message in the instructions channel 
function checkIfVerified(client, userId, callback) {
    var channel = client.channels.cache.get(process.env.instructionsChannel);

    channel.messages.fetch().then(function (messages) {
        var message = functions.findBotImportantMessage(messages, client.user.id).first();
        var emoji = functions.getServerEmoji(message.guild.emojis, process.env.welcomeEmoji).id;

        // Check if user has accepted terms by reacting to welcome message
        functions.incrementalFetch(message.reactions.resolve(emoji).users, function(users) {
            callback(users.some(user => user.id == userId));
        });
    });
}

// Check if the user already has an accepted/denied/pending application over a certain date
function checkIfAlreadySubmitted(client, userId, callback) {
    var processingVoteChannel = client.channels.cache.get(process.env.processingVoteChannel);
    var deniedApplicantsChannel = client.channels.cache.get(process.env.deniedApplicantsChannel);

    functions.incrementalFetch(processingVoteChannel.messages, function(messages) {
        functions.incrementalFetch(deniedApplicantsChannel.messages, function(messages2) {
            messages = messages.concat(messages2);

            // Find all messages sent less than the # of cooldown hours ago by the user
            var userApplications = messages.filter(message => message.content.includes(userId) && moment().diff(moment(message.createdAt), 'hours') < process.env.cooldownHours);

            // If no messages, then user is good to submit again
            callback(userApplications.length == 0);
        });
    });
}

// Check if user was already accepted into the program
function checkIfAccepted(client, userId, callback) {
    var channel = client.channels.cache.get(process.env.acceptedApplicantsChannel);

    functions.incrementalFetch(channel.messages, function(messages) {
        callback (messages.some(message => message.content.includes(userId)));
    });
}