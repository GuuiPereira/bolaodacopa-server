"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guessRoutes = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const authenticate_1 = require("../plugins/authenticate");
async function guessRoutes(fastify) {
    fastify.get('/guesses/count', async () => {
        const count = await prisma_1.prisma.guess.count();
        return { count };
    });
    fastify.post('/pools/:poolId/games/:gameId/guesses', {
        onRequest: [authenticate_1.authenticate]
    }, async (request, reply) => {
        const createGuessParams = zod_1.z.object({
            poolId: zod_1.z.string(),
            gameId: zod_1.z.string(),
        });
        const createGuessBody = zod_1.z.object({
            firstTeamPoints: zod_1.z.number(),
            secondTeamPoints: zod_1.z.number(),
        });
        const { poolId, gameId } = createGuessParams.parse(request.params);
        const { firstTeamPoints, secondTeamPoints } = createGuessBody.parse(request.body);
        const participant = await prisma_1.prisma.participant.findUnique({
            where: {
                userId_poolId: {
                    poolId,
                    userId: request.user.sub
                }
            }
        });
        if (!participant) {
            return reply.status(400).send({
                message: "Você não está participando desse bolão"
            });
        }
        const guess = await prisma_1.prisma.guess.findUnique({
            where: {
                participantId_gameId: {
                    participantId: participant.id,
                    gameId
                }
            }
        });
        if (guess) {
            return reply.status(400).send({
                message: "Você já enviou um palpite para esse jogo neste bolão"
            });
        }
        const game = await prisma_1.prisma.game.findUnique({
            where: {
                id: gameId
            }
        });
        if (!game) {
            return reply.status(400).send({
                message: "Jogo não existe"
            });
        }
        if (game.date < new Date()) {
            return reply.status(400).send({
                message: "Você não pode enviar palpites após o jogo"
            });
        }
        await prisma_1.prisma.guess.create({
            data: {
                gameId,
                participantId: participant.id,
                firstTeamPoints,
                secondTeamPoints
            }
        });
        return reply.status(201).send();
    });
}
exports.guessRoutes = guessRoutes;
