"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameRoutes = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const authenticate_1 = require("../plugins/authenticate");
async function gameRoutes(fastify) {
    fastify.get('/pools/:id/games', {
        onRequest: [authenticate_1.authenticate]
    }, async (request) => {
        const gamePoolBody = zod_1.z.object({
            id: zod_1.z.string(),
        });
        const { id } = gamePoolBody.parse(request.params);
        const games = await prisma_1.prisma.game.findMany({
            orderBy: {
                date: 'desc',
            },
            where: {
                date: new Date()
            },
            include: {
                guesses: {
                    where: {
                        participant: {
                            userId: request.user.sub,
                            poolId: id
                        }
                    }
                }
            }
        });
        return {
            games: games.map(game => {
                return {
                    ...game,
                    guess: game.guesses.length > 0 ? game.guesses[0] : null,
                    guesses: undefined
                };
            })
        };
    });
    fastify.patch('/games/:id/result', {
    // onRequest: [authenticate]
    }, async (request, reply) => {
        const gameResultBody = zod_1.z.object({
            firstTeamResult: zod_1.z.number(),
            secondTeamResult: zod_1.z.number(),
        });
        const gameResultParams = zod_1.z.object({
            id: zod_1.z.string(),
        });
        const { firstTeamResult, secondTeamResult } = gameResultBody.parse(request.body);
        const { id } = gameResultParams.parse(request.params);
        const game = await prisma_1.prisma.game.findUnique({
            where: {
                id
            }
        });
        if (!game) {
            return reply.status(400).send({
                message: "Jogo não existe"
            });
        }
        if (game.date > new Date()) {
            return reply.status(400).send({
                message: "Você não pode enviar o resultado antes do jogo terminar"
            });
        }
        await prisma_1.prisma.game.update({
            where: {
                id
            },
            data: {
                firstTeamResult,
                secondTeamResult
            }
        });
        const guesses = await prisma_1.prisma.guess.findMany({
            where: {
                gameId: id,
            },
            include: {
                participant: {
                    select: {
                        poolId: true
                    }
                }
            }
        });
        const firstTeamWin = firstTeamResult > secondTeamResult;
        const secondTeamWin = firstTeamResult < secondTeamResult;
        const draw = firstTeamResult === secondTeamResult;
        for (let guess of guesses) {
            let score = 0;
            if (guess.firstTeamPoints === firstTeamResult && guess.secondTeamPoints === secondTeamResult) {
                score += 10;
            }
            if (firstTeamWin && guess.firstTeamPoints > guess.secondTeamPoints) {
                score += 5;
            }
            if (secondTeamWin && guess.secondTeamPoints > guess.firstTeamPoints) {
                score += 5;
            }
            if (draw && guess.firstTeamPoints === guess.secondTeamPoints) {
                score += 3;
            }
            await prisma_1.prisma.score.create({
                data: {
                    points: score,
                    poolId: guess.participant.poolId,
                    gameId: game.id,
                    participantId: guess.participantId
                }
            });
        }
        return reply.status(204).send();
    });
}
exports.gameRoutes = gameRoutes;
