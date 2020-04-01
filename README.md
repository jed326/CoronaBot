# Discord Bot for Tracking COVID-19

## Usage
Clone this repository:
```
git clone https://github.com/jed326/CoronaBot.git
```
Then install it:
```
npm install
```
Add your bot token to a new file `auth.json`, in this format:
```json
{
    "token": "your-token-here"
}
```
Lastly, run the main.js file
```
node main.js
```

## Commands
| Commands | Function | Data Source |
| --- | --- | --- |
| `!help`  | Show help message. |
| `!cases` | Displays the worldwide case number. |
| `!source`| Links the sources for the bot and the source code. |
| `!corona US` or `!US`| Number of cases in the US. | covidtracking |
| `!corona`*`country`*| Number of cases in *country*.| JHU |
| `!corona`*`state`*| Number of cases in *state*. 2 Letter state codes work here as well.| covidtracking |
| `!corona`*`county, state`*| Number of cases in *country*.| JHU |
| `!corona`*`region, country`*| Number of cases in *country*. Only has region data for certain countries.| JHU |

## Data sources
- US and state data comes from: [Covidtracking](https://covidtracking.com/data/)
- Worldwide and county data is from [JHU CSSE](https://github.com/CSSEGISandData/COVID-19)

## Disclaimer
There are some pretty hack and wack stuff in here. Like parsing the JHU data straight from github.
Also we don't control the data and often times covidtracking and JHU don't have the same numbers.
¯\\\_(ツ)\_/¯
