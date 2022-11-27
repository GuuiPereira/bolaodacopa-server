"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameRoutes = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const authenticate_1 = require("../plugins/authenticate");
async function gameRoutes(fastify) {
    fastify.get('/pools/:id/games', {
        onRequest: [authenticate_1.authenticate]
    }, async (request, reply) => {
        const gamePoolBody = zod_1.z.object({
            id: zod_1.z.string(),
        });
        const { id } = gamePoolBody.parse(request.params);
        const pool = await prisma_1.prisma.pool.findUnique({
            where: {
                id
            }
        });
        if (!pool) {
            return reply.status(400).send({
                message: "Bolão não encontrado"
            });
        }
        const games = await prisma_1.prisma.game.findMany({
            orderBy: {
                date: 'desc',
            },
            where: {
                date: {
                    gte: pool.createdAt
                },
            },
            include: {
                guesses: {
                    where: {
                        participant: {
                            userId: request.user.sub,
                            poolId: id,
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
        const weight = game?.weight || 1;
        const firstTeamWin = firstTeamResult > secondTeamResult;
        const secondTeamWin = firstTeamResult < secondTeamResult;
        const draw = firstTeamResult === secondTeamResult;
        for (let guess of guesses) {
            let score = 0;
            if (guess.firstTeamPoints === firstTeamResult && guess.secondTeamPoints === secondTeamResult) {
                score += (10 * weight);
            }
            if (firstTeamWin && guess.firstTeamPoints > guess.secondTeamPoints) {
                score += (5 * weight);
            }
            if (secondTeamWin && guess.secondTeamPoints > guess.firstTeamPoints) {
                score += (5 * weight);
            }
            if (draw && guess.firstTeamPoints === guess.secondTeamPoints) {
                score += (5 * weight);
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
    fastify.post('/pools/gamesbyparticipant', {
        onRequest: [authenticate_1.authenticate]
    }, async (request) => {
        const gamePoolBody = zod_1.z.object({
            participantId: zod_1.z.string(),
        });
        const { participantId } = gamePoolBody.parse(request.body);
        const guesses = await prisma_1.prisma.participant.findUnique({
            where: {
                id: participantId,
            },
            include: {
                guesses: {
                    select: {
                        gameId: true,
                        firstTeamPoints: true,
                        secondTeamPoints: true,
                        game: {
                            select: {
                                firstTeamCountryCode: true,
                                secondTeamCountryCode: true,
                                score: {
                                    where: {
                                        participantId
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        return {
            guesses
        };
    });
}
exports.gameRoutes = gameRoutes;
