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
            ? "0" + (date.getDate())
            : date.getDate()) +
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
    logger.info("Attempting to load JHUData from " + route);
    request(route, function(err, response, body) {
        if (err) {
            return logger.error(err);
        } else {
            if (body == "404: Not Found") {
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

//takes in 2 letter state code, return full state name
//no checking done (use isState)
function stateCodes2States(code) {
    return labels.stateCodes2States[code];
}

//takes in state name, return state code
//no check done, use isState to check resulting output
function states2StateCodes(state) {
  return labels.states2StateCodes[state];
}

//checks if input is valid 2 letter state code
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
    } else if (loc.toLowerCase() == "united states") {
        loc = "us"
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
                    title: `${jhuData[i].Combined_Key}`,
                    description:
                        `**${jhuData[i].Confirmed}** positive cases` +
                        `\n**${jhuData[i].Deaths}** deaths` +
                        `\n**${jhuData[i].Recovered}** recovered`,
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
        loc.toLowerCase() == "canada" ||
        loc.toLowerCase() == "us"
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
                    if (a < b) {
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
                title: `${loc}`,
                description:
                    `**${sum.Confirmed}** positive cases` +
                    `\n**${sum.Deaths}** deaths` +
                    `\n**${sum.Recovered}** recovered`,
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

//get the world total number of cases from jhuData
function worldTotal(user, userID, channelID, message, evt) {
  let sum = {
      Confirmed: 0,
      Deaths: 0,
      Recovered: 0,
      Last_Update: ""
  };
  for (var i = 0; i < jhuData.length; i++) {
      sum.Confirmed += parseInt(jhuData[i].Confirmed, 10);
      sum.Deaths += parseInt(jhuData[i].Deaths, 10);
      sum.Recovered += parseInt(jhuData[i].Recovered, 10);
      if (sum.Last_Update == "") {
          sum.Last_Update = jhuData[i].Last_Update;
      } else {
          var a = new Date(sum.Last_Update);
          var b = new Date(jhuData[i].Last_Update);
          if (a < b) {
              sum.Last_Update = jhuData[i].Last_Update;
          }
      }
  }
  let date_ob = new Date(sum.Last_Update);
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
          title: `Worldwide Case Numbers`,
          description:
              `**${sum.Confirmed}** positive cases` +
              `\n**${sum.Deaths}** deaths` +
              `\n**${sum.Recovered}** recovered`,
          footer: {
              text: `Last Updated ${time}.\nData from JHU`
          }
      }
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
                        title: `${loc}`,
                        description:
                            `**${data.positive}** positive cases` +
                            `\n**${data.totalTestResults}** tests performed`,
                        footer: {
                            text: `Last Updated ${time}.\nData from Covidtracking`
                        }
                    }
                });
            }
        }
    );
}


global.startTime; //declare global start time variable

//bot is on
bot.on("ready", function(evt) {
    logger.info("Connected");
    logger.info("Logged in as: ");
    logger.info(bot.username + " - (" + bot.id + ")");
    let now = new Date();
    global.startTime = now;
    updateJHUData(now);
    jhuUpdate = now.getTime();
});

//bot receives a message
bot.on("message", function(user, userID, channelID, message, evt) {
    if (user == "CoronaBot") {
        return;
    }

    if (message.substring(0, 1) == "!") {
        var args = message.substring(1).split(" ");
        var cmd = args[0];

        //let each command handle their own args
        let arg = args.splice(1).join(" ");

        logger.info(cmd);
        logger.info(arg);

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
                        name: "`!help`",
                        value: "How you got here..."
                      },
                      {
                        name: "`!cases`",
                        value: "Displays the worldwide case number."
                      },
                      {
                        name: "`!source`",
                        value: "Links the sources for the bot and the source code."
                      },
                      {
                       name: "\n\n!corona commands",
                       value: "`!corona US`\n\n`!corona`*`country`*\n\n`!corona`*`state`*\n\n`!corona`*`county, state`*\n\n`!corona`*`region, country`*",
                       inline: true
                      },
                      {
                       name: "\n\nReturns",
                       value: "Number of cases in the *`US`*.\n\nNumber of cases in *`country`*.\n\nNumber of cases in *`state`*.\n\nNumber of cases in *`county, state`*\n\nNumber of cases in *`region, country`*",
                       inline: true
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
        } else if (cmd.toLowerCase() == "cases"){
              worldTotal(user, userID, channelID, message, evt);
        } else if (cmd.toLowerCase() == "us"){
              getCases(user, userID, channelID, message, evt, 'US');
        } else if (cmd.toLowerCase() == "corona") {
           if (arg.length == 2) {
              getCases(user, userID, channelID, message, evt, arg.toUpperCase());
          } else {
              if (states2StateCodes(arg.toLowerCase()) != undefined) {
                getCases(user, userID, channelID, message, evt, states2StateCodes(arg.toLowerCase()));
              } else {
                args = arg.split(', ');
                if (args.length != 0) {
                    for (var i = 0; i < args.length; i++){
                      if (isState(args[i])) {
                        args[i] = stateCodes2States(args[i].toUpperCase()) ;
                      }
                    }
                }
                getWorldCases(
                    user,
                    userID,
                    channelID,
                    message,
                    evt,
                    args.length == 0 ? "" : args.join(", ")
                );
             }
          }
        } else if (cmd.toLowerCase() == "source" || cmd.toLowerCase() == "sources") {
          bot.sendMessage({
              to: channelID,
              message: "",
              embed: {
                  color: 15158332,
                  author: {
                      name: "Devinbot COVID Update",
                      icon_url: "https://i.imgur.com/Z52Zuj7.png"
                  },
                  title:
                      'Sources',
                  description:
                      "[John Hopkins University CSSE](https://github.com/CSSEGISandData/COVID-19)\n\n[Covidtracking](https://covidtracking.com/)\n\n[This bot\'s source code](https://github.com/jed326/CoronaBot)",
                  footer: {
                      text:
                          "This bot was last started " +
                          moment(startTime)
                              .tz("America/New_York")
                              .format("MMMM Do YYYY, h:mm a z")
                  }
              }
          });
        }
    }
});
