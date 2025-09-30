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

async function updateDepartureBoard(connection, destinationInput) {
    if (!connection) {
        document.getElementById("apiDestination").textContent =
            "No departures found";
        return;
    }
    const firstSectionWithJourney = connection.sections.find((s) => s.journey);
    if (!firstSectionWithJourney) {
        document.getElementById("apiDestination").textContent =
            "No train journey found";
        return;
    }
    // Train information
    const journey = firstSectionWithJourney.journey;
    const departure = firstSectionWithJourney.departure;
    const arrival = firstSectionWithJourney.arrival;

    document.getElementById("trainType").textContent = journey.category || "";
    document.getElementById("trainNumber").textContent = journey.number || "";
    document.getElementById("departureTime").textContent = formatTime(
        departure.departure
    );
    document.getElementById("arrivalTime").textContent =
        arrival && arrival.arrival ? formatTime(arrival.arrival) : "";

    // Track
    const track = departure.platform;
    document.getElementById("trackInfo").innerHTML = track
        ? `<span class="db-track-label h3">Gleis:</span> <span class="db-track-num">${track}</span>`
        : "";

    // Destination
    const apiDestination = connection.to?.name || destinationInput;
    document.getElementById("apiDestination").textContent = apiDestination;

    // Stops
    let allStops = [];
    connection.sections.forEach((section) => {
        if (
            section.journey &&
            section.journey.passList &&
            section.journey.passList.length > 2
        ) {
            // Remove origin and destination for this section
            const stops = section.journey.passList.slice(1, -1);
            allStops = allStops.concat(
                stops.map((stop) => {
                    stop.station.arrival = stop.arrival;
                    return stop.station;
                })
            );
        }
    });

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
        "Fribourg/Freiburg",
    ];

    const bannedStations = ["Bahn-2000-Strecke"];

    let via = allStops.filter((stop) => majorStations.includes(stop.name));
    if (via.length < 4) {
        via = [
            ...via,
            ...allStops.filter(
                (stop) =>
                    !majorStations.includes(stop.name) &&
                    !bannedStations.includes(stop.name)
            ),
        ];
    }
    via = via.slice(0, 4);

    document.getElementById("viaStations").innerHTML = via
        .map((stop) => `<span class="db-stop">${stop.name}</span>`)
        .join(" ");

    // Debug: show all stops and which ones are highlighted
    console.log("All stops from passList:", allStops);
    console.log("Highlighted major stations (via):", via);

    const imagePromises = via.map((stop) => fetchUnsplashImage(stop.name));
    const images = await Promise.all(imagePromises);

    const imageCell = document.getElementById("destinationImageCell");
    if (images && imageCell) {
        new SimpleCarousel(imageCell, images, via, {
            gap: 16,
            height: 800,
        });
    } else if (imageCell) {
        imageCell.innerHTML = `<span style="color:#999;">No image</span>`; // clear if no image
    }
}

// Unsplash
async function fetchUnsplashImage(query) {
    const accessKey = "EUacxq3MNy1wrTdJPLIvX9ngjfoihypnD-Dooh6uSrg"; // Unsplash Access Key
    const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
        query
    )}&orientation=landscape&client_id=${accessKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok)
            throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        return data.urls.regular; // usable image URL
    } catch (error) {
        console.error(error);
        return null; // fallback if API fails
    }
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

        const connection =
            data.connections && data.connections.length > 0
                ? data.connections[0]
                : null;

        updateDepartureBoard(connection, toLocation);

        // Local time updater
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
            document.getElementById(
                "localTimeCell"
            ).innerHTML = `<span class="db-current-hour h3">${h}</span><span class="db-current-colon h3" style="${colonStyle}">:</span><span class="db-current-minute h3">${m}</span>`;
        }
        window._localTimeInterval = setInterval(updateLocalTimeCell, 1000);
        updateLocalTimeCell();
    } catch (error) {
        console.error(error);
        document.getElementById("apiDestination").textContent =
            "Error loading data";
        document.getElementById("destinationImageCell").innerHTML = "";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const side = urlParams.get("side"); // input, left, right

    const searchScreen = document.getElementById("searchScreen");
    const resultScreen = document.getElementById("resultScreen");

    // -------------------
    // LEFT / RIGHT MONITORS
    // -------------------
    if (side === "left" || side === "right") {
        const board = document.querySelector(".departure-board-8x4");

        // Make grid 4 columns only
        board.style.gridTemplateColumns = "repeat(4, 1fr)";

        const allCells = document.querySelectorAll(
            ".departure-board-8x4 .db-cell, #destinationImageCell"
        );

        allCells.forEach((cell) => {
            const gridColumn = cell.style.gridColumn;
            if (gridColumn) {
                const parts = gridColumn.split("/");
                const start = parseInt(parts[0]);
                const span = parts[1]
                    ? parseInt(parts[1].replace("span", "").trim())
                    : 1;
                const end = parts[1] ? start + span - 1 : start;

                if (side === "left") {
                    // Keep only columns 1–4
                    if (end > 4) {
                        cell.style.display = "none";
                    }
                } else if (side === "right") {
                    // Keep only columns 5–8, remap to 1–4
                    if (start < 5) {
                        cell.style.display = "none";
                    } else {
                        const newStart = start - 4;
                        cell.style.gridColumn = `${newStart} / span ${span}`;
                    }
                }
            }
        });

        searchScreen.style.display = "none";
        resultScreen.style.display = "flex";

        // Receive data from input monitor
        window.addEventListener("message", (event) => {
            if (event.data.destination) loadData(event.data.destination);
        });
    }

    // -------------------
    // INPUT MONITOR
    // -------------------
    if (side === "input") {
        searchScreen.style.display = "flex";
        resultScreen.style.display = "none";

        const locationInput = document.getElementById("locationInput");
        let leftMonitor, rightMonitor;

        // Press Enter to open monitors and send data
        locationInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                const destination = locationInput.value.trim();
                if (!destination) return;

                // Open monitors only after user action
                if (!leftMonitor || leftMonitor.closed) {
                    leftMonitor = window.open(
                        "index.html?side=left",
                        "leftMonitor",
                        "width=1920,height=1080"
                    );
                }
                if (!rightMonitor || rightMonitor.closed) {
                    rightMonitor = window.open(
                        "index.html?side=right",
                        "rightMonitor",
                        "width=1920,height=1080"
                    );
                }

                // Send destination to both monitors
                if (leftMonitor && !leftMonitor.closed)
                    leftMonitor.postMessage({ destination }, "*");
                if (rightMonitor && !rightMonitor.closed)
                    rightMonitor.postMessage({ destination }, "*");
            }
        });
    }
});
