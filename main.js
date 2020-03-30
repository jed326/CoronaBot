const Discord = require("discord.io");
const logger = require("winston");
const request = require("request");

logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console(), {
    colorize: true
});
logger.level = "debug";

let bot_token;

// Checks if there's an environmental variable configured.
// Super hack shit I know D:
if (process.env.BOT_TOKEN) {
    bot_token = process.env.BOT_TOKEN;
} else {
    bot_token = require("./auth.json").token;
}

// Initialize Discord Bot
// Docs: https://izy521.gitbooks.io/discord-io/content/Methods/Client.html
var bot = new Discord.Client({
    // token: process.env.BOT_TOKEN,
    // token: auth.token,
    token: bot_token,
    autorun: true
});

function isState(loc) {
    let states = [
        "AL",
        "AK",
        "AS",
        "AZ",
        "AR",
        "CA",
        "CO",
        "CT",
        "DE",
        "DC",
        "FM",
        "FL",
        "GA",
        "GU",
        "HI",
        "ID",
        "IL",
        "IN",
        "IA",
        "KS",
        "KY",
        "LA",
        "ME",
        "MH",
        "MD",
        "MA",
        "MI",
        "MN",
        "MS",
        "MO",
        "MT",
        "NE",
        "NV",
        "NH",
        "NJ",
        "NM",
        "NY",
        "NC",
        "ND",
        "MP",
        "OH",
        "OK",
        "OR",
        "PW",
        "PA",
        "PR",
        "RI",
        "SC",
        "SD",
        "TN",
        "TX",
        "UT",
        "VT",
        "VI",
        "VA",
        "WA",
        "WV",
        "WI",
        "WY"
    ];
    return states.includes(loc);
}

function getCases(user, userID, channelID, message, evt, loc) {
    let route;

    if (loc == "US") {
        route = "https://covidtracking.com/api/us";
    } else if (loc.length == 2) {
        if (isState(loc)) {
            route = `https://covidtracking.com/api/states?state=${loc}`;
        } else {
            bot.sendMessage({
                to: channelID,
                message: "Please use a valid 2-digit State Code"
            });
            return;
        }
    }

    request(route, { json: true }, (err, res, body) => {
        if (err) {
            return logger.error(err);
        } else {
            let data, time;
            if (loc == "US") {
                data = body[0];
                let date_ob = new Date(data.lastModified);
                time =
                    ("0" + (date_ob.getMonth() + 1)).slice(-2) +
                    "-" +
                    ("0" + date_ob.getDate()).slice(-2) +
                    "-" +
                    date_ob.getFullYear() +
                    " " +
                    ("0" + date_ob.getHours()).slice(-2) +
                    ":" +
                    ("0" + date_ob.getMinutes()).slice(-2);
            } else {
                data = body;
                let date_ob = new Date(data.dateModified);
                time =
                    ("0" + (date_ob.getMonth() + 1)).slice(-2) +
                    "-" +
                    ("0" + date_ob.getDate()).slice(-2) +
                    "-" +
                    date_ob.getFullYear() +
                    " " +
                    ("0" + date_ob.getHours()).slice(-2) +
                    ":" +
                    ("0" + date_ob.getMinutes()).slice(-2);
            }

            bot.sendMessage({
                to: channelID,
                message:
                    `...\n` +
                    `As of ${time} UTC there are **${data.positive}** positive COVID19 cases in ${loc}.` +
                    ` **${data.totalTestResults}** tests have been performed.`
            });
        }
    });
}

bot.on("ready", function(evt) {
    logger.info("Connected");
    logger.info("Logged in as: ");
    logger.info(bot.username + " - (" + bot.id + ")");
});

bot.on("message", function(user, userID, channelID, message, evt) {
    if (user == "CoronaBot") {
        return;
    }

    if (message.substring(0, 1) == "!") {
        var args = message.substring(1).split(" ");
        var cmd = args[0];

        logger.info(args[0]);

        args = args.splice(1);

        // TODO: Center county cases
        // This should probably be a switch statement but I suck at coding
        if (cmd == "commands" || cmd == "help") {
            bot.sendMessage({
                to: channelID,
                message:
                    "Here are the commands:\n" +
                    "**!cases**:    Get the number of COVID19 cases in the USA\n" +
                    "**!PA**:       Get the number of COVID19 cases in state PA\n" +
                    "**!centre**:    Get the number of COVID19 cases in Centre County, PA"
            });
        } else if (cmd == "cases") {
            getCases(user, userID, channelID, message, evt, "US");
        } else if (cmd == "center") {
        } else if (cmd.length == 2) {
            getCases(user, userID, channelID, message, evt, cmd.toUpperCase());
        }
    }
});
