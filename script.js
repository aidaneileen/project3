const svg = d3.select("svg");
const margin = { top: 40, right: 30, bottom: 40, left: 60 };
const width = +svg.attr("width") - margin.left - margin.right;
const height = +svg.attr("height") - margin.top - margin.bottom;

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const tooltip = d3.select("body").append("div").attr("class", "tooltip");

// Compute normalized average per row (activity / max for each mouse)
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

// Apply moving average
const movingAverage = (data, windowSize = 30) => {
  return data.map((d, i) => {
    const start = Math.max(0, i - windowSize);
    const slice = data.slice(start, i + 1).map(e => e.avg_activity);
    return {
      minute: d.minute,
      avg_activity: d3.mean(slice)
    };
  });
};

Promise.all([
  d3.csv("data/Female_Act.csv", d3.autoType),
  d3.csv("data/Male_Act.csv", d3.autoType)
]).then(([femaleData, maleData]) => {
  const femaleAvg = movingAverage(computeNormalizedAverageSeries(femaleData));
  const maleAvg = movingAverage(computeNormalizedAverageSeries(maleData));

  const x = d3.scaleLinear().domain([0, femaleAvg.length]).range([0, width]);
  const y = d3.scaleLinear().domain([0, 1]).range([height, 0]); // Normalized 0 to 1

  const line = d3.line()
    .x(d => x(d.minute))
    .y(d => y(d.avg_activity));

  const femalePath = g.append("path")
    .datum(femaleAvg)
    .attr("class", "line female")
    .attr("d", line);

  const malePath = g.append("path")
    .datum(maleAvg)
    .attr("class", "line male")
    .attr("d", line);

  // Tooltip dots (Female)
  g.selectAll(".dot.female")
    .data(femaleAvg)
    .enter().append("circle")
    .attr("class", "dot female")
    .attr("cx", d => x(d.minute))
    .attr("cy", d => y(d.avg_activity))
    .attr("r", 2)
    .attr("fill", "hotpink")
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1).html(`Female<br>Min: ${d.minute}<br>Activity: ${(d.avg_activity * 100).toFixed(1)}%`)
        .style("left", (event.pageX + 8) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0));

  // Tooltip dots (Male)
  g.selectAll(".dot.male")
    .data(maleAvg)
    .enter().append("circle")
    .attr("class", "dot male")
    .attr("cx", d => x(d.minute))
    .attr("cy", d => y(d.avg_activity))
    .attr("r", 2)
    .attr("fill", "steelblue")
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1).html(`Male<br>Min: ${d.minute}<br>Activity: ${(d.avg_activity * 100).toFixed(1)}%`)
        .style("left", (event.pageX + 8) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0));

  // Axes
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(14).tickFormat(d => `Day ${Math.floor(d / 1440) + 1}`));

  g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d => `${Math.round(d * 100)}%`));

  // Toggle functionality
  d3.select("#toggleFemale").on("change", function () {
    femalePath.style("display", this.checked ? null : "none");
    g.selectAll(".dot.female").style("display", this.checked ? null : "none");
  });

  d3.select("#toggleMale").on("change", function () {
    malePath.style("display", this.checked ? null : "none");
    g.selectAll(".dot.male").style("display", this.checked ? null : "none");
  });

  // Estrus Days (Every 4 days starting from Day 2)
  const estrusDays = [1, 5, 9, 13];
  estrusDays.forEach(day => {
    const xPos = x(day * 1440);
    g.append("line")
      .attr("x1", xPos)
      .attr("x2", xPos)
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "purple")
      .attr("stroke-dasharray", "4,4");

    g.append("text")
      .attr("x", xPos + 4)
      .attr("y", 15)
      .attr("fill", "purple")
      .attr("font-size", "10px")
      .text("Estrus");
  });

  // X-axis Label
  svg.append("text")
    .attr("x", margin.left + width / 2)
    .attr("y", height + margin.top + 35)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Time (Days)");

  // Y-axis Label
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(margin.top + height / 2))
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text(" Avg Activity (0–100%)");
});
