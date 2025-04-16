document.addEventListener("DOMContentLoaded", () => {
  let data; // Store the data globally
  async function fetchData() {
    try {
      const response = await fetch("processed_data.json");
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching data: ", error);
    }
  }
  async function displayAllReports() {
    data = await fetchData();
    if (data) {
      displayFilteredReports(data, "all"); // Display all reports initially
    }
  }

  displayAllReports();

  document.getElementById("apply-filters").addEventListener("click", () => {
    clearFrequent();
    clearGraph();
    if (data) {
      const startDate = new Date(
        document.getElementById("date-filter-start").value
      );
      const endDate = new Date(
        document.getElementById("date-filter-end").value
      );
      const selectedAgency = document.getElementById("doc-type-filter").value;
      const selectedPlace = document.getElementById("place-filter").value; // Get the selected place

      // Filter reports based on the selected date range, document type, and place
      const filteredReports = data.filter((report) => {
        const reportDate = new Date(report.report_date);
        const agencyMatch =
          selectedAgency === "all" ||
          report.report_id.startsWith(selectedAgency);

        // Check if the selected place exists in the report's places
        const placeMatch = report.persons.some((person) =>
          person.toLowerCase().includes(selectedPlace.toLowerCase())
        );

        return (
          reportDate >= startDate &&
          reportDate <= endDate &&
          agencyMatch &&
          placeMatch
        );
      });

      displayFilteredReports(filteredReports, selectedAgency);
    }
  });

  // New event listener for "Show Highly Mentioned People" button
  document
    .getElementById("show-frequent-persons-btn")
    .addEventListener("click", function () {
      clearFilteredReports();
      clearFrequent();
      clearGraph();
      fetchData()
        .then((data) => {
          if (data) {
            const suspectFrequency = countSuspectAppearances(data);
            displayHighFrequencySuspects(suspectFrequency);
          }
        })
        .catch((error) => {
          console.error("Failed to process data: ", error);
        });
    });
  document
    .getElementById("show-graph-btn")
    .addEventListener("click", function () {
      clearFilteredReports();
      clearFrequent();
      clearGraph();
      fetchData()
        .then((data) => {
          if (data) {
            const incidentsByMonth = countIncidentsByMonth(data);
            displayGraph(incidentsByMonth);
          }
        })
        .catch((error) => {
          console.error("Failed to process data: ", error);
        });
    });

  // Counts the appearances of each suspect across all reports
  function countSuspectAppearances(reports) {
    const suspectFrequency = new Map();

    reports.forEach((report) => {
      (report.persons || []).forEach((suspect) => {
        suspectFrequency.set(suspect, (suspectFrequency.get(suspect) || 0) + 1);
      });
    });

    return suspectFrequency;
  }

  // Displays suspects who are mentioned above a certain frequency threshold
  function displayHighFrequencySuspects(suspectFrequency) {
    const highFrequencyThreshold = 3; // Set the threshold for high frequency
    const suspectsDiv = document.getElementById("frequent-persons");
    suspectsDiv.innerHTML = ""; // Clear existing list

    const heading = document.createElement("h2");
    heading.textContent = "High Frequency Suspects";
    suspectsDiv.appendChild(heading);

    // Filter, sort, and display suspects
    const validEntries = Array.from(suspectFrequency.entries()).filter(
      ([suspect, _]) => suspect && suspect.trim().length > 0
    );

    validEntries
      .sort((a, b) => b[1] - a[1])
      .forEach(([suspect, count]) => {
        if (count >= highFrequencyThreshold) {
          const suspectDiv = document.createElement("div");
          suspectDiv.textContent = `${suspect}: ${count} report(s)`;
          suspectsDiv.appendChild(suspectDiv);
        }
      });
  }
  function displayFilteredReports(reports, filterAgency) {
    const reportsDiv = document.getElementById("reports");
    reportsDiv.innerHTML = ""; // Clear existing reports

    // Filter reports based on the agency, "all" for no filter, or specific code for an agency
    let filteredReports;
    if (filterAgency === "all") {
      filteredReports = reports;
    } else {
      // When "FBI" is selected, include reports starting with "FBI"
      // Adapt this logic if your report ID structure is different
      filteredReports = reports.filter((report) =>
        report.report_id.startsWith(filterAgency)
      );
    }

    // Display filtered reports
    filteredReports.forEach((report) => {
      const reportElement = document.createElement("div");
      reportElement.classList.add("report-card");

      const reportHTML = `
        <h3>${report.report_id}</h3>
        <p><strong>Report Date:</strong> ${report.report_date}</p>
        <p><strong>Description:</strong> ${report.report_description}</p>
        <p><strong>Persons:</strong> ${
          report.persons ? report.persons.join(", ") : ""
        }</p>
        <p><strong>Dates:</strong> ${
          report.dates ? report.dates.join(", ") : ""
        }</p>
        <p><strong>Places:</strong> ${
          report.places ? report.places.join(", ") : ""
        }</p>
        <p><strong>Organizations:</strong> ${
          report.organizations ? report.organizations.join(", ") : ""
        }</p>
      `;
      reportElement.innerHTML = reportHTML;
      reportsDiv.appendChild(reportElement);
    });
  }
  function countIncidentsByMonth(reports) {
    const incidentsByMonth = new Map();

    reports.forEach((report) => {
      const month = new Date(report.report_date).getMonth();
      incidentsByMonth.set(month, (incidentsByMonth.get(month) || 0) + 1);
    });

    return Array.from(incidentsByMonth.entries()).sort((a, b) => a[0] - b[0]);
  }

  function displayGraph(incidentsData) {
    // Set the dimensions and margins of the graph
    const margin = { top: 30, right: 30, bottom: 70, left: 60 },
      width = 460 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

    // Append the svg object to the div called 'graph-container'
    const svg = d3
      .select("#graph-container")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X axis
    const x = d3
      .scaleBand()
      .range([0, width])
      .domain(incidentsData.map((d) => d[0]))
      .padding(0.2);

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));
    svg
      .append("text")
      .attr("text-anchor", "end")
      .attr("transform", "rotate(0)")
      .attr("y", height + 30)
      .attr("x", width)
      .text("Months and NaN is no date data");
    // Add Y axis
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(incidentsData, (d) => d[1])])
      .range([height, 0]);
    svg.append("g").call(d3.axisLeft(y));
    svg
      .append("text")
      .attr("text-anchor", "end")
      .attr("transform", "rotate(-90)")
      .attr("y", 15 - margin.left)
      .attr("x", margin.top - height / 2)
      .text(" Total Incidents");

    // Bars
    svg
      .selectAll("mybar")
      .data(incidentsData)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d[0]))
      .attr("y", (d) => y(d[1]))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - y(d[1]))
      .attr("fill", "#69b3a2");
  }
  function clearFilteredReports() {
    const reportsDiv = document.getElementById("reports");
    reportsDiv.innerHTML = ""; // Clear existing reports
  }
  function clearFrequent() {
    const reportsDiv = document.getElementById("frequent-persons");
    reportsDiv.innerHTML = ""; // Clear existing reports
  }

  function clearGraph() {
    const graphContainer = document.getElementById("graph-container");
    graphContainer.innerHTML = ""; // Clear existing graph
  }
});
