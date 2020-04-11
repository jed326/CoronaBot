import sys
import json
import datetime
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

body = json.loads(sys.argv[1])
x, y = [], []

for day in body:
    date = str(day["date"])  # 20200410
    date = date[4:6]+"/"+date[-2:]+"/"+date[:4]
    x.append(datetime.datetime.strptime(date, "%m/%d/%Y").date())
    y.append(day["positive"])

# plt.locator_params(axis="x", nbins=6)

fig, ax = plt.subplots()

days = mdates.DayLocator()
fmt = mdates.DateFormatter("%m-%d-%y")

plt.plot(x, y, '-b')

ax.xaxis.set_major_locator(days)
ax.xaxis.set_major_formatter(fmt)


every_nth = 5
for n, label in enumerate(ax.xaxis.get_ticklabels()):
    if n % every_nth != 0:
        label.set_visible(False)

plt.xticks(rotation=15)


plt.savefig("./history.png", format="png")

print("done", flush=True)
