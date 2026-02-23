async function displaySeatingMap(venueList, place, eventid, isLoggedIn) {
    venueList.innerHTML = ''; // Clear existing content

    // Create a container for the venue
    const container = document.createElement("div");
    container.classList.add("venue-container");

    // Add the venue name
    const placeInfo = document.createElement("p");
    placeInfo.innerHTML = `<strong>Venue:</strong> ${place}`;
    container.appendChild(placeInfo);

    // Create the canvas for the seating map
    const canvas = document.createElement("canvas");
    canvas.width = 600;  // Adjust as needed
    canvas.height = 200; // Adjust as needed
    canvas.classList.add("seating-chart");
    container.appendChild(canvas);

    venueList.appendChild(container);

    // Get seating data from API or mock data (if no backend yet)
    const seatData = await fetchSeatData(eventid);

    // Render the seating chart
    renderSeatingChart(canvas, seatData, isLoggedIn);
}

// Function to fetch seat availability from the backend (replace with actual API call)
async function fetchSeatData(eventid) {
    // Simulated data structure
    return [
        { row: 1, col: 1, status: "available" },
        { row: 1, col: 2, status: "booked" },
        { row: 1, col: 3, status: "VIP" },
        { row: 2, col: 1, status: "available" },
        { row: 2, col: 2, status: "available" },
        { row: 2, col: 3, status: "booked" },
        // More seats...
    ];
}

// Function to render the seating chart
function renderSeatingChart(canvas, seatData, isLoggedIn) {
    const ctx = canvas.getContext("2d");
    const seatSize = 40; // Size of each seat
    const padding = 10; // Space between seats
    const rows = 5; // Number of rows (adjust as needed)
    const cols = 10; // Number of columns (adjust as needed)

    // Draw seats
    seatData.forEach(({ row, col, status }) => {
        const x = col * (seatSize + padding);
        const y = row * (seatSize + padding);

        // Seat colors based on status
        let color;
        if (status === "available") color = "green";
        else if (status === "booked") color = "red";
        else if (status === "VIP") color = "gold";
        else color = "gray";

        ctx.fillStyle = color;
        ctx.fillRect(x, y, seatSize, seatSize);

        // Outline
        ctx.strokeStyle = "black";
        ctx.strokeRect(x, y, seatSize, seatSize);
    });

    // Handle seat selection if user is logged in
    if (isLoggedIn) {
        canvas.addEventListener("click", (event) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            seatData.forEach((seat) => {
                const x = seat.col * (seatSize + padding);
                const y = seat.row * (seatSize + padding);

                if (
                    mouseX >= x &&
                    mouseX <= x + seatSize &&
                    mouseY >= y &&
                    mouseY <= y + seatSize
                ) {
                    if (seat.status === "available") {
                        alert(`Seat at Row ${seat.row}, Column ${seat.col} selected!`);
                        // Here, you can send the selection to the backend
                    } else {
                        alert("This seat is not available.");
                    }
                }
            });
        });
    }
}

export {displaySeatingMap};