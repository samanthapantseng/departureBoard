function showResultScreen() {
    document.getElementById("searchScreen").style.display = "none";
    document.getElementById("resultScreen").style.display = "flex";
}

function showSearchScreen() {
    document.getElementById("searchScreen").style.display = "flex";
    document.getElementById("resultScreen").style.display = "none";
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderDepartureBoard(connection, destinationInput) {
    if (!connection)
        return '<div class="board-error h3">No departures found.</div>';
    const firstSectionWithJourney = connection.sections.find((s) => s.journey);
    if (!firstSectionWithJourney)
        return '<div class="board-error h3">No train journey found.</div>';

    // Use the first section for train type/number/times/track
    const journey = firstSectionWithJourney.journey;
    const departure = firstSectionWithJourney.departure;
    const arrival = firstSectionWithJourney.arrival;
    const trainType = journey.category || "";
    const trainNumber = journey.number || "";
    const departureTime = formatTime(departure.departure);
    const arrivalTime =
        arrival && arrival.arrival ? formatTime(arrival.arrival) : "";
    const track = departure.platform;

    // Get API station name for destination
    let apiDestination = "";
    if (connection.to && connection.to.name) {
        apiDestination = connection.to.name;
    } else {
        apiDestination = destinationInput;
    }

    // Collect all intermediate stops from all sections
    let allStops = [];
    connection.sections.forEach((section) => {
        if (
            section.journey &&
            section.journey.passList &&
            section.journey.passList.length > 2
        ) {
            // Remove origin and destination for this section
            const stops = section.journey.passList.slice(1, -1);
            allStops = allStops.concat(stops.map((stop) => stop.station.name));
        }
    });

    // Manual list of major Swiss stations
    const majorStations = [
        "Zürich HB",
        "Bern",
        "Basel SBB",
        "Lausanne",
        "Luzern",
        "Geneva",
        "Winterthur",
        "St. Gallen",
        "Biel/Bienne",
        "Olten",
        "Arth-Goldau",
        "Bellinzona",
        "Lugano",
        "Sion",
        "Fribourg",
        "Neuchâtel",
        "Schaffhausen",
        "Chur",
        "Thun",
        "Brig",
        "Zug",
        "Yverdon-les-Bains",
        "Gotthard-Basistunnel",
    ];

    /*
    // Remove duplicates while keeping travel order
    let seen = new Set();
    allStops = allStops.filter((stop) => {
        if (seen.has(stop)) return false;
        seen.add(stop);
        return true;
    });

    // Highlight only the major stations that appear in the journey
    let via = allStops.filter((stop) => majorStations.includes(stop));

    // If less than 4, fill with next stops in travel order
    if (via.length < 4) {
        for (let stop of allStops) {
            if (!via.includes(stop)) {
                via.push(stop);
                if (via.length === 4) break;
            }
        }
    }

    */

    let via = allStops.filter((stop) => majorStations.includes(stop));
    if (via.length < 4) {
        via = [
            ...via,
            ...allStops.filter((stop) => !majorStations.includes(stop)),
        ];
    }
    via = via.slice(0, 4);

    // Debug: show all stops and which ones are highlighted
    console.log("All stops from passList:", allStops);
    console.log("Highlighted major stations (via):", via);

    // Blinking colon for current time, CET
    function getCurrentTimeHTML() {
        const now = new Date();
        const cet = new Date(
            now.toLocaleString("en-US", { timeZone: "Europe/Zurich" })
        );
        let h = cet.getHours().toString().padStart(2, "0");
        let m = cet.getMinutes().toString().padStart(2, "0");
        return `<span class="db-current-hour h3">${h}</span><span class="db-current-colon h3">:</span><span class="db-current-minute h3">${m}</span>`;
    }
    // Compose 4x4 table with typographic hierarchy
    return `
        <div class="departure-board-4x4">
            <div class="db-row">
                <div class="db-cell db-train-type-box"><span class="db-train-type-square h3">${trainType} <span class="db-train-number h3">${trainNumber}</span></span></div>
                <div class="db-cell db-departure-time h3">${departureTime}</div>
                <div class="db-cell db-arrival-time h3">${arrivalTime}</div>
                <div class="db-cell db-current-time h3" id="localTimeCell">${getCurrentTimeHTML()}</div>
            </div>
            <div class="db-row">
                <div class="db-cell db-destination h1" style="grid-column: 1 / span 2;"><b>${apiDestination}</b></div>
                <div class="db-cell db-track h3" style="grid-column: 3 / span 1;">${
                    track
                        ? `<span class="db-track-label h3">Gleis:</span> <span class="db-track-num">${track}</span>`
                        : ""
                }</div>
                <div class="db-cell"></div>
            </div>
            <div class="db-row">
                <div class="db-cell db-via h2" style="grid-column: 1 / span 3;">${via
                    .map((stop) => `<span class="db-stop">${stop}</span>`)
                    .join(" ")}</div>
                <div class="db-cell"></div>
            </div>
            <div class="db-row">
                <div class="db-cell"></div>
                <div class="db-cell"></div>
                <div class="db-cell"></div>
                <div class="db-cell"></div>
            </div>
        </div>
        `;
}

async function loadData(toLocation) {
    const url = `http://transport.opendata.ch/v1/connections?from=8503000&to=${encodeURIComponent(
        toLocation
    )}`;
    try {
        const response = await fetch(url);
        if (!response.ok)
            throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        console.log("API response for:", toLocation, data);

        // Loop over each connection and print its passList
        data.connections.forEach((conn, i) => {
            conn.sections.forEach((section, j) => {
                if (section.journey && section.journey.passList) {
                    console.log(
                        `Connection ${i + 1}, Section ${j + 1} passList:`,
                        section.journey.passList.map((stop) => ({
                            station: stop.station.name,
                            arrival: stop.arrival,
                            departure: stop.departure,
                        }))
                    );
                }
            });
        });

        const connection =
            data.connections && data.connections.length > 0
                ? data.connections[0]
                : null;

        document.getElementById("jsonData").innerHTML = renderDepartureBoard(
            connection,
            toLocation
        );

        // Start or restart local time updater
        if (window._localTimeInterval) clearInterval(window._localTimeInterval);
        let colonVisible = true;
        function updateLocalTimeCell() {
            const now = new Date();
            const cet = new Date(
                now.toLocaleString("en-US", { timeZone: "Europe/Zurich" })
            );
            let h = cet.getHours().toString().padStart(2, "0");
            let m = cet.getMinutes().toString().padStart(2, "0");
            colonVisible = !colonVisible;
            const colonStyle = colonVisible ? "opacity:1;" : "opacity:0;";
            const cell = document.getElementById("localTimeCell");
            if (cell)
                cell.innerHTML = `<span class=\"db-current-hour h3\">${h}</span><span class=\"db-current-colon h3\" style=\"${colonStyle}\">:</span><span class=\"db-current-minute h3\">${m}</span>`;
        }
        window._localTimeInterval = setInterval(updateLocalTimeCell, 1000);
        updateLocalTimeCell();
    } catch (error) {
        console.error("Error fetching data:", error);
        document.getElementById("jsonData").innerHTML =
            '<div class="board-error">Error loading data.</div>';
    }
}

const locationInput = document.getElementById("locationInput");
locationInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const toLocation = locationInput.value.trim();
        if (toLocation) {
            showResultScreen();
            document.getElementById("jsonData").textContent = "Loading...";
            loadData(toLocation);
        }
    }
});

// Optional: allow user to go back to search screen by pressing Escape on result screen
document.addEventListener("keydown", (e) => {
    if (
        e.key === "Escape" &&
        document.getElementById("resultScreen").style.display === "flex"
    ) {
        showSearchScreen();
        locationInput.focus();
    }
});
