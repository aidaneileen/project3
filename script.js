const svg = d3.select("svg");
svg.attr("width", 1000).attr("height", 700);
const margin = { top: 60, right: 40, bottom: 60, left: 60 };
const width = +svg.attr("width") - margin.left - margin.right;
const height = +svg.attr("height") - margin.top - margin.bottom;

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

svg.append("defs").append("clipPath")
  .attr("id", "clip")
  .append("rect")
  .attr("width", width)
  .attr("height", height);

const chartGroup = g.append("g").attr("clip-path", "url(#clip)");

const computeNormalizedAverageSeries = (data) => {
  const keys = Object.keys(data[0]).filter(k => typeof data[0][k] === "number");
  const maxPerMouse = {};
  keys.forEach(k => {
    maxPerMouse[k] = d3.max(data, d => d[k]);
  });
  return data.map((row, i) => {
    const normalizedValues = keys.map(k => row[k] / maxPerMouse[k]);
    return { minute: i, avg_activity: d3.mean(normalizedValues) };
  });
};

const computeAverageTemperatureSeries = (data) => {
  const keys = Object.keys(data[0]).filter(k => typeof data[0][k] === "number");
  return data.map((row, i) => {
    const values = keys.map(k => row[k]);
    return { minute: i, avg_temp: d3.mean(values) };
  });
};

const movingAverage = (data, valueKey = "avg_activity", windowSize = 30) => {
  return data.map((d, i) => {
    const start = Math.max(0, i - windowSize);
    const slice = data.slice(start, i + 1).map(e => e[valueKey]);
    return {
      minute: d.minute,
      value: d3.mean(slice)
    };
  });
};

Promise.all([
  d3.csv("data/Female_Act.csv", d3.autoType),
  d3.csv("data/Male_Act.csv", d3.autoType),
  d3.csv("data/Female_Temp.csv", d3.autoType),
  d3.csv("data/Male_Temp.csv", d3.autoType)
]).then(([femaleAct, maleAct, femaleTemp, maleTemp]) => {
  let currentMode = "activity";
  let currentUnit = "C";

  const femaleActAvg = movingAverage(computeNormalizedAverageSeries(femaleAct));
  const maleActAvg = movingAverage(computeNormalizedAverageSeries(maleAct));
  const femaleTempC = movingAverage(computeAverageTemperatureSeries(femaleTemp), "avg_temp");
  const maleTempC = movingAverage(computeAverageTemperatureSeries(maleTemp), "avg_temp");

  function convertToF(dataC) {
    return dataC.map(d => ({ minute: d.minute, value: d.value * 9 / 5 + 32 }));
  }

  let femaleTempAvg = femaleTempC;
  let maleTempAvg = maleTempC;

  const totalMinutes = femaleActAvg.length;

  let x = d3.scaleLinear().domain([0, totalMinutes - 1]).range([0, width]);
  let y = d3.scaleLinear().domain([0, 1]).range([height, 0]);

  const line = d3.line().x(d => x(d.minute)).y(d => y(d.value));

  const femalePath = chartGroup.append("path").datum(femaleActAvg).attr("class", "line female").attr("d", line).style("stroke-width", 0.8);
  const malePath = chartGroup.append("path").datum(maleActAvg).attr("class", "line male").attr("d", line).style("stroke-width", 0.8);

  const femaleDots = chartGroup.selectAll(".dot.female")
    .data(femaleActAvg)
    .enter().append("circle")
    .attr("class", "dot female")
    .attr("cx", d => x(d.minute))
    .attr("cy", d => y(d.value))
    .attr("r", 2)
    .attr("fill", "hotpink")
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", .9);
      const day = Math.floor(d.minute / 1440);
      const hour = Math.floor((d.minute % 1440) / 60);
      const minute = d.minute % 60;
      tooltip.html(`Day ${day} Hr ${hour} Min ${minute}<br>${currentMode === "activity" ? `Activity: ${(d.value * 100).toFixed(1)}%` : `Temp: ${d.value.toFixed(2)}°${currentUnit}`}`)
        .style("left", (event.pageX + 5) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));

  const maleDots = chartGroup.selectAll(".dot.male")
    .data(maleActAvg)
    .enter().append("circle")
    .attr("class", "dot male")
    .attr("cx", d => x(d.minute))
    .attr("cy", d => y(d.value))
    .attr("r", 2)
    .attr("fill", "steelblue")
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", .9);
      const day = Math.floor(d.minute / 1440);
      const hour = Math.floor((d.minute % 1440) / 60);
      const minute = d.minute % 60;
      tooltip.html(`Day ${day} Hr ${hour} Min ${minute}<br>${currentMode === "activity" ? `Activity: ${(d.value * 100).toFixed(1)}%` : `Temp: ${d.value.toFixed(2)}°${currentUnit}`}`)
        .style("left", (event.pageX + 5) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));

    // === Female toggle ===
