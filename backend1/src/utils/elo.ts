/**
 * Calculate new Elo ratings for two players after a game.
 * 
 * @param rating1 Current rating of player 1
 * @param rating2 Current rating of player 2
 * @param result Result of the game for player 1 (1 = win, 0.5 = draw, 0 = loss)
 * @param kFactor The K-factor determines how much ratings can change (default 32)
 * @returns Tuple containing the new ratings: [newRating1, newRating2]
 */
export function calculateElo(
    rating1: number,
    rating2: number,
    result: 1 | 0.5 | 0,
    kFactor: number = 32
): [number, number] {
    // Expected score for player 1
    const expectedScore1 = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));

    // Expected score for player 2
    const expectedScore2 = 1 / (1 + Math.pow(10, (rating1 - rating2) / 400));

    // Result for player 2 is the inverse of player 1
    const result2 = 1 - result;

    // Calculate new ratings
    const newRating1 = Math.round(rating1 + kFactor * (result - expectedScore1));
    const newRating2 = Math.round(rating2 + kFactor * (result2 - expectedScore2));

    return [newRating1, newRating2];
}
