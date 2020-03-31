const Discord = require("discord.io");
const logger = require("winston");
const parse = require("csv-parse/lib/sync");
const request = require("request");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const moment = require("moment-timezone");
const labels = require("./lib/data/labels");

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

//initialize global vars for jhudata
global.jhuData = [];
global.jhuUpdate = -1;

//helper to format date for JHU data
function toURLDate(date) {
    return (
        (date.getMonth() + 1 < 10
            ? "0" + (date.getMonth() + 1)
            : date.getMonth() + 1) +
        "-" +
        (date.getDate() + 1 < 10
            ? "0" + (date.getDate() + 1)
            : date.getDate() + 1) +
        "-" +
        (date.getYear() + 1900)
    );
}

//function to update JHU data
function updateJHUData(date) {
    let dateStr = toURLDate(date);
    let route =
        "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/" +
        dateStr +
        ".csv";
    request(route, function(err, response, body) {
        if (err) {
            return logger.error(err);
        } else {
            if (body == "404: Not Found") {
                // console.log("This date is " + date.toLocaleString() + ". Get yesterday's data.")
                let dayBefore = new Date(date);
                dayBefore.setDate(dayBefore.getDate() - 1);
                updateJHUData(dayBefore);
            } else {
                jhuData = parse(body, {
                    columns: true,
                    skip_empty_lines: true
                });
                let now = new Date();
                logger.info("Jhu data updated at: " + now.toLocaleString());
            }
        }
    });
}

function stateCodes2States(code) {
    return labels.stateCodes2States[code];
}

function isPACounty(loc) {
    return labels.counties.includes(loc.toLowerCase());
}

function isState(loc) {
    return labels.stateCodes.includes(loc.toUpperCase());
}

//get worldwide cases from jhuData
function getWorldCases(user, userID, channelID, message, evt, loc) {
    //fixing countries with common but 'malformed' names
    if (loc.toLowerCase() == "taiwan") {
        loc = "taiwan*";
    } else if (loc.toLowerCase() == "korea") {
        loc = "korea, south";
    } else if (loc.toLowerCase() == "uk") {
        loc = "united kingdom";
    }
    logger.info(loc + " for worldwide cases entered.");

    for (var i = 0; i < jhuData.length; i++) {
        if (
            loc.toLowerCase() == jhuData[i].Combined_Key.toLowerCase() ||
            (loc + ", us").toLowerCase() ==
                jhuData[i].Combined_Key.toLowerCase()
        ) {
            let date_ob = new Date(jhuData[i].Last_Update);
            let time = moment(date_ob)
                .tz("America/New_York")
                .format("MMMM Do YYYY, h:mm a z");
            bot.sendMessage({
                to: channelID,
                message: "",
                embed: {
                    color: 15158332,
                    author: {
                        name: "Devinbot COVID Update",
                        icon_url: "https://i.imgur.com/Z52Zuj7.png"
                    },
                    description:
                        `There are **${jhuData[i].Confirmed}** positive COVID19 cases in ${jhuData[i].Combined_Key}. ` +
                        `\n**${jhuData[i].Deaths}** people have died.` +
                        `\n**${jhuData[i].Recovered}** people have recovered.`,
                    footer: {
                        text: `Last Updated ${time}.\nData from JHU`
                    }
                }
            });
            return;
        }
    }
    if (
        loc.toLowerCase() == "china" ||
        loc.toLowerCase() == "australia" ||
        loc.toLowerCase() == "canada"
    ) {
        let sum = {
            Confirmed: 0,
            Deaths: 0,
            Recovered: 0,
            Last_Update: ""
        };
        for (var i = 0; i < jhuData.length; i++) {
            if (loc.toLowerCase() == jhuData[i].Country_Region.toLowerCase()) {
                sum.Confirmed += parseInt(jhuData[i].Confirmed, 10);
                sum.Deaths += parseInt(jhuData[i].Deaths, 10);
                sum.Recovered += parseInt(jhuData[i].Recovered, 10);
                if (sum.Last_Update == "") {
                    sum.Last_Update = jhuData[i].Last_Update;
                } else {
                    var a = new Date(sum.Last_Update);
                    var b = new Date(jhuData[i].Last_Update);
                    if (a > b) {
                        sum.Last_Update = jhuData[i].Last_Update;
                    }
                }
            }
        }
        let date_ob = new Date(sum.Last_Update);
        let time = moment(date_ob)
            .tz("America/New_York")
            .format("MMMM Do YYYY, h:mm a z");
        loc = loc.charAt(0).toUpperCase() + loc.slice(1);
        bot.sendMessage({
            to: channelID,
            message: "",
            embed: {
                color: 15158332,
                author: {
                    name: "Devinbot COVID Update",
                    icon_url: "https://i.imgur.com/Z52Zuj7.png"
                },
                description:
                    `There are **${sum.Confirmed}** positive COVID19 cases in ${loc}. ` +
                    `\n**${sum.Deaths}** people have died.` +
                    `\n**${sum.Recovered}** people have recovered.`,
                footer: {
                    text: `Last Updated ${time}.\nData from JHU`
                }
            }
        });
        return;
    }
    bot.sendMessage({
        to: channelID,
        message: "Please use a valid location"
    });
}

