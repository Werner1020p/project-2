// get elements from HTML
const totalCount = document.getElementById("totalCount");
const maxMag = document.getElementById("maxMag");
const avgMag = document.getElementById("avgMag");

const searchInput = document.getElementById("searchInput");
const magnitudeFilter = document.getElementById("magnitudeFilter");
const sortSelect = document.getElementById("sortSelect");
const resetBtn = document.getElementById("resetBtn");

const quakeList = document.getElementById("quakeList");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("pageInfo");
const statusMessage = document.getElementById("statusMessage");

// store earthquake data
let allData = [];
let currentData = [];

// pagination
let currentPage = 1;
const itemsPerPage = 20;

// map + chart
let map;
let markerLayer;
let chart;

// create the map first
map = L.map("map").setView([20, 0], 2);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

markerLayer = L.layerGroup().addTo(map);

// get earthquake data from USGS
async function getEarthquakes() {
    statusMessage.textContent = "Loading earthquake data...";

    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);

        const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startDate.toISOString().split("T")[0]}&endtime=${endDate.toISOString().split("T")[0]}&minmagnitude=2.5&limit=300&orderby=time`;

        const response = await fetch(url);
        const data = await response.json();

        // clean the data into a simpler format
        allData = data.features.map((item) => {
            return {
                place: item.properties.place || "Unknown place",
                mag: item.properties.mag || 0,
                time: item.properties.time,
                alert: item.properties.alert || "none",
                tsunami: item.properties.tsunami,
                lat: item.geometry.coordinates[1],
                lng: item.geometry.coordinates[0],
                depth: item.geometry.coordinates[2]
            };
        });

        currentData = [...allData];

        updateEverything();
        statusMessage.textContent = "Earthquake data loaded.";
    } catch (error) {
        console.log("Error:", error);
        statusMessage.textContent = "Could not load earthquake data.";
    }
}

// update stats, list, map, and chart
function updateEverything() {
    updateStats();
    updateList();
    updateMap();
    updateChart();
}

// update stat cards
function updateStats() {
    totalCount.textContent = currentData.length;

    let biggest = 0;
    let total = 0;

    currentData.forEach((quake) => {
        if (quake.mag > biggest) {
            biggest = quake.mag;
        }
        total += quake.mag;
    });

    maxMag.textContent = biggest.toFixed(1);

    if (currentData.length > 0) {
        avgMag.textContent = (total / currentData.length).toFixed(2);
    } else {
        avgMag.textContent = "0.00";
    }
}

// update list with pagination
function updateList() {
    quakeList.innerHTML = "";

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = currentData.slice(start, end);

    pageItems.forEach((quake) => {
        const li = document.createElement("li");

        li.innerHTML = `
      <span class="quake-place">${quake.place}</span>
      <span class="quake-meta">Magnitude: ${quake.mag.toFixed(1)}</span>
      <span class="quake-meta">Time: ${new Date(quake.time).toLocaleString()}</span>
      <span class="quake-meta">Depth: ${quake.depth} km</span>
   `;

        quakeList.appendChild(li);
    });

    const totalPages = Math.ceil(currentData.length / itemsPerPage) || 1;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

// update map markers
function updateMap() {
    markerLayer.clearLayers();

    currentData.forEach((quake) => {
        let color = "#38bdf8";

        if (quake.mag >= 6) {
            color = "#ef4444";
        } else if (quake.mag >= 5) {
            color = "#f97316";
        } else if (quake.mag >= 4) {
            color = "#facc15";
        }

        const marker = L.circleMarker([quake.lat, quake.lng], {
            radius: Math.max(5, quake.mag * 2),
            color: color,
            fillColor: color,
            fillOpacity: 0.7,
            weight: 1
        });

        marker.bindPopup(`
      <strong>${quake.place}</strong><br>
      Magnitude: ${quake.mag.toFixed(1)}<br>
      Time: ${new Date(quake.time).toLocaleString()}<br>
      Depth: ${quake.depth} km<br>
      Alert: ${quake.alert}<br>
      Tsunami: ${quake.tsunami ? "Yes" : "No"}
    `);

        markerLayer.addLayer(marker);
    });
}

// update chart
function updateChart() {
    let bin1 = 0;
    let bin2 = 0;
    let bin3 = 0;
    let bin4 = 0;

    currentData.forEach((quake) => {
        if (quake.mag < 4) {
            bin1++;
        } else if (quake.mag < 5) {
            bin2++;
        } else if (quake.mag < 6) {
            bin3++;
        } else {
            bin4++;
        }
    });

    const labels = ["2.5–3.9", "4.0–4.9", "5.0–5.9", "6.0+"];
    const values = [bin1, bin2, bin3, bin4];

    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = values;
        chart.update();
    } else {
        chart = new Chart(document.getElementById("quakeChart"), {
            type: "bar",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Number of Earthquakes",
                        data: values
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: "#f8fafc"
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: "#f8fafc" },
                        grid: { color: "#334155" }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { color: "#f8fafc" },
                        grid: { color: "#334155" }
                    }
                }
            }
        });
    }
}

// search + filter + sort
function filterData() {
    const searchText = searchInput.value.toLowerCase().trim();
    const minMag = parseFloat(magnitudeFilter.value);
    const sortValue = sortSelect.value;

    currentData = allData.filter((quake) => {
        const matchesPlace = quake.place.toLowerCase().includes(searchText);
        const matchesMagnitude = quake.mag >= minMag;
        return matchesPlace && matchesMagnitude;
    });

    if (sortValue === "recent") {
        currentData.sort((a, b) => b.time - a.time);
    } else if (sortValue === "oldest") {
        currentData.sort((a, b) => a.time - b.time);
    } else if (sortValue === "strongest") {
        currentData.sort((a, b) => b.mag - a.mag);
    } else if (sortValue === "weakest") {
        currentData.sort((a, b) => a.mag - b.mag);
    }

    currentPage = 1;
    updateEverything();
}

// controls
searchInput.addEventListener("input", filterData);
magnitudeFilter.addEventListener("change", filterData);
sortSelect.addEventListener("change", filterData);

resetBtn.addEventListener("click", () => {
    searchInput.value = "";
    magnitudeFilter.value = "2.5";
    sortSelect.value = "recent";

    currentData = [...allData];
    currentPage = 1;
    updateEverything();
});

// pagination buttons
prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        updateList();
    }
});

nextBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(currentData.length / itemsPerPage) || 1;

    if (currentPage < totalPages) {
        currentPage++;
        updateList();
    }
});

// start app
getEarthquakes();