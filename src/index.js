const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const { DateTime } = require("luxon");

const SUPPLY_CONSUMPTION = 8;

const server = express();

server.use(express.json());
server.use(cors());

function parseDate(date) {
  return DateTime.fromFormat(date, "dd/MM/yyyy");
}

function getDailyPrice(date, prices) {
  let lastDate;
  prices.forEach(price => {
    if (price.date <= date) {
      lastDate = price;
    } else if (price.date > date) {
      return lastDate;
    }
  });
  return lastDate;
}

function getDailySupplyQuantity(supply, prices) {
  return supply
    ? Number(parseFloat(supply.value).toFixed(10)) /
        Number(parseFloat(getDailyPrice(supply.date, prices).value).toFixed(10))
    : 0;
}

function parseDateArray(dateArray) {
  const parsedArray = [];
  dateArray.map(item => {
    parsedArray.push({
      date: parseDate(item.date),
      value: item.value
    });
  });

  return parsedArray;
}

function buildMasterArray(spents, supplies) {
  const firstDate = supplies[0].date;
  const lastDate =
    spents[spents.length - 1].date < supplies[supplies.length - 1].date
      ? spents[spents.length - 1].date
      : supplies[supplies.length - 1].date;

  const masterArray = [];
  const diff = lastDate.diff(firstDate, "days");
  for (var i = 0; i < diff.values.days; i++) {
    masterArray.push({
      date: firstDate.plus({ days: i })
    });
  }
  return masterArray;
}

server.get("/", async (req, res) => {
  let spents = await fetch(
    "https://challenge-for-adventurers.herokuapp.com/data/5e32de92808721001439003c/spents?reaload=true",
    {
      method: "get"
    }
  );
  let prices = await fetch(
    "https://challenge-for-adventurers.herokuapp.com/data/5e32de92808721001439003c/prices?reaload=true",
    {
      method: "get"
    }
  );
  let supplies = await fetch(
    "https://challenge-for-adventurers.herokuapp.com/data/5e32de92808721001439003c/supplies?reaload=true",
    {
      method: "get"
    }
  );

  spents = parseDateArray(await spents.json());
  prices = parseDateArray(await prices.json());
  supplies = parseDateArray(await supplies.json());

  const masterArray = buildMasterArray(spents, supplies);

  const result = [];

  let currentSupplyQuantity = 0;
  masterArray.forEach(day => {
    const supply = getDailySupplyQuantity(
      supplies.find(supply => +supply.date === +day.date),
      prices
    );
    const spent = () => {
      const getSpent = spents.find(spent => +spent.date === +day.date);
      return getSpent ? getSpent.value / SUPPLY_CONSUMPTION : 0;
    };

    currentSupplyQuantity =
      Number(parseFloat(currentSupplyQuantity).toFixed(10)) +
      (Number(parseFloat(supply).toFixed(10)) -
        Number(parseFloat(spent()).toFixed(10)));
    currentSupplyQuantity = Number(
      parseFloat(currentSupplyQuantity).toFixed(2)
    );

    result.push({
      date: day.date.toLocaleString(),
      value: currentSupplyQuantity
    });
  });

  return res.json({
    result
  });
});

server.listen(3333);
