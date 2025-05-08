
// === Load and Initialize Datasets ===
Promise.all([
  d3.csv("data/Female_Act.csv", d3.autoType),
  d3.csv("data/Male_Act.csv", d3.autoType),
  d3.csv("data/Female_Temp.csv", d3.autoType),
  d3.csv("data/Male_Temp.csv", d3.autoType)
]).then(([femaleAct, maleAct, femaleTemp, maleTemp]) => {
  drawTotalActivityBox(femaleAct, maleAct);
  drawHourlyLine(femaleAct, maleAct);
  drawDailyBar(femaleAct, maleAct);
  drawTemperatureLine(femaleTemp, maleTemp);
  drawScatterPlot(femaleAct, femaleTemp);
});



function drawTotalActivityBox(femaleAct, maleAct) {
  const data = [];

  femaleAct.columns.forEach(key => {
    const total = d3.sum(femaleAct.map(d => d[key]));
    data.push({ mouse: key, sex: "Female", total });
  });

  maleAct.columns.forEach(key => {
    const total = d3.sum(maleAct.map(d => d[key]));
    data.push({ mouse: key, sex: "Male", total });
  });

  const svg = d3.select("#viz1");
  svg.attr("width", 1000).attr("height", 725);
  const margin = { top: 60, right: 40, bottom: 80, left: 60 };
  const width = +svg.attr("width") - margin.left - margin.right;
  const height = +svg.attr("height") - margin.top - margin.bottom;
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(data.map(d => d.mouse)).range([0, width]).padding(0.2);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.total)]).nice().range([height, 0]);
  const color = d3.scaleOrdinal().domain(["Female", "Male"]).range(["hotpink", "steelblue"]);

  g.append("g").call(d3.axisLeft(y).tickFormat(d => Math.round(d / 1000) + "k"));
  g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x))
    .selectAll("text").attr("transform", "rotate(-45)").style("text-anchor", "end");

  g.selectAll("rect").data(data).enter().append("rect")
    .attr("x", d => x(d.mouse))
    .attr("y", d => y(d.total))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.total))
    .attr("fill", d => color(d.sex));

  svg.append("text").attr("x", width / 2 + margin.left).attr("y", height + margin.top + 40)
    .attr("text-anchor", "middle").style("font-size", "14px").text("Mouse ID (Grouped by Sex)");

  svg.append("text").attr("transform", "rotate(-90)")
    .attr("x", -height / 2 - margin.top).attr("y", 20)
    .attr("text-anchor", "middle").style("font-size", "14px").text("Total Activity Count");
}



function drawHourlyLine(femaleAct, maleAct) {
  const svg = d3.select("#viz2").attr("width", 1000).attr("height", 725);
  const margin = { top: 60, right: 40, bottom: 80, left: 60 };
  const width = +svg.attr("width") - margin.left - margin.right;
  const height = +svg.attr("height") - margin.top - margin.bottom;
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const avg = data => {
    const result = [];
    for (let h = 0; h < 24; h++) {
      let values = [];
      for (let d = 0; d < 14; d++) {
        const start = d * 1440 + h * 60;
        const end = start + 60;
        for (let i = start; i < end; i++) {
          values.push(d3.mean(Object.values(data[i])));
        }
      }
      result.push({ hour: h, value: d3.mean(values) });
    }
    return result;
  };

  const fData = avg(femaleAct);
  const mData = avg(maleAct);

  const x = d3.scaleLinear().domain([0, 23]).range([0, width]);
  const y = d3.scaleLinear().domain([0, d3.max([...fData, ...mData], d => d.value)]).nice().range([height, 0]);

  const line = d3.line().x(d => x(d.hour)).y(d => y(d.value));

  g.append("path").datum(fData).attr("fill", "none").attr("stroke", "hotpink").attr("stroke-width", 2).attr("d", line);
  g.append("path").datum(mData).attr("fill", "none").attr("stroke", "steelblue").attr("stroke-width", 2).attr("d", line);

  g.append("g").call(d3.axisLeft(y));
  g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(24).tickFormat(d => `${d}:00`));

  svg.append("text").attr("x", width / 2 + margin.left).attr("y", height + margin.top + 40)
    .attr("text-anchor", "middle").text("Hour of Day");

  svg.append("text").attr("transform", "rotate(-90)")
    .attr("x", -(+svg.attr("height") / 2)).attr("y", 20)
    .attr("text-anchor", "middle").text("Average Activity Level");
}