d3.select("#toggleFemale").on("change", function () {
  const display = this.checked ? null : "none";
  femalePath.style("display", display);
  femaleDots.style("display", display);
});

// === Male toggle ===
d3.select("#toggleMale").on("change", function () {
  const display = this.checked ? null : "none";
  malePath.style("display", display);
  maleDots.style("display", display);
});

  const xAxis = g.append("g").attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`);

  const yAxis = g.append("g").attr("class", "y-axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${Math.round(d * 100)}%`));

  function updateYAxis() {
    if (currentMode === "activity") {
      y.domain([0, 1]);
      yAxis.call(d3.axisLeft(y).ticks(5).tickFormat(d => `${Math.round(d * 100)}%`));
      d3.select("#yAxisLabel").text("Avg Activity (0–100%)");
    } else {
      const [fMin, fMax] = currentUnit === "C" ? [35, 39] : [95, 102.2];
      y.domain([fMin, fMax]);
      yAxis.call(d3.axisLeft(y).ticks(5));
      d3.select("#yAxisLabel").text(`Avg Temperature (°${currentUnit})`);
    }
  }

  function updateXAxis(scale) {
    const dayTickValues = d3.range(0, 14 * 1440 + 1, 1440);
    xAxis.call(d3.axisBottom(scale).tickValues(dayTickValues).tickFormat(d => `Day ${Math.floor(d / 1440)}`));
  }

  updateXAxis(x);

  const estrusDays = [2, 6, 10, 14];
  const estrusMinutes = estrusDays.map(day => day * 1440);

  g.selectAll(".estrus-line")
    .data(estrusMinutes)
    .enter().append("line")
    .attr("class", "estrus-line")
    .attr("x1", d => x(d))
    .attr("x2", d => x(d))
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "purple")
    .attr("stroke-dasharray", "4,4");

  g.selectAll(".estrus-label")
    .data(estrusMinutes)
    .enter().append("text")
    .attr("class", "estrus-label")
    .attr("x", d => x(d) + 4)
    .attr("y", 15)
    .attr("fill", "purple")
    .attr("font-size", "10px")
    .text("Estrus");

  const zoom = d3.zoom()
    .scaleExtent([1, 20])
    .translateExtent([[0, 0], [width, height]])
    .extent([[0, 0], [width, height]])
    .on("zoom", event => {
      const newX = event.transform.rescaleX(x);
      updateXAxis(newX);

      femalePath.attr("d", line.x(d => newX(d.minute)));
      malePath.attr("d", line.x(d => newX(d.minute)));
      femaleDots.attr("cx", d => newX(d.minute));
      maleDots.attr("cx", d => newX(d.minute));
      g.selectAll(".estrus-line").attr("x1", d => newX(d)).attr("x2", d => newX(d));
      g.selectAll(".estrus-label").attr("x", d => newX(d) + 4);
    });

  svg.call(zoom);

  d3.select("#dataToggle").on("change", function () {
    currentMode = this.value;
    const femaleData = currentMode === "activity" ? femaleActAvg : (currentUnit === "C" ? femaleTempC : convertToF(femaleTempC));
    const maleData = currentMode === "activity" ? maleActAvg : (currentUnit === "C" ? maleTempC : convertToF(maleTempC));

    updateYAxis();

    femalePath.datum(femaleData).attr("d", line);
    malePath.datum(maleData).attr("d", line);
    femaleDots.data(femaleData).attr("cy", d => y(d.value));
    maleDots.data(maleData).attr("cy", d => y(d.value));
  });

  d3.select("#unitToggle").on("change", function () {
    currentUnit = this.value;
    if (currentMode !== "activity") {
      const femaleData = currentUnit === "C" ? femaleTempC : convertToF(femaleTempC);
      const maleData = currentUnit === "C" ? maleTempC : convertToF(maleTempC);
      updateYAxis();

      femalePath.datum(femaleData).attr("d", line);
      malePath.datum(maleData).attr("d", line);
      femaleDots.data(femaleData).attr("cy", d => y(d.value));
      maleDots.data(maleData).attr("cy", d => y(d.value));
    }
  });

  svg.append("text")
    .attr("x", margin.left + width / 2)
    .attr("y", height + margin.top + 35)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Time (Days)");

svg.append("text")
  .attr("id", "yAxisLabel")
  .attr("transform", `translate(20, ${margin.top + height / 2}) rotate(-90)`)
  .attr("text-anchor", "middle")
  .style("font-size", "14px")
  .style("font-weight", "bold")
  .text("Avg Activity (0–100%)");
});
