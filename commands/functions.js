module.exports = {
    // Get all messages sent by bot that have reactions on them
    findBotImportantMessage: function(messages, clientId) {
        return messages.filter(message => message.author.id == clientId && message.reactions.cache.size > 0);
    },

    getServerEmoji: function(guildEmojis, emojiName) {
        return guildEmojis.cache.find(emoji => emoji.name == emojiName);
    },

    // Call fetch in 100 increments due to Discord API limitations
    incrementalFetch: function(object, callback) {
        var allResults = [];

        function loop() {
            object.fetch({
                limit: 100,
                after: allResults.length > 0 ? allResults[allResults.length - 1].id : null // Last item in array
            }).then(function (result) {
                if (result.size > 0) allResults = allResults.concat(result.array());
                
                if (result.size == 100) loop();
                else callback(allResults);
            });
        }

        loop();
    }
}