//Gets US cases from covid tracking
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
                    message: "",
                    embed: {
                        color: 15158332,
                        author: {
                            name: "Devinbot COVID Update",
                            icon_url: "https://i.imgur.com/Z52Zuj7.png"
                        },
                        description:
                            `**${data.positive}** positive COVID19 cases in ${loc}.` +
                            `\n**${data.totalTestResults}** tests have been performed.`,
                        footer: {
                            text: `Last Updated ${time}.\nData from Covidtracking`
                        }
                    }
                });
            }
        }
    );
}

//function to get PA County
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
                    .textContent.substring(
                        // Getting an error on the line above
                        dom.window.document
                            .getElementsByClassName("ms-rteStyle-Quote")[0]
                            .textContent.search(" at ") + 4
                    );
                let list = dom.window.document.getElementsByTagName("tbody")[3]
                    .children;
                let positve, dead;
                for (var i = 1; i < list.length; i++) {
                    if (
                        loc.toLowerCase() ==
                        dom.window.document
                            .getElementsByTagName("tbody")[3]
                            .children[i].children[0].textContent.toLowerCase()
                    ) {
                        positive = dom.window.document.getElementsByTagName(
                            "tbody"
                        )[3].children[i].children[1].textContent;
                        dead = dom.window.document.getElementsByTagName(
                            "tbody"
                        )[3].children[i].children[2].textContent;
                        dead = dead == "" ? "0" : dead;
                        loc = loc.charAt(0).toUpperCase() + loc.slice(1);
                        bot.sendMessage({
                            to: channelID,
                            message: "",
                            embed: {
                                color: 15158332,
                                author: {
                                    name: "Devinbot COVID Update",
                                    icon_url: "https://i.imgur.com/Z52Zuj7.png"
                                },
                                description:
                                    `There are **${positive}** positive COVID19 cases in ${loc} County, PA. ` +
                                    `\n**${dead}** people have died.`,
                                footer: {
                                    text: `Last Updated ${time} EDT`
                                }
                            }
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

global.startTime;
bot.on("ready", function(evt) {
    logger.info("Connected");
    logger.info("Logged in as: ");
    logger.info(bot.username + " - (" + bot.id + ")");
    let now = new Date();
    global.startTime = now;
    updateJHUData(now);
    jhuUpdate = now.getTime();
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

        //Update JHUdata if haven't done so in 2 hours
        let now = new Date();
        if (now.getTime() - jhuUpdate > 7200000) {
            updateJHUData(now);
            jhuUpdate = now.getTime();
        }

        // TODO: Centre county cases
        // This should probably be a switch statement but I suck at coding
        if (cmd.toLowerCase() == "commands" || cmd.toLowerCase() == "help") {
            bot.sendMessage({
                to: channelID,
                message: "",
                embed: {
                    color: 15158332,
                    author: {
                        name: "Devinbot Commands",
                        icon_url: "https://i.imgur.com/Z52Zuj7.png"
                    },
                    fields: [
                        {
                            name: "`!US`",
                            value: "Get the number of COVID19 cases in the USA."
                        },
                        {
                            name: "`!country`",
                            value:
                                "Get the number of COVID19 cases in *country*."
                        },
                        {
                            name: "`![2 letter state code]`",
                            value: "Get the number of COVID19 cases in *state*."
                        },
                        {
                            name: "`!county, state`",
                            value:
                                "Get the number of COVID19 cases in *county, state* of the US.\n2 letter state codes work here as well."
                        },
                        {
                            name: "`!region, country`",
                            value:
                                "Get the number of COVID19 cases in *region, country*."
                        }
                    ],
                    footer: {
                        text:
                            "This bot was last started " +
                            moment(startTime)
                                .tz("America/New_York")
                                .format("MMMM Do YYYY, h:mm a z")
                    }
                }
            });
        } else if (cmd == "cases") {
            getCases(user, userID, channelID, message, evt, "US");
        } else if (cmd.length == 2) {
            // getPACountyCases deprecated
            // if ((cmd == "PA" || cmd == "pa") && args.length > 0) {
            //     getPACountyCases(
            //         user,
            //         userID,
            //         channelID,
            //         message,
            //         evt,
            //         args[0]
            //     );
            // } else {
            getCases(user, userID, channelID, message, evt, cmd.toUpperCase());
            // }
        } else {
            if (args.length != 0 && isState(args[0])) {
                args[0] = stateCodes2States(args[0].toUpperCase()) + ",";
                if (args[1] == undefined) {
                    args.push("US");
                }
            }
            getWorldCases(
                user,
                userID,
                channelID,
                message,
                evt,
                cmd + (args.length == 0 ? "" : " " + args.join(" "))
            );
        }
    }
});
