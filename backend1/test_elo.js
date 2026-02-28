import WebSocket from "ws";

async function runTest() {
    console.log("Starting Elo Rating Integration Test...");

    // 1. Register User 1
    const p1Id = Date.now().toString() + "_1";
    console.log("Registering Player 1...");
    const res1 = await fetch("http://localhost:8080/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `p1_${p1Id}@test.com`, name: "TestPlayer1", password: "pwd" })
    });
    const auth1 = await res1.json();
    console.log(`Player 1 Rating: ${auth1.user.rating}`);

    // 2. Register User 2
    const p2Id = Date.now().toString() + "_2";
    console.log("Registering Player 2...");
    const res2 = await fetch("http://localhost:8080/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `p2_${p2Id}@test.com`, name: "TestPlayer2", password: "pwd" })
    });
    const auth2 = await res2.json();
    console.log(`Player 2 Rating: ${auth2.user.rating}`);

    // 3. Connect WebSockets
    const ws1 = new WebSocket("ws://localhost:8080");
    const ws2 = new WebSocket("ws://localhost:8080");

    await new Promise(r => setTimeout(r, 1000)); // Wait for connection

    // 4. Authenticate
    ws1.send(JSON.stringify({ type: "auth", payload: { token: auth1.token } }));
    ws2.send(JSON.stringify({ type: "auth", payload: { token: auth2.token } }));

    await new Promise(r => setTimeout(r, 500));

    // 5. Matchmake with unique time to avoid ghost sockets
    console.log("Queueing for match...");
    ws1.send(JSON.stringify({ type: "find_match", payload: { time: 999999 } }));
    ws2.send(JSON.stringify({ type: "find_match", payload: { time: 999999 } }));

    let gameStarted = false;

    ws1.on("message", async (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === "init_game") {
            console.log("Game started! My color:", msg.payload.color);
            gameStarted = true;

            // 6. Wait a bit, then resign
            setTimeout(() => {
                console.log("Player 1 resigns.");
                ws1.send(JSON.stringify({ type: "resign" }));
            }, 1000);
        }

        if (msg.type === "game_over") {
            console.log("Game Over Event Received!", msg.payload.newRatings);

            // Wait for DB transaction to fully commit
            await new Promise(r => setTimeout(r, 1000));

            // 7. Check updated ratings from API
            const resUpdated = await fetch("http://localhost:8080/api/auth/me", {
                headers: { "Authorization": `Bearer ${auth1.token}` }
            });
            const authUpdated = await resUpdated.json();

            const resUpdated2 = await fetch("http://localhost:8080/api/auth/me", {
                headers: { "Authorization": `Bearer ${auth2.token}` }
            });
            const authUpdated2 = await resUpdated2.json();

            console.log(`\n--- Final Ratings ---`);
            console.log(`Player 1 Rating: ${authUpdated.user.rating}`);
            console.log(`Player 2 Rating: ${authUpdated2.user.rating}`);

            if (authUpdated.user.rating < 1200 && authUpdated2.user.rating > 1200) {
                console.log("✅ Elo Ratings updated correctly!");
            } else {
                console.log("❌ Elo Ratings failed to update.");
            }

            process.exit(0);
        }
    });

    // Timeout fallback
    setTimeout(() => {
        console.log("Test timed out.");
        process.exit(1);
    }, 10000);
}

runTest();
