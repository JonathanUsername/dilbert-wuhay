const Botkit = require('botkit');
const request = require('request');
const cheerio = require('cheerio');


/*
Requires:
heroku config:set CLIENT_SECRET=foo
heroku config:set VERIFICATION_TOKEN=bar
heroku config:set CLIENT_ID=baz

heroku sets its own port
you might need to visit /login to auth
*/


if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.PORT || !process.env.VERIFICATION_TOKEN) {
    console.log('Error: Specify CLIENT_ID, CLIENT_SECRET, VERIFICATION_TOKEN and PORT in environment');
    process.exit(1);
}

var config = {
    require_delivery: true
};
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    Object.assign(config,{
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
    });
} else {
    Object.assign(config, {
        json_file_store: './db_slackbutton_slash_command/',
    });
}

var controller = Botkit.slackbot(config).configureSlackApp({clientId: process.env.CLIENT_ID, clientSecret: process.env.CLIENT_SECRET, scopes: ['commands']});

controller.setupWebserver(process.env.PORT, function(err, webserver) {
    controller.createWebhookEndpoints(controller.webserver);

    controller.createOauthEndpoints(controller.webserver, function(err, req, res) {
        if (err) {
            res.status(500).send('ERROR: ' + err);
        } else {
            res.send('Success!');
        }
    });
});

controller.on('slash_command', function(slashCommand, message) {

    switch (message.command) {
        case "/dilbert":

            // but first, let's make sure the token matches!
            if (message.token !== process.env.VERIFICATION_TOKEN)
                return; //just ignore it.

            // if no text was supplied, treat it as a help command
            if (message.text === "" || message.text === "help") {
                slashCommand.replyPrivate(message, `U wot m8? Use me like this: /dilbert coffee is great`);
                return;
            }

            const safeTerms = message.text.replace(' ', '+');
            const url = `http://dilbert.com/search_results?terms=${safeTerms}`;
            const fetchingMessage = slashCommand.replyPrivate(message, `Searching for ${message.text}`)

            request(url, (err, res, body) => {
                if (err) {
                    slashCommand.replyPrivateDelayed(message, `Couldn't find that sorry! ${err}`);
                    return;
                }
                const $ = cheerio.load(body);
                const src = $('.img-comic-link img').attr('src');
                console.log(src);
                if (!src) {
                    slashCommand.replyPrivateDelayed(message, `Couldn't find that sorry!`);
                    return
                }
                slashCommand.replyPublicDelayed(message, src);
            });

            break;
        default:
            slashCommand.replyPublic(message, "I'm afraid I don't know how to " + message.command + " yet.");

    }

})
