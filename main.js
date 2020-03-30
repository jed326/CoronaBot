const Discord = require("discord.io");
const logger = require("winston");
const request = require("request");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const moment = require("moment-timezone");

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

function isPACounty(loc) {
    let counties = [
        "adams",
        "allegheny",
        "armstrong",
        "beaver",
        "berks",
        "blair",
        "bradford",
        "bucks",
        "butler",
        "cambria",
        "cameron",
        "carbon",
        "centre",
        "chester",
        "clarion",
        "clearfield",
        "columbia",
        "crawford",
        "cumberland",
        "dauphin",
        "delaware",
        "erie",
        "fayette",
        "franklin",
        "greene",
        "huntingdon",
        "indiana",
        "juniata",
        "lackawanna",
        "lancaster",
        "lawrence",
        "lebanon",
        "lehigh",
        "luzerne",
        "lycoming",
        "mckean",
        "mercer",
        "mifflin",
        "monroe",
        "montgomery",
        "montour",
        "northampton",
        "northumberland",
        "perry",
        "philadelphia",
        "pike",
        "potter",
        "schuylkill",
        "snyder",
        "somerset",
        "susquehanna",
        "tioga",
        "union",
        "venango",
        "warren",
        "washington",
        "wayne",
        "westmoreland",
        "york"
    ];
    return counties.includes(loc.toLowerCase());
}

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
    return states.includes(loc.toUpperCase());
}

//TODO: Solve the time zone problem. Heroku server is in UTC. Probably use Moment.js
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

    request(
        route,
        {
            json: true
        },
        (err, res, body) => {
            if (err) {
                return logger.error(err);
            } else {
                let data, date_ob;
                if (loc == "US") {
                    data = body[0];
                    date_ob = new Date(data.lastModified);
                } else {
                    data = body;
                    date_ob = new Date(data.dateModified);
                }
                time = moment(date_ob)
                    .tz("America/New_York")
                    .format("MMMM Do YYYY, h:mm a z");

                bot.sendMessage({
                    to: channelID,
                    message:
                        `...\n` +
                        `As of ${time} there are **${data.positive}** positive COVID19 cases in ${loc}.` +
                        ` **${data.totalTestResults}** tests have been performed.`
                });
            }
        }
    );
}

function getPACountyCases(user, userID, channelID, message, evt, loc) {
    let route =
        "https://www.health.pa.gov/topics/disease/coronavirus/Pages/Cases.aspx";

    if (isPACounty(loc)) {
        request(route, function(err, response, body) {
            if (err) {
                return logger.error(err);
            } else {
                let dom = new JSDOM(body);
                let time = dom.window.document
                    .getElementsByClassName("ms-rteStyle-Quote")[0]
                    .innerText.substring(
                        // Getting an error on the line above
                        dom.window.document
                            .getElementsByClassName("ms-rteStyle-Quote")[0]
                            .innerText.search(" at ") + 4
                    );
                let list = dom.window.document.getElementsByTagName("tbody")[3]
                    .children;
                let positve, dead;
                for (var i = 1; i < list.length; i++) {
                    if (
                        loc ==
                        dom.window.document
                            .getElementsByTagName("tbody")[3]
                            .children[i].children[0].innerText.toLowerCase()
                    ) {
                        positive = dom.window.document.getElementsByTagName(
                            "tbody"
                        )[3].children[i].children[1].innerText;
                        dead = dom.window.document.getElementsByTagName(
                            "tbody"
                        )[3].children[i].children[2].innerText;
                        dead = dead == "\n" ? "0" : dead;
                        bot.sendMessage({
                            to: channelID,
                            message:
                                `...\n` +
                                `As of ${time} EST there are **${positve}** positive COVID19 cases in ${loc} County, PA. ` +
                                ` **${dead}** people have died.`
                        });
                    }
                }
            }
        });
    } else {
        bot.sendMessage({
            to: channelID,
            message: "Please entre a valid PA county"
        });
        return;
    }
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

        args = args.splice(1);

        logger.info(cmd);
        logger.info(args);

        // TODO: Centre county cases
        // This should probably be a switch statement but I suck at coding
        if (cmd == "commands" || cmd == "help") {
            bot.sendMessage({
                to: channelID,
                message:
                    "Here are the commands:\n" +
                    "**!cases**:    Get the number of COVID19 cases in the USA\n" +
                    "**!PA**:       Get the number of COVID19 cases in state PA\n" +
                    "**!PA centre**:    Get the number of COVID19 cases in Centre County, PA"
            });
        } else if (cmd == "cases") {
            getCases(user, userID, channelID, message, evt, "US");
        } else if (cmd.length == 2) {
            if ((cmd == "PA" || cmd == "pa") && args.length > 0) {
                // getPACountyCases(
                //     user,
                //     userID,
                //     channelID,
                //     message,
                //     evt,
                //     args[0]
                // );
            } else {
                getCases(
                    user,
                    userID,
                    channelID,
                    message,
                    evt,
                    cmd.toUpperCase()
                );
            }
        }
    }
});
