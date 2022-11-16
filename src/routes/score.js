"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreRoutes = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const authenticate_1 = require("../plugins/authenticate");
async function scoreRoutes(fastify) {
    fastify.get('/pools/:id/ranking', {
        onRequest: [authenticate_1.authenticate]
    }, async (request) => {
        const poolRankingParams = zod_1.z.object({
            id: zod_1.z.string(),
        });
        const { id } = poolRankingParams.parse(request.params);
        const ranking = await prisma_1.prisma.score.groupBy({
            by: ['participantId'],
            where: {
                poolId: id
            },
            _sum: {
                points: true,
            },
            orderBy: {
                _sum: {
                    points: 'desc'
                }
            },
        });
        let newObj = [];
        const participantIds = ranking.map((rank) => rank.participantId);
        const participantDatas = await prisma_1.prisma.participant.findMany({
            where: {
                id: {
                    in: participantIds,
                }
            },
            include: {
                user: {
                    select: {
                        nome: true,
                        avatarUrl: true
                    }
                }
            }
        });
        for (let rank of ranking) {
            const actualUser = participantDatas.find((participant) => participant.id === rank.participantId);
            const obj = {
                participantId: rank.participantId,
                points: rank._sum.points,
                name: actualUser?.user.nome,
                avatarUrl: actualUser?.user.avatarUrl
            };
            newObj.push(obj);
        }
        return { ranking: newObj };
    });
}
exports.scoreRoutes = scoreRoutes;