function drawDailyBar(femaleAct, maleAct) {
  const svg = d3.select("#viz3").attr("width", 1000).attr("height", 725);
  const margin = { top: 60, right: 40, bottom: 80, left: 60 };
  const width = +svg.attr("width") - margin.left - margin.right;
  const height = +svg.attr("height") - margin.top - margin.bottom;
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const fData = [], mData = [];
  for (let d = 0; d < 14; d++) {
    const start = d * 1440, end = (d + 1) * 1440;
    fData.push({ day: d + 1, value: d3.mean(femaleAct.slice(start, end).map(row => d3.mean(Object.values(row)))) });
    mData.push({ day: d + 1, value: d3.mean(maleAct.slice(start, end).map(row => d3.mean(Object.values(row)))) });
  }

  const x = d3.scaleBand().domain(fData.map(d => d.day)).range([0, width]).padding(0.2);
  const y = d3.scaleLinear().domain([0, d3.max([...fData, ...mData], d => d.value)]).nice().range([height, 0]);

  g.selectAll(".barF").data(fData).enter().append("rect")
    .attr("x", d => x(d.day) - x.bandwidth() / 4)
    .attr("y", d => y(d.value))
    .attr("width", x.bandwidth() / 2)
    .attr("height", d => height - y(d.value))
    .attr("fill", "hotpink");

  g.selectAll(".barM").data(mData).enter().append("rect")
    .attr("x", d => x(d.day) + x.bandwidth() / 4)
    .attr("y", d => y(d.value))
    .attr("width", x.bandwidth() / 2)
    .attr("height", d => height - y(d.value))
    .attr("fill", "steelblue");

  g.append("g").call(d3.axisLeft(y));
  g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d => "Day " + d));

  svg.append("text").attr("x", width / 2 + margin.left).attr("y", height + margin.top + 40)
    .attr("text-anchor", "middle").text("Day");

  svg.append("text").attr("transform", "rotate(-90)")
    .attr("x", -(+svg.attr("height") / 2)).attr("y", 20)
    .attr("text-anchor", "middle").text("Average Activity Level");
}



function drawTemperatureLine(femaleTemp, maleTemp) {
  const svg = d3.select("#viz4").attr("width", 1000).attr("height", 725);
  const margin = { top: 60, right: 40, bottom: 80, left: 60 };
  const width = +svg.attr("width") - margin.left - margin.right;
  const height = +svg.attr("height") - margin.top - margin.bottom;
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const fData = femaleTemp.map((d, i) => ({ minute: i, value: d3.mean(Object.values(d)) }));
  const mData = maleTemp.map((d, i) => ({ minute: i, value: d3.mean(Object.values(d)) }));

  const x = d3.scaleLinear().domain([0, fData.length]).range([0, width]);
  const y = d3.scaleLinear().domain(d3.extent([...fData, ...mData], d => d.value)).nice().range([height, 0]);

  const line = d3.line().x(d => x(d.minute)).y(d => y(d.value));

  g.append("path").datum(fData).attr("fill", "none").attr("stroke", "hotpink").attr("stroke-width", 1.5).attr("d", line);
  g.append("path").datum(mData).attr("fill", "none").attr("stroke", "steelblue").attr("stroke-width", 1.5).attr("d", line);

  g.append("g").call(d3.axisLeft(y));
  g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(7).tickFormat(d => "Min " + Math.floor(d)));

  svg.append("text").attr("x", width / 2 + margin.left).attr("y", height + margin.top + 40)
    .attr("text-anchor", "middle").text("Time (Minutes)");

  svg.append("text").attr("transform", "rotate(-90)")
    .attr("x", -(+svg.attr("height") / 2)).attr("y", 20)
    .attr("text-anchor", "middle").text("Average Temperature (°C)");
}



function drawScatterPlot(femaleAct, femaleTemp) {
  const svg = d3.select("#viz5").attr("width", 1000).attr("height", 725);
  const margin = { top: 60, right: 40, bottom: 80, left: 60 };
  const width = +svg.attr("width") - margin.left - margin.right;
  const height = +svg.attr("height") - margin.top - margin.bottom;
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const data = [];
  for (let i = 0; i < femaleAct.length; i++) {
    for (let key of femaleAct.columns) {
      const activity = femaleAct[i][key];
      const temp = femaleTemp[i][key];
      if (activity != null && temp != null) {
        data.push({ activity, temperature: temp });
      }
    }
  }

  const x = d3.scaleLinear().domain(d3.extent(data, d => d.temperature)).nice().range([0, width]);
  const y = d3.scaleLinear().domain(d3.extent(data, d => d.activity)).nice().range([height, 0]);

  g.append("g").call(d3.axisLeft(y));
  g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(5));

  g.selectAll("circle").data(data).enter().append("circle")
    .attr("cx", d => x(d.temperature))
    .attr("cy", d => y(d.activity))
    .attr("r", 2).attr("fill", "hotpink").attr("opacity", 0.3);

  svg.append("text").attr("x", width / 2 + margin.left).attr("y", height + margin.top + 40)
    .attr("text-anchor", "middle").text("Temperature (°C)");

  svg.append("text").attr("transform", "rotate(-90)")
    .attr("x", -(+svg.attr("height") / 2)).attr("y", 20)
    .attr("text-anchor", "middle").text("Activity Level");
}
