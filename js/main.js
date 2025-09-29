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

function updateDepartureBoard(connection, destinationInput) {
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
            allStops = allStops.concat(stops.map((stop) => stop.station.name));
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
    ];

    let via = allStops.filter((stop) => majorStations.includes(stop));
    if (via.length < 4) {
        via = [
            ...via,
            ...allStops.filter((stop) => !majorStations.includes(stop)),
        ];
    }
    via = via.slice(0, 4);
    document.getElementById("viaStations").innerHTML = via
        .map((stop) => `<span class="db-stop">${stop}</span>`)
        .join(" ");

    // Debug: show all stops and which ones are highlighted
    console.log("All stops from passList:", allStops);
    console.log("Highlighted major stations (via):", via);
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

        //Debug passList
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

        updateDepartureBoard(connection, toLocation);

        // Fetch Unsplash image based on user input
        const imageUrl = await fetchUnsplashImage(toLocation);
        const imageCell = document.getElementById("destinationImageCell");
        if (imageUrl && imageCell) {
            imageCell.innerHTML = `<img src="${imageUrl}" alt="${toLocation}" style="width:100%; height:auto; border-radius:4px;">`;
        } else if (imageCell) {
            imageCell.innerHTML = `<span style="color:#999;">No image</span>`; // clear if no image
        }

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

// Input listeners
document.addEventListener("DOMContentLoaded", () => {
    const locationInput = document.getElementById("locationInput");

    locationInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const toLocation = locationInput.value.trim();
            if (!toLocation) return;
            showResultScreen();

            // Reset placeholders
            document.getElementById("trainType").textContent = "–";
            document.getElementById("trainNumber").textContent = "–";
            document.getElementById("departureTime").textContent = "–";
            document.getElementById("arrivalTime").textContent = "–";
            document.getElementById("apiDestination").textContent = "Loading…";
            document.getElementById("trackInfo").textContent = "–";
            document.getElementById("viaStations").textContent = "–";
            document.getElementById(
                "destinationImageCell"
            ).innerHTML = `<span style="color:#999;">Loading…</span>`;

            loadData(toLocation);
        }
    });

    // Escape to go back
    document.addEventListener("keydown", (e) => {
        if (
            e.key === "Escape" &&
            document.getElementById("resultScreen").style.display === "flex"
        ) {
            showSearchScreen();
            locationInput.focus();
        }
    });
});
