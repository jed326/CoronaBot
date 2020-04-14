import sys
import requests
import datetime
import json
import matplotlib.dates as mdates
import matplotlib.pyplot as plt


def addToGraph(data, loc):
    x, y = [], []

    for day in data:
        date = str(day["date"])  # 20200410
        date = date[4:6]+"/"+date[-2:]+"/"+date[:4]
        x.append(datetime.datetime.strptime(date, "%m/%d/%Y").date())
        y.append(day["positive"])
    ax.plot(x, y, label=loc)


loc = sys.argv[1].split(" ")

fig = plt.figure()
ax = fig.add_subplot(111)
plt.locator_params(axis="x", nbins=6)
days = mdates.DayLocator()
fmt = mdates.DateFormatter("%m-%d-%y")

for state in loc:

    if state == "US":
        route = "https://covidtracking.com/api/us/daily"
        res = requests.get(route)
        if res.status_code != requests.codes.ok:
            print("Something bad happened along the way.")
        data = res.json()
        addToGraph(data, state)
    else:
        route = "https://covidtracking.com/api/states/daily.json?state=" + state
        res = requests.get(route)
        if res.status_code != requests.codes.ok:
            print("Something bad happened along the way.")
        data = res.json()
        addToGraph(data, state)

ax.xaxis.set_major_locator(days)
ax.xaxis.set_major_formatter(fmt)

every_nth = 5
for n, label in enumerate(ax.xaxis.get_ticklabels()):
    if n % every_nth != 0:
        label.set_visible(False)

plt.xticks(rotation=15)
plt.legend(loc='upper left')

plt.savefig("./history.png", format="png")

print("done", flush=True)